-- Review/apply to isolated staging before production approval. No live execution is authorized.
begin;
alter table public.contact_tasks add column if not exists workspace jsonb not null default '{}'::jsonb;
alter table public.contact_tasks add column if not exists priority text;
alter table public.contact_tasks add column if not exists property_contact_id uuid references public.contacts(id) on delete set null;
alter table public.contact_tasks add column if not exists source_note_id uuid references public.contact_notes(id) on delete set null;
alter table public.contact_tasks add column if not exists recurrence text default 'none';
create unique index if not exists tasks_occurrence_key on public.contact_tasks(owner_id,(workspace->>'operationKey')) where workspace ? 'operationKey';
create table public.task_transactions(id uuid primary key,owner_id text not null,contact_id uuid not null references public.contacts(id) on delete cascade,assignment_key text not null,payload jsonb not null,updated_at timestamptz not null default now(),created_at timestamptz not null default now(),unique(owner_id,assignment_key));
create index task_transactions_owner on public.task_transactions(owner_id,created_at);
alter table public.task_transactions enable row level security;
revoke all on public.task_transactions from public,anon,authenticated;
grant all on public.task_transactions to service_role;
alter table public.contact_tasks enable row level security;
drop policy if exists "server owned contact_tasks" on public.contact_tasks;
revoke all on public.contact_tasks from public,anon,authenticated;
grant all on public.contact_tasks to service_role;
create function public.guard_task_workspace() returns trigger language plpgsql security invoker set search_path=public as $$
declare dependency text; property_id text; transaction_id text;has_cycle boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id,25));
 if tg_op='UPDATE' and (new.workspace->>'transactionId') is distinct from (old.workspace->>'transactionId') then raise exception 'TASK_CONFLICT';end if;
 if tg_op='UPDATE' and new.owner_id<>old.owner_id then raise exception 'TASK_NOT_FOUND';end if;
 perform 1 from public.contacts where owner_id=new.owner_id and id=new.contact_id for key share;
 if not found then raise exception 'TASK_NOT_FOUND';end if;
 property_id:=coalesce(new.workspace->>'propertyContactId',new.property_contact_id::text);
 if property_id is not null and property_id<>'' then
  perform 1 from public.contacts where owner_id=new.owner_id and id=property_id::uuid and nullif(trim(property_address),'') is not null for key share;
  if not found then raise exception 'TASK_NOT_FOUND';end if;
 end if;
 if new.source_note_id is not null then perform 1 from public.contact_notes where owner_id=new.owner_id and id=new.source_note_id for key share;if not found then raise exception 'TASK_NOT_FOUND';end if;end if;
 transaction_id:=new.workspace->>'transactionId';
 if transaction_id is not null and transaction_id<>'' then perform 1 from public.task_transactions where owner_id=new.owner_id and id=transaction_id::uuid for key share;if not found then raise exception 'TASK_NOT_FOUND';end if;end if;
 for dependency in select jsonb_array_elements_text(coalesce(new.workspace->'dependencies','[]')) loop
  if dependency=new.id::text then raise exception 'TASK_CYCLE';end if;
  perform 1 from public.contact_tasks where owner_id=new.owner_id and id=dependency::uuid for share;
  if not found then raise exception 'TASK_NOT_FOUND';end if;
  if new.completed and not exists(select 1 from public.contact_tasks where owner_id=new.owner_id and id=dependency::uuid and completed) then raise exception 'TASK_BLOCKED';end if;
 end loop;
 with recursive walk(id) as (
  select d::uuid from jsonb_array_elements_text(coalesce(new.workspace->'dependencies','[]')) d
  union
  select d::uuid from walk w join public.contact_tasks t on t.id=w.id and t.owner_id=new.owner_id cross join lateral jsonb_array_elements_text(coalesce(t.workspace->'dependencies','[]')) d
 ) select exists(select 1 from walk where id=new.id) into has_cycle;
 if has_cycle then raise exception 'TASK_CYCLE';end if;
 if tg_op='UPDATE' and old.completed and not new.completed and exists(select 1 from public.contact_tasks t where t.owner_id=new.owner_id and t.completed and t.workspace->'dependencies' ? new.id::text) then raise exception 'TASK_BLOCKED';end if;
 if tg_op='UPDATE' then
  if new.completed and not old.completed then new.completed_at:=clock_timestamp();
  elsif new.completed and old.completed then new.completed_at:=old.completed_at;
  elsif not new.completed then new.completed_at:=null;end if;
 else if new.completed and new.completed_at is null then new.completed_at:=clock_timestamp();end if;
 end if;
 if new.completed then new.reminder_at:=null;end if;
 new.updated_at:=clock_timestamp();return new;
