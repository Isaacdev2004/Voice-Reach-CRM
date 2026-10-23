-- Review and apply in staging first. No production execution is authorized.
begin;
alter table public.contact_notes add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.contact_notes add column if not exists revision integer not null default 1;
alter table public.contact_notes add column if not exists client_key uuid not null default gen_random_uuid();
create unique index if not exists contact_notes_owner_client_key on public.contact_notes(owner_id,client_key);
create table if not exists public.note_versions (
 id uuid primary key default gen_random_uuid(), owner_id text not null,
 note_id uuid not null references public.contact_notes(id) on delete cascade,
 revision integer not null, title text not null, body text not null, kind text not null,
 metadata jsonb not null, created_at timestamptz not null default now(), unique(note_id,revision)
);
alter table public.note_versions enable row level security;
revoke all on public.note_versions from anon,authenticated;
grant all on public.note_versions to service_role;
-- Replace legacy permissive server-only policy; application auth and ownership checks remain mandatory.
drop policy if exists "server owned contact_notes" on public.contact_notes;
revoke all on public.contact_notes from anon,authenticated;
grant all on public.contact_notes to service_role;
create or replace function public.notes_version_before_update() returns trigger language plpgsql set search_path=public as $$
begin
 insert into public.note_versions(owner_id,note_id,revision,title,body,kind,metadata)
 values(old.owner_id,old.id,old.revision,old.title,old.body,old.kind,old.metadata) on conflict(note_id,revision) do nothing;
 new.revision:=old.revision+1; new.updated_at:=clock_timestamp(); return new;
end $$;
drop trigger if exists notes_version_update on public.contact_notes;
create trigger notes_version_update before update on public.contact_notes for each row execute function public.notes_version_before_update();
create or replace function public.save_notes_workspace(p_owner text,p_id uuid,p_client_key uuid,p_expected integer,p_title text,p_body text,p_kind text,p_metadata jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare n public.contact_notes; link text;
begin
 -- Lock parent contacts against concurrent deletion and verify every association in this transaction.
 for link in select distinct jsonb_array_elements_text(coalesce(p_metadata->'contactIds','[]')||coalesce(p_metadata->'propertyContactIds','[]')) loop
  perform 1 from public.contacts where id=link::uuid and owner_id=p_owner for key share;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;
  if coalesce(p_metadata->'propertyContactIds','[]') ? link then
   perform 1 from public.contacts where id=link::uuid and owner_id=p_owner and nullif(trim(property_address),'') is not null;
   if not found then raise exception 'NOTE_NOT_FOUND'; end if;
  end if;
 end loop;
 if p_id is null then
  insert into public.contact_notes(owner_id,client_key,title,body,kind,contact_id,metadata)
  values(p_owner,p_client_key,p_title,p_body,p_kind,(p_metadata->'contactIds'->>0)::uuid,p_metadata)
  on conflict(owner_id,client_key) do nothing returning * into n;
  if n.id is not null then return to_jsonb(n); end if;
  select * into n from public.contact_notes where owner_id=p_owner and client_key=p_client_key for update;
  -- A retried creation must never overwrite a newer note.
  if n.title=p_title and n.body=p_body and n.metadata=p_metadata and n.kind=p_kind then return to_jsonb(n); end if;
  raise exception 'NOTE_CONFLICT';
 end if;
 select * into n from public.contact_notes where id=p_id and owner_id=p_owner for update;
 if not found then raise exception 'NOTE_NOT_FOUND'; end if;
 if n.revision<>p_expected then
  if n.title=p_title and n.body=p_body and n.metadata=p_metadata and n.kind=p_kind then return to_jsonb(n); end if;
  raise exception 'NOTE_CONFLICT';
 end if;
 update public.contact_notes set title=p_title,body=p_body,kind=p_kind,metadata=p_metadata,
 contact_id=(p_metadata->'contactIds'->>0)::uuid where id=n.id and owner_id=p_owner returning * into n;
 return to_jsonb(n);
end $$;
revoke all on function public.save_notes_workspace(text,uuid,uuid,integer,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_notes_workspace(text,uuid,uuid,integer,text,text,text,jsonb) to service_role;
alter table public.contact_tasks add column if not exists source_note_id uuid references public.contact_notes(id) on delete set null;
alter table public.contact_tasks add column if not exists note_action_key uuid;
alter table public.contact_tasks add column if not exists priority text;
alter table public.contact_tasks add column if not exists property_contact_id uuid references public.contacts(id) on delete set null;
create unique index if not exists note_task_action_key on public.contact_tasks(owner_id,source_note_id,note_action_key) where source_note_id is not null;
create or replace function public.create_note_task(p_owner text,p_note uuid,p_action uuid,p_contact uuid,p_property uuid,p_title text,p_description text,p_due timestamptz,p_priority text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare t public.contact_tasks;
begin
 perform 1 from public.contact_notes where id=p_note and owner_id=p_owner for key share;
 if not found then raise exception 'NOTE_NOT_FOUND'; end if;
 perform 1 from public.contacts where id=p_contact and owner_id=p_owner for key share;
 if not found then raise exception 'NOTE_NOT_FOUND'; end if;
 if p_property is not null then
  perform 1 from public.contacts where id=p_property and owner_id=p_owner and nullif(trim(property_address),'') is not null for key share;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;
 end if;
 insert into public.contact_tasks(owner_id,contact_id,source_note_id,note_action_key,property_contact_id,title,notes,due_at,reminder_at,priority,recurrence)
 values(p_owner,p_contact,p_note,p_action,p_property,p_title,p_description,p_due,p_due,p_priority,'none')
 on conflict(owner_id,source_note_id,note_action_key) where source_note_id is not null do nothing returning * into t;
 if t.id is null then select * into t from public.contact_tasks where owner_id=p_owner and source_note_id=p_note and note_action_key=p_action; end if;
 return to_jsonb(t);
end $$;
revoke all on function public.create_note_task(text,uuid,uuid,uuid,uuid,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.create_note_task(text,uuid,uuid,uuid,uuid,text,text,timestamptz,text) to service_role;
commit;
