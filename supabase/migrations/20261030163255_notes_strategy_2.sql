-- Requires 20261023030000_notes_workspace.sql. Additive schema; no CRM record deletion.
begin;
alter table public.contact_notes enable row level security;
alter table public.contact_tasks enable row level security;
revoke all on public.contact_notes,public.contact_tasks from anon,authenticated;
grant all on public.contact_notes,public.contact_tasks to service_role;
alter table public.contact_notes add column if not exists last_edited_by text;
alter table public.note_versions add column if not exists edited_by text;
alter table public.note_versions add column if not exists contact_id uuid;
create or replace function public.notes_tag_key(value text) returns text language sql immutable strict set search_path=public as $$
 select lower(regexp_replace(trim(normalize(value,NFKC)),'[[:space:]]+',' ','g'))
$$;
revoke all on function public.notes_tag_key(text) from public,anon,authenticated;
grant execute on function public.notes_tag_key(text) to service_role;
create table if not exists public.note_tags (
 id uuid primary key default gen_random_uuid(), owner_id text not null,
 name text not null check(length(name) between 1 and 40),
 tag_key text generated always as(public.notes_tag_key(name)) stored,
 created_at timestamptz not null default now(), unique(owner_id,tag_key)
);
alter table public.note_tags enable row level security;
revoke all on public.note_tags from anon,authenticated;
grant all on public.note_tags to service_role;
insert into public.note_tags(owner_id,name)
 select distinct on(n.owner_id,public.notes_tag_key(t.value)) n.owner_id,regexp_replace(trim(normalize(t.value,NFKC)),'[[:space:]]+',' ','g')
 from public.contact_notes n cross join lateral jsonb_array_elements_text(case when jsonb_typeof(n.metadata->'tags')='array' then n.metadata->'tags' else '[]'::jsonb end) t(value)
 where length(trim(t.value)) between 1 and 40
 order by n.owner_id,public.notes_tag_key(t.value),n.created_at
 on conflict(owner_id,tag_key) do nothing;
create or replace function public.notes_version_before_update() returns trigger language plpgsql set search_path=public as $$
begin
 if (old.title,old.body,old.kind,old.metadata,old.contact_id) is not distinct from (new.title,new.body,new.kind,new.metadata,new.contact_id) then
  new.revision:=old.revision; new.updated_at:=old.updated_at; new.last_edited_by:=old.last_edited_by; return new;
 end if;
 insert into public.note_versions(owner_id,note_id,revision,title,body,kind,metadata,contact_id,edited_by)
 values(old.owner_id,old.id,old.revision,old.title,old.body,old.kind,old.metadata,old.contact_id,old.last_edited_by) on conflict(note_id,revision) do nothing;
 new.revision:=old.revision+1; new.updated_at:=clock_timestamp(); return new;
