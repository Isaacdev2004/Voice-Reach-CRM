-- Review/apply to staging first. This file has not been executed against production.
begin;
create table public.financing_partners (
 id uuid primary key, owner_id text not null, kind text not null check(kind in ('lender','title')),
 preferred boolean not null default false, payload jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index financing_default_partner on public.financing_partners(owner_id,kind) where preferred;
create table public.financing_reports (
 id uuid primary key, owner_id text not null, contact_id uuid references public.contacts(id) on delete set null,
 payload jsonb not null, created_at timestamptz not null default now()
);
create index financing_reports_owner on public.financing_reports(owner_id,created_at desc);
alter table public.financing_partners enable row level security;
alter table public.financing_reports enable row level security;
revoke all on public.financing_partners,public.financing_reports from public,anon,authenticated;
grant all on public.financing_partners,public.financing_reports to service_role;
create function public.save_financing_partner(p_owner text,p_id uuid,p_payload jsonb,p_existing boolean) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare r public.financing_partners;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner,0));
 if p_existing then
  perform 1 from public.financing_partners where owner_id=p_owner and id=p_id for update;
  if not found then raise exception 'PARTNER_NOT_FOUND'; end if;
 elsif exists(select 1 from public.financing_partners where id=p_id) then raise exception 'PARTNER_NOT_FOUND'; end if;
 if (p_payload->>'preferred')::boolean then
  update public.financing_partners set preferred=false,updated_at=clock_timestamp() where owner_id=p_owner and kind=p_payload->>'kind';
 end if;
 insert into public.financing_partners(id,owner_id,kind,preferred,payload) values(p_id,p_owner,p_payload->>'kind',(p_payload->>'preferred')::boolean,p_payload-'id')
 on conflict(id) do update set kind=excluded.kind,preferred=excluded.preferred,payload=excluded.payload,updated_at=clock_timestamp()
 where financing_partners.owner_id=p_owner returning * into r;
 if r.id is null then raise exception 'PARTNER_NOT_FOUND'; end if;
 return to_jsonb(r);
end $$;
create function public.save_financing_report(p_owner text,p_id uuid,p_contact uuid,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare r public.financing_reports; link text; partner text;
begin
 for link in select distinct value from jsonb_array_elements_text(jsonb_build_array(p_payload->'context'->>'contactId',p_payload->'context'->>'propertyContactId')) where value is not null loop
  perform 1 from public.contacts where owner_id=p_owner and id=link::uuid for key share;
  if not found then raise exception 'CONTACT_NOT_FOUND'; end if;
 end loop;
 for partner in select distinct value from jsonb_array_elements_text(jsonb_build_array(p_payload->'context'->>'lenderId',p_payload->'context'->>'titleId')) where value is not null loop
  perform 1 from public.financing_partners where owner_id=p_owner and id=partner::uuid for share;
  if not found then raise exception 'PARTNER_NOT_FOUND'; end if;
 end loop;
 select * into r from public.financing_reports where id=p_id and owner_id=p_owner;
 if found then return to_jsonb(r); end if;
 insert into public.financing_reports(id,owner_id,contact_id,payload) values(p_id,p_owner,p_contact,p_payload) returning * into r;
 if p_contact is not null then
  insert into public.audit_logs(owner_id,action,entity_type,entity_id,metadata)
  values(p_owner,'FINANCING_REPORT_SAVED','contact',p_contact,jsonb_build_object('reportId',p_id,'title',p_payload->'result'->>'title','source','financing-studio'));
 end if;
 return to_jsonb(r);
end $$;
revoke all on function public.save_financing_partner(text,uuid,jsonb,boolean),public.save_financing_report(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_financing_partner(text,uuid,jsonb,boolean),public.save_financing_report(text,uuid,uuid,jsonb) to service_role;
commit;