end $$;
create trigger guard_task_workspace before insert or update on public.contact_tasks for each row execute function public.guard_task_workspace();
create function public.next_task_occurrence() returns trigger language plpgsql security invoker set search_path=public as $$
declare next_due timestamptz;zone text;step interval;op_key text;m jsonb;month_count integer:=1;
begin
 if old.completed or not new.completed or new.recurrence not in ('daily','weekly','monthly') or new.due_at is null or new.workspace->>'transactionId' is not null then return new;end if;
 zone:=coalesce(new.workspace->>'timezone','America/New_York');
 step:=case new.recurrence when 'daily' then interval '1 day' when 'weekly' then interval '7 days' else interval '1 month' end;
 next_due:=((new.due_at at time zone zone)+step) at time zone zone;
 if new.recurrence='monthly' then
  while extract(day from next_due at time zone zone)<>extract(day from new.due_at at time zone zone) loop
   month_count:=month_count+1;next_due:=((new.due_at at time zone zone)+make_interval(months=>month_count)) at time zone zone;
  end loop;
 end if;
 op_key:='recurrence:'||new.id::text;
 m:=new.workspace||jsonb_build_object('status','todo','operationKey',op_key,'recurrenceParentId',new.id);
 insert into public.contact_tasks(owner_id,contact_id,title,due_at,reminder_at,completed,notes,recurrence,priority,source_note_id,workspace)
 values(new.owner_id,new.contact_id,new.title,next_due,case when old.reminder_at is null then null else next_due-(old.due_at-old.reminder_at) end,false,new.notes,new.recurrence,new.priority,new.source_note_id,m)
 on conflict do nothing;
 return new;
end $$;
create trigger next_task_occurrence after update of completed on public.contact_tasks for each row execute function public.next_task_occurrence();
create function public.assign_task_checklist(p_owner text,p_id uuid,p_contact uuid,p_key text,p_payload jsonb,p_tasks jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare r public.task_transactions; t jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner,25));
 perform 1 from public.contacts where owner_id=p_owner and id=p_contact for key share;if not found then raise exception 'TASK_NOT_FOUND';end if;
 select * into r from public.task_transactions where owner_id=p_owner and assignment_key=p_key;
 if found then return to_jsonb(r);end if;
 insert into public.task_transactions(id,owner_id,contact_id,assignment_key,payload) values(p_id,p_owner,p_contact,p_key,p_payload) returning * into r;
 for t in select * from jsonb_array_elements(p_tasks) loop
  insert into public.contact_tasks(id,owner_id,contact_id,title,notes,due_at,reminder_at,priority,workspace)
  values((t->>'id')::uuid,p_owner,p_contact,t->>'title',t->>'notes',(t->>'dueAt')::timestamptz,(t->>'dueAt')::timestamptz,t->>'priority',t->'workspace');
 end loop;
 insert into public.audit_logs(owner_id,action,entity_type,entity_id,metadata) values(p_owner,'TASK_CHECKLIST_ASSIGNED','contact',p_contact,jsonb_build_object('transactionId',p_id,'title',p_payload->>'name'));
 return to_jsonb(r);
end $$;
revoke all on function public.guard_task_workspace(),public.next_task_occurrence(),public.assign_task_checklist(text,uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.guard_task_workspace(),public.next_task_occurrence(),public.assign_task_checklist(text,uuid,uuid,text,jsonb,jsonb) to service_role;
create function public.create_reviewed_tasks(p_owner text,p_batch uuid,p_tasks jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare t jsonb;ids jsonb;old_fingerprint text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner,25));
 select metadata->'taskIds',metadata->>'fingerprint' into ids,old_fingerprint from public.audit_logs where owner_id=p_owner and action='TASK_PROPOSALS_APPROVED' and entity_id=p_batch limit 1;
 if found then if old_fingerprint<>md5(p_tasks::text) then raise exception 'TASK_CONFLICT';end if;return ids;end if;
 ids:='[]'::jsonb;
 for t in select * from jsonb_array_elements(p_tasks) loop
  insert into public.contact_tasks(id,owner_id,contact_id,title,notes,due_at,priority,source_note_id,workspace)
  values((t->>'id')::uuid,p_owner,(t->>'contactId')::uuid,t->>'title',t->>'notes',(t->>'dueAt')::timestamptz,nullif(t->>'priority','unspecified'),(t->>'sourceNoteId')::uuid,t->'workspace');
  ids:=ids||jsonb_build_array(t->>'id');
  insert into public.audit_logs(owner_id,action,entity_type,entity_id,metadata) values(p_owner,'CONTACT_TASK_CREATED','contact_task',(t->>'id')::uuid,jsonb_build_object('contactId',t->>'contactId','title',t->>'title'));
 end loop;
 insert into public.audit_logs(owner_id,action,entity_type,entity_id,metadata) values(p_owner,'TASK_PROPOSALS_APPROVED','task_proposals',p_batch,jsonb_build_object('taskIds',ids,'fingerprint',md5(p_tasks::text)));
 return ids;
end $$;
revoke all on function public.create_reviewed_tasks(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_reviewed_tasks(text,uuid,jsonb) to service_role;
commit;