end $$;
create or replace function public.save_notes_workspace(p_owner text,p_id uuid,p_client_key uuid,p_expected integer,p_title text,p_body text,p_kind text,p_metadata jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare n public.contact_notes; link text; tag text; canonical text; normalized_tags jsonb := '[]'::jsonb;
begin
 if nullif(trim(p_owner),'') is null then raise exception 'NOTE_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner || ':note-tags',0));
 if jsonb_typeof(p_metadata) <> 'object' then raise exception 'NOTE_INVALID'; end if;
 for tag in select value from jsonb_array_elements_text(coalesce(p_metadata->'tags','[]')) loop
  tag := regexp_replace(trim(normalize(tag,NFKC)), '[[:space:]]+', ' ', 'g');
  if length(tag)<1 or length(tag)>40 then raise exception 'NOTE_INVALID_TAG'; end if;
  insert into public.note_tags(owner_id,name) values(p_owner,tag) on conflict(owner_id,tag_key) do nothing;
  select name into canonical from public.note_tags where owner_id=p_owner and tag_key=public.notes_tag_key(tag) for key share;
  if not normalized_tags ? canonical then normalized_tags := normalized_tags || to_jsonb(canonical); end if;
 end loop;
 p_metadata := jsonb_set(p_metadata,'{tags}',normalized_tags);
 for link in select distinct jsonb_array_elements_text(coalesce(p_metadata->'campaignIds','[]')) loop
  perform 1 from public.campaigns where id=link::uuid and owner_id=p_owner for key share;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;
 end loop;
 for link in select distinct jsonb_array_elements_text(coalesce(p_metadata->'taskIds','[]')) loop
  perform 1 from public.contact_tasks where id=link::uuid and owner_id=p_owner for key share;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;
 end loop;
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
  insert into public.contact_notes(owner_id,client_key,title,body,kind,contact_id,metadata,last_edited_by)
  values(p_owner,p_client_key,p_title,p_body,p_kind,(p_metadata->'contactIds'->>0)::uuid,p_metadata,p_owner)
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
 if n.title=p_title and n.body=p_body and n.metadata=p_metadata and n.kind=p_kind then return to_jsonb(n); end if;
 update public.contact_notes set last_edited_by=p_owner,title=p_title,body=p_body,kind=p_kind,metadata=p_metadata,
 contact_id=(p_metadata->'contactIds'->>0)::uuid where id=n.id and owner_id=p_owner returning * into n;
 return to_jsonb(n);
end $$;

revoke all on function public.save_notes_workspace(text,uuid,uuid,integer,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_notes_workspace(text,uuid,uuid,integer,text,text,text,jsonb) to service_role;
create or replace function public.manage_note_tag(p_owner text,p_action text,p_id uuid,p_name text,p_expected text) returns jsonb language plpgsql security invoker set search_path=public as $$
declare t public.note_tags; label text; old_key text;
begin
 if nullif(trim(p_owner),'') is null or p_action not in ('create','rename','delete') then raise exception 'NOTE_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner || ':note-tags',0));
 label := regexp_replace(trim(normalize(coalesce(p_name,''),NFKC)), '[[:space:]]+', ' ', 'g');
 if p_action <> 'delete' and (length(label)<1 or length(label)>40) then raise exception 'NOTE_INVALID_TAG'; end if;
 if p_action='create' then
  insert into public.note_tags(owner_id,name) values(p_owner,label) on conflict(owner_id,tag_key) do nothing;
  select * into t from public.note_tags where owner_id=p_owner and tag_key=public.notes_tag_key(label);
  return to_jsonb(t);
 end if;
 select * into t from public.note_tags where id=p_id and owner_id=p_owner for update;
 if not found then raise exception 'NOTE_NOT_FOUND'; end if;
 if p_action='rename' and t.name=label then return to_jsonb(t); end if;
 if t.name is distinct from p_expected then raise exception 'NOTE_CONFLICT'; end if;
 old_key:=t.tag_key;
 if p_action='rename' then
  if exists(select 1 from public.note_tags where owner_id=p_owner and tag_key=public.notes_tag_key(label) and id<>p_id) then raise exception 'NOTE_TAG_EXISTS'; end if;
  update public.note_tags set name=label where id=p_id and owner_id=p_owner returning * into t;
 end if;
 update public.contact_notes n set last_edited_by=p_owner,metadata=jsonb_set(n.metadata,'{tags}',coalesce((
  select jsonb_agg(v order by ord) from (
   select case when public.notes_tag_key(value)=old_key then label else value end v,ordinality ord
   from jsonb_array_elements_text(coalesce(n.metadata->'tags','[]')) with ordinality
   where p_action<>'delete' or public.notes_tag_key(value)<>old_key
  ) tags), '[]'::jsonb))
 where n.owner_id=p_owner and exists(select 1 from jsonb_array_elements_text(coalesce(n.metadata->'tags','[]')) x(value) where public.notes_tag_key(x.value)=old_key);
 if p_action='delete' then delete from public.note_tags where id=p_id and owner_id=p_owner; return jsonb_build_object('deleted',true); end if;
 return to_jsonb(t);
end $$;
revoke all on function public.manage_note_tag(text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.manage_note_tag(text,text,uuid,text,text) to service_role;
create or replace function public.create_note_task_v2(p_owner text,p_note uuid,p_action uuid,p_contact uuid,p_property uuid,p_title text,p_description text,p_due timestamptz,p_priority text,p_completed boolean)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare t public.contact_tasks; result jsonb;
begin
 if p_priority not in ('low','normal','high') then raise exception 'NOTE_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner || ':note-task:' || p_note::text || ':' || p_action::text,0));
 perform 1 from public.contact_notes where owner_id=p_owner and id=p_note for key share;
 if not found then raise exception 'NOTE_NOT_FOUND'; end if;
 select * into t from public.contact_tasks where owner_id=p_owner and source_note_id=p_note and note_action_key=p_action;
 if found then
  if (t.contact_id,t.property_contact_id,t.title,t.notes,t.due_at,t.priority) is distinct from (p_contact,p_property,p_title,p_description,p_due,p_priority) then raise exception 'NOTE_TASK_CONFLICT'; end if;
  return to_jsonb(t);
 end if;
 result := public.create_note_task(p_owner,p_note,p_action,p_contact,p_property,p_title,p_description,p_due,p_priority);
 update public.contact_tasks set completed=p_completed,completed_at=case when p_completed then now() else null end where owner_id=p_owner and id=(result->>'id')::uuid returning * into t;
 return to_jsonb(t);
end $$;
revoke all on function public.create_note_task_v2(text,uuid,uuid,uuid,uuid,text,text,timestamptz,text,boolean) from public,anon,authenticated;
grant execute on function public.create_note_task_v2(text,uuid,uuid,uuid,uuid,text,text,timestamptz,text,boolean) to service_role;
commit;
