-- Concierge is disabled by default. Apply only to isolated staging until approved.
begin;
create table public.concierge_cases (
 owner_id text primary key check(length(owner_id)>0), version integer not null default 0 check(version>=0),
 discovery jsonb not null default '{}', milestones jsonb not null default '{}',
 stage text not null default 'discovery' check(stage in ('discovery','migration','campaigns','review','training','ready','needs_attention')),
 assignee_id text, next_followup date, internal_note text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.concierge_events (
 id uuid primary key, owner_id text not null references public.concierge_cases(owner_id),
 actor_id text not null, action text not null, request_hash text not null,
 created_at timestamptz not null default now()
);
create index concierge_events_owner on public.concierge_events(owner_id,created_at desc);
create index concierge_cases_assignee on public.concierge_cases(assignee_id,updated_at);
create table public.concierge_imports (
 id uuid primary key, owner_id text not null references public.concierge_cases(owner_id),
 fingerprint text not null, rows jsonb not null, row_errors jsonb not null default '[]',
 state text not null default 'preview' check(state in ('preview','completed','cancelled','expired')),
 result jsonb, created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours',
 unique(owner_id,fingerprint)
);
alter table public.concierge_cases enable row level security;
alter table public.concierge_events enable row level security;
alter table public.concierge_imports enable row level security;
revoke all on public.concierge_cases,public.concierge_events,public.concierge_imports from public,anon,authenticated;
grant select,insert,update on public.concierge_cases,public.concierge_imports to service_role;
grant select,insert on public.concierge_events to service_role;

create function public.mutate_concierge_case(p_owner text,p_actor text,p_request uuid,p_version integer,p_patch jsonb,p_action text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare r public.concierge_cases; e public.concierge_events; h text;
begin
 if p_owner is null or btrim(p_owner)='' or p_actor is null or btrim(p_actor)='' then raise exception 'INVALID_OWNER'; end if;
 if p_patch - array['discovery','milestones','stage','assignee_id','next_followup','internal_note'] <> '{}'::jsonb then raise exception 'INVALID_PATCH'; end if;
 perform pg_advisory_xact_lock(hashtextextended('concierge:'||p_owner,0));
 h:=md5(jsonb_build_object('patch',p_patch,'action',p_action,'version',p_version)::text);
 select * into e from concierge_events where id=p_request;
 if found then
  if e.owner_id<>p_owner or e.actor_id<>p_actor or e.request_hash<>h then raise exception 'REPLAY_CONFLICT'; end if;
  select * into r from concierge_cases where owner_id=p_owner; return to_jsonb(r);
 end if;
 insert into concierge_cases(owner_id) values(p_owner) on conflict do nothing;
 select * into r from concierge_cases where owner_id=p_owner for update;
 if r.version<>p_version then raise exception 'STALE_VERSION'; end if;
 update concierge_cases set
 discovery=coalesce(p_patch->'discovery',discovery), milestones=milestones||coalesce(p_patch->'milestones','{}'),
 stage=coalesce(p_patch->>'stage',stage),
 assignee_id=case when p_patch?'assignee_id' then p_patch->>'assignee_id' else assignee_id end,
 next_followup=case when p_patch?'next_followup' then (p_patch->>'next_followup')::date else next_followup end,
 internal_note=coalesce(p_patch->>'internal_note',internal_note), version=version+1,updated_at=clock_timestamp()
 where owner_id=p_owner returning * into r;
 insert into concierge_events(id,owner_id,actor_id,action,request_hash) values(p_request,p_owner,p_actor,p_action,h);
 return to_jsonb(r);
end $$;

create function public.execute_concierge_import(p_owner text,p_import uuid,p_limit integer) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare j public.concierge_imports; item jsonb; cid uuid; added integer:=0; skipped integer:=0; used integer; v_result jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('concierge:'||p_owner,0));
 select * into j from concierge_imports where owner_id=p_owner and id=p_import for update;
 if not found then raise exception 'IMPORT_NOT_FOUND'; end if;
 if j.state='completed' then return j.result; end if;
 if j.state<>'preview' or j.expires_at<=now() then raise exception 'IMPORT_EXPIRED_OR_CANCELLED'; end if;
 if jsonb_array_length(j.rows)>500 then raise exception 'IMPORT_TOO_LARGE'; end if;
 select count(*) into used from contacts where owner_id=p_owner;
 for item in select value from jsonb_array_elements(j.rows) loop
  if exists(select 1 from contacts where owner_id=p_owner and
    (regexp_replace(phone,'[^0-9]','','g')=regexp_replace(item->>'phone','[^0-9]','','g') or
     (nullif(item->>'email','') is not null and lower(email)=lower(item->>'email')))) then skipped:=skipped+1;continue;end if;
  if p_limit is not null and used+added>=p_limit then raise exception 'CONTACT_PLAN_LIMIT'; end if;
  cid:=gen_random_uuid();
  insert into contacts(id,owner_id,first_name,last_name,phone,email,type,source,notes,dnc)
  values(cid,p_owner,item->>'firstName',nullif(item->>'lastName',''),item->>'phone',nullif(item->>'email',''),coalesce(nullif(item->>'type',''),'Imported Contact'),coalesce(nullif(item->>'source',''),'Concierge CSV import'),nullif(item->>'notes',''),true);
  insert into consent_records(owner_id,contact_id,status,source,notes)
  values(p_owner,cid,'Unknown','Concierge CSV import','Imported record is not marketing consent. Review evidence before changing communication permissions.');
  added:=added+1;
 end loop;
 v_result:=jsonb_build_object('imported',added,'duplicatesSkipped',skipped,'invalidRows',jsonb_array_length(j.row_errors),'consent','Unknown','sendingSuppressed',true);
 update concierge_imports set state='completed',result=v_result,rows='[]' where id=j.id and owner_id=p_owner;
 insert into concierge_events(id,owner_id,actor_id,action,request_hash) values(gen_random_uuid(),p_owner,p_owner,'IMPORT_COMPLETED',j.fingerprint);
 update concierge_cases set version=version+1,updated_at=clock_timestamp() where owner_id=p_owner;
 return v_result;
end $$;
revoke all on function public.mutate_concierge_case(text,text,uuid,integer,jsonb,text),public.execute_concierge_import(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.mutate_concierge_case(text,text,uuid,integer,jsonb,text),public.execute_concierge_import(text,uuid,integer) to service_role;
commit;
