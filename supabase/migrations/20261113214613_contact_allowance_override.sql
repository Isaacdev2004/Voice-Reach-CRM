-- Additive only. No account is granted an override by this migration.
begin;
create table public.contact_allowance_overrides (
 owner_id text primary key, contacts_limit integer not null check(contacts_limit between 1 and 1000000),
 enabled boolean not null default false, workspace_reference text not null check(length(workspace_reference)>0),
 clerk_environment text not null check(clerk_environment in ('live','test')), identity_verified_at timestamptz not null,
 approved_by text not null check(length(approved_by)>0), reason text not null check(length(reason)>0),
 revision bigint not null default 1, enforcement_version bigint not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.contact_allowance_overrides enable row level security;
revoke all on public.contact_allowance_overrides from public,anon,authenticated;
grant select,insert,update on public.contact_allowance_overrides to service_role;
create table public.contact_allowance_audit (
 id bigint generated always as identity primary key, owner_id text not null,
 previous_configuration jsonb, configuration jsonb not null, recorded_at timestamptz not null default now()
);
alter table public.contact_allowance_audit enable row level security;
revoke all on public.contact_allowance_audit from public,anon,authenticated;
grant select,insert on public.contact_allowance_audit to service_role;
grant usage,select on sequence public.contact_allowance_audit_id_seq to service_role;
create function public.audit_contact_allowance() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then
  insert into public.contact_allowance_audit(owner_id,configuration) values(new.owner_id,to_jsonb(new)-'enforcement_version');
 elsif (to_jsonb(new)-'enforcement_version') is distinct from (to_jsonb(old)-'enforcement_version') then
  insert into public.contact_allowance_audit(owner_id,previous_configuration,configuration) values(new.owner_id,to_jsonb(old)-'enforcement_version',to_jsonb(new)-'enforcement_version');
 end if;
 return new;
end $$;
create trigger contact_allowance_config_audit after insert or update on public.contact_allowance_overrides for each row execute function public.audit_contact_allowance();
create function public.set_contact_allowance_override(p_owner text,p_limit integer,p_enabled boolean,p_workspace text,p_clerk_environment text,p_verified_at timestamptz,p_approved_by text,p_reason text,p_expected_revision bigint default null)
returns bigint language plpgsql security invoker set search_path=public,pg_temp as $$
declare next_revision bigint;
begin
 if p_verified_at > now() or p_verified_at is null then raise exception 'Verified identity evidence required';end if;
 if p_expected_revision is null then
  insert into public.contact_allowance_overrides(owner_id,contacts_limit,enabled,workspace_reference,clerk_environment,identity_verified_at,approved_by,reason)
  values(p_owner,p_limit,p_enabled,p_workspace,p_clerk_environment,p_verified_at,p_approved_by,p_reason) returning revision into next_revision;
 else
  update public.contact_allowance_overrides set contacts_limit=p_limit,enabled=p_enabled,workspace_reference=p_workspace,clerk_environment=p_clerk_environment,identity_verified_at=p_verified_at,approved_by=p_approved_by,reason=p_reason,revision=revision+1,updated_at=now()
  where owner_id=p_owner and revision=p_expected_revision returning revision into next_revision;
  if not found then raise exception 'Allowance configuration changed; review before retrying';end if;
 end if;
 return next_revision;
end $$;
create function public.enforce_contact_allowance() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare maximum integer; used bigint;
begin
 if tg_op='UPDATE' and new.owner_id is not distinct from old.owner_id then return new;end if;
 -- Updating this owner-only row serializes writers, and produces serialization failure
 -- instead of stale reads under REPEATABLE READ. No materialized contact count is used.
 update public.contact_allowance_overrides set enforcement_version=enforcement_version+1 where owner_id=new.owner_id and enabled returning contacts_limit into maximum;
 if not found then return new;end if;
 select count(*) into used from public.contacts where owner_id=new.owner_id;
 if used>=maximum then raise exception using errcode='P0001',message='contact_allowance_exceeded',detail=format('Maximum %s contacts; current count %s. No contact was added.',maximum,used);end if;
 return new;
end $$;
create trigger enforce_workspace_contact_allowance before insert or update of owner_id on public.contacts for each row execute function public.enforce_contact_allowance();
-- Exact identity idempotency for CSV imports, not a global unique-phone constraint.
create function public.contact_import_identity(p_first text,p_last text,p_email text,p_phone text) returns text language sql immutable security invoker set search_path=pg_catalog as $$
 select md5(lower(btrim(coalesce(p_first,'')))||chr(31)||lower(btrim(coalesce(p_last,'')))||chr(31)||lower(btrim(coalesce(p_email,'')))||chr(31)||case when length(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'))=10 then '1'||regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') else regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') end);
$$;
create index contacts_owner_import_identity on public.contacts(owner_id,public.contact_import_identity(first_name,last_name,email,phone));
create table public.contact_import_receipts (
 owner_id text not null, identity_key text not null, contact_id uuid references public.contacts(id) on delete set null,
 recorded_at timestamptz not null default now(),primary key(owner_id,identity_key)
);
alter table public.contact_import_receipts enable row level security;
revoke all on public.contact_import_receipts from public,anon,authenticated;
grant select,insert,update on public.contact_import_receipts to service_role;
create function public.import_contact_batch(p_owner text,p_rows jsonb,p_base_limit integer)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare r jsonb; key text; existing uuid; inserted public.contacts; results jsonb='[]'; effective integer; used bigint;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>100 then raise exception 'Import batch must contain at most 100 rows';end if;
 perform pg_advisory_xact_lock(hashtextextended('contacts-import:'||p_owner,0));
 select contacts_limit into effective from public.contact_allowance_overrides where owner_id=p_owner and enabled;
 if not found then effective=p_base_limit;end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  if length(btrim(coalesce(r->>'first_name','')))=0 or length(coalesce(r->>'phone',''))=0 then raise exception 'Invalid contact import row';end if;
  key=public.contact_import_identity(r->>'first_name',r->>'last_name',r->>'email',r->>'phone');
  -- A transaction lock keeps concurrently uploaded copies of the same rows idempotent.
  select id into existing from public.contacts where owner_id=p_owner and public.contact_import_identity(first_name,last_name,email,phone)=key order by id limit 1;
  if found then
   results=results||jsonb_build_array(jsonb_build_object('created',false,'duplicate',true,'row',r->'row'));
   continue;
  end if;
  select count(*) into used from public.contacts where owner_id=p_owner;
  if effective is not null and used>=effective then raise exception using errcode='P0001',message='contact_allowance_exceeded',detail='Import batch was not added because it exceeds the contact allowance.';end if;
  insert into public.contact_import_receipts(owner_id,identity_key) values(p_owner,key) on conflict(owner_id,identity_key) do update set contact_id=null;
  insert into public.contacts(owner_id,first_name,last_name,phone,email,type,category,source,dnc,notes)
  values(p_owner,btrim(r->>'first_name'),nullif(r->>'last_name',''),r->>'phone',nullif(r->>'email',''),coalesce(nullif(r->>'type',''),'Cold Lead'),nullif(r->>'category',''),r->>'source',coalesce((r->>'dnc')::boolean,false),r->>'notes') returning * into inserted;
  update public.contact_import_receipts set contact_id=inserted.id where owner_id=p_owner and identity_key=key;
  results=results||jsonb_build_array(jsonb_build_object('created',true,'contact',to_jsonb(inserted),'row',r->'row'));
 end loop;
 return results;
end $$;
revoke all on function public.audit_contact_allowance(),public.enforce_contact_allowance(),public.set_contact_allowance_override(text,integer,boolean,text,text,timestamptz,text,text,bigint),public.contact_import_identity(text,text,text,text),public.import_contact_batch(text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.audit_contact_allowance(),public.enforce_contact_allowance(),public.set_contact_allowance_override(text,integer,boolean,text,text,timestamptz,text,text,bigint),public.contact_import_identity(text,text,text,text),public.import_contact_batch(text,jsonb,integer) to service_role;
commit;
