-- Additive, server-only ISV pilot schema. No provider resources or existing rows changed.
begin;
create table public.isv_sending_businesses (
 id uuid primary key default gen_random_uuid(), owner_id text not null,
 legal_name text not null check(length(legal_name) between 2 and 160), website text not null,
 responsible_party text not null check(responsible_party in ('agent','team','brokerage')),
 authorization_reference text, customer_profile_sid text, verified_at timestamptz,
 setup_version text, review_status text not null default 'incomplete' check(review_status in ('incomplete','submitted')),
 created_at timestamptz not null default now(), unique(owner_id,id), unique(owner_id)
);
create table public.isv_provider_credentials (
 owner_id text not null, account_sid text not null check(account_sid ~ '^AC[0-9a-fA-F]{32}$'),
 envelope jsonb not null check(envelope->>'version'='1' and envelope ?& array['keyId','iv','tag','ciphertext']),
 revision integer not null default 1, updated_at timestamptz not null default now(),
 primary key(owner_id,account_sid), unique(account_sid)
);
create table public.isv_sms_assignments (
 id uuid primary key default gen_random_uuid(), owner_id text not null, business_id uuid not null,
 account_sid text not null, brand_sid text, campaign_sid text, messaging_service_sid text, from_number text not null check(from_number ~ '^\+[1-9][0-9]{7,14}$'),
 phone_sid text, verification_source text not null default 'unverified' check(verification_source in ('unverified','twilio_api')),
 approved_purpose text not null, registration_status text not null default 'required' check(registration_status in ('required','incomplete','submitted','pending','approved','rejected','suspended')),
 number_associated boolean not null default false, verified_at timestamptz, provider_evidence_reference text,
 messaging_enabled boolean not null default false, active boolean not null default true,
 unique(owner_id,id), unique(account_sid,from_number),
 foreign key(owner_id,business_id) references public.isv_sending_businesses(owner_id,id),
 foreign key(owner_id,account_sid) references public.isv_provider_credentials(owner_id,account_sid),
 check(registration_status <> 'approved' or (verification_source='twilio_api' and verified_at is not null and provider_evidence_reference is not null and brand_sid is not null and campaign_sid is not null and messaging_service_sid is not null))
);
create unique index isv_active_number_unique on public.isv_sms_assignments(from_number) where active;
create unique index isv_one_active_sender on public.isv_sms_assignments(owner_id) where active;
create table public.isv_sms_consent (
 id uuid primary key default gen_random_uuid(), owner_id text not null, business_id uuid not null,
 contact_id uuid references public.contacts(id) on delete set null, campaign_sid text not null, phone text not null, purpose text not null,
 status text not null check(status in ('granted','revoked','unknown')), source text not null, disclosure_version text not null,
 proof_reference text not null, captured_at timestamptz not null, created_at timestamptz not null default now(),
 foreign key(owner_id,business_id) references public.isv_sending_businesses(owner_id,id)
);
create index isv_consent_lookup on public.isv_sms_consent(owner_id,business_id,contact_id,campaign_sid,phone,captured_at desc);
create table public.isv_sms_suppressions (
 owner_id text not null, business_id uuid not null, phone text not null,
 suppressed_at timestamptz not null default now(), source_message_sid text not null,
 primary key(owner_id,business_id,phone), foreign key(owner_id,business_id) references public.isv_sending_businesses(owner_id,id)
);
create table public.isv_webhook_receipts (
 account_sid text not null, event_sid text not null, event_kind text not null,
 owner_id text not null, payload_hash text not null, processed_at timestamptz not null default now(),
 primary key(account_sid,event_sid,event_kind),
 foreign key(owner_id,account_sid) references public.isv_provider_credentials(owner_id,account_sid)
);
create table public.isv_inbound_messages (
 account_sid text not null, message_sid text not null, owner_id text not null, assignment_id uuid not null,
 contact_id uuid references public.contacts(id) on delete set null, phone text not null, body text not null check(length(body)<=4000), kind text not null,
 created_at timestamptz not null default now(), primary key(account_sid,message_sid),
 foreign key(owner_id,assignment_id) references public.isv_sms_assignments(owner_id,id)
);
create table public.isv_sms_dispatches (
 owner_id text not null, operation_key text not null, assignment_id uuid not null, contact_id uuid references public.contacts(id) on delete set null,
 phone text not null, payload_hash text not null, state text not null check(state in ('reserved','dispatching','sent','failed','unknown','canceled')),
 provider_sid text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(owner_id,operation_key), foreign key(owner_id,assignment_id) references public.isv_sms_assignments(owner_id,id)
);
create table public.isv_sms_audit (
 id bigint generated always as identity primary key, owner_id text not null, assignment_id uuid not null,
 event text not null, reference text not null, created_at timestamptz not null default now(),
 foreign key(owner_id,assignment_id) references public.isv_sms_assignments(owner_id,id)
);
-- A shared transaction lock serializes STOP and dispatch authorization for the same sender/recipient.
create function public.isv_claim_sms(p_owner text,p_assignment uuid,p_contact uuid,p_phone text,p_key text,p_hash text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare a public.isv_sms_assignments; c public.isv_sms_consent;
begin
 select * into a from public.isv_sms_assignments where owner_id=p_owner and id=p_assignment and active;
 if not found then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner||':'||a.business_id||':'||p_phone,0));
 -- Re-read after acquiring the lock; queued work never trusts a pre-STOP snapshot.
 select * into a from public.isv_sms_assignments where owner_id=p_owner and id=p_assignment and active for share;
 if not found or not a.messaging_enabled or a.registration_status <> 'approved' or a.verification_source <> 'twilio_api' or not a.number_associated or a.verified_at < now()-interval '24 hours' or a.verified_at > now() then return false; end if;
 if not exists(select 1 from public.isv_sending_businesses where owner_id=p_owner and id=a.business_id and verified_at is not null) then return false; end if;
 if not exists(select 1 from public.contacts where id=p_contact and owner_id=p_owner and (case when length(regexp_replace(phone,'[^0-9]','','g'))=10 then '1'||regexp_replace(phone,'[^0-9]','','g') else regexp_replace(phone,'[^0-9]','','g') end)=substring(p_phone from 2) and not coalesce(dnc,false) and not coalesce(opt_out_requested,false)) then return false; end if;
 if exists(select 1 from public.isv_sms_suppressions where owner_id=p_owner and business_id=a.business_id and phone=p_phone) then return false; end if;
 select * into c from public.isv_sms_consent where owner_id=p_owner and business_id=a.business_id and contact_id=p_contact and phone=p_phone and campaign_sid=a.campaign_sid and purpose=a.approved_purpose order by captured_at desc,created_at desc limit 1;
 if not found or c.status <> 'granted' or c.captured_at > now() or length(c.proof_reference)=0 or length(c.disclosure_version)=0 or length(c.source)=0 then return false; end if;
 insert into public.isv_sms_dispatches(owner_id,operation_key,assignment_id,contact_id,phone,payload_hash,state)
 values(p_owner,p_key,p_assignment,p_contact,p_phone,p_hash,'dispatching') on conflict do nothing;
 if not found then return false; end if;
 insert into public.isv_sms_audit(owner_id,assignment_id,event,reference) values(p_owner,p_assignment,'DISPATCH_AUTHORIZED',p_key);
 return true;
end $$;
create function public.isv_receive_sms(p_owner text,p_assignment uuid,p_sid text,p_hash text,p_phone text,p_body text,p_kind text,p_contact uuid default null)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare a public.isv_sms_assignments;
begin
 select * into strict a from public.isv_sms_assignments where owner_id=p_owner and id=p_assignment and active;
 perform pg_advisory_xact_lock(hashtextextended(p_owner||':'||a.business_id||':'||p_phone,0));
 insert into public.isv_webhook_receipts(account_sid,event_sid,event_kind,owner_id,payload_hash) values(a.account_sid,p_sid,'inbound',p_owner,p_hash) on conflict do nothing;
 if not found then
  if exists(select 1 from public.isv_webhook_receipts where account_sid=a.account_sid and event_sid=p_sid and event_kind='inbound' and payload_hash<>p_hash) then raise exception 'Conflicting webhook replay'; end if;
  return false;
 end if;
 if p_kind='stop' then
  insert into public.isv_sms_suppressions(owner_id,business_id,phone,source_message_sid) values(p_owner,a.business_id,p_phone,p_sid) on conflict do nothing;
  update public.isv_sms_dispatches set state='canceled',updated_at=now() where owner_id=p_owner and assignment_id=a.id and phone=p_phone and state='reserved';
 end if;
 if p_contact is not null and not exists(select 1 from public.contacts where id=p_contact and owner_id=p_owner and (case when length(regexp_replace(phone,'[^0-9]','','g'))=10 then '1'||regexp_replace(phone,'[^0-9]','','g') else regexp_replace(phone,'[^0-9]','','g') end)=substring(p_phone from 2)) then raise exception 'Contact ownership mismatch'; end if;
 insert into public.isv_inbound_messages(account_sid,message_sid,owner_id,assignment_id,contact_id,phone,body,kind) values(a.account_sid,p_sid,p_owner,a.id,p_contact,p_phone,p_body,p_kind);
 -- Existing CRM inbox/history and scheduled-work protections, in the same receipt transaction.
 insert into public.inbound_communications(owner_id,provider_id,kind,contact_id,from_number,to_number,body,status,classification)
 values(p_owner,p_sid,'sms',p_contact,p_phone,a.from_number,p_body,'received',case when p_kind='stop' then 'Opt-out' when p_kind='help' then 'Help request' else 'Needs review' end);
 if p_kind='stop' then
  insert into public.communication_suppressions(owner_id,phone,channel,reason) values(p_owner,p_phone,'sms','Sender-specific STOP received') on conflict do nothing;
 end if;
 if p_contact is not null and p_kind <> 'help' then
  insert into public.engagement_events(owner_id,contact_id,event_type,channel,metadata)
  values(p_owner,p_contact,case when p_kind='stop' then 'opt_out' else 'replied' end,'sms',jsonb_build_object('from',p_phone,'to',a.from_number,'body',p_body,'messageSid',p_sid,'direction','Inbound','classification',case when p_kind='stop' then 'Opt-out' else 'Needs review' end));
  if p_kind='stop' then update public.contacts set dnc=true,opt_out_requested=true,sequence_active=null,updated_at=now() where owner_id=p_owner and id=p_contact; end if;
  update public.campaign_step_runs r set status='skipped',result=jsonb_build_object('reason','Inbound reply or opt-out; review before further outreach.') where r.owner_id=p_owner and r.status='scheduled' and exists(select 1 from public.campaign_recipients cr where cr.id=r.recipient_id and cr.owner_id=p_owner and cr.contact_id=p_contact);
 end if;
 insert into public.isv_sms_audit(owner_id,assignment_id,event,reference) values(p_owner,a.id,case when p_kind='stop' then 'STOP_SUPPRESSED' else 'INBOUND_RECEIVED' end,p_sid);
 return true;
end $$;
-- Credentials rotate using compare-and-swap; an old worker cannot overwrite a newer envelope.
create function public.isv_rotate_credential(p_owner text,p_account text,p_revision integer,p_envelope jsonb)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 update public.isv_provider_credentials set envelope=p_envelope,revision=revision+1,updated_at=now() where owner_id=p_owner and account_sid=p_account and revision=p_revision;
 return found;
end $$;
create function public.isv_record_delivery(p_owner text,p_assignment uuid,p_sid text,p_status text,p_hash text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare a public.isv_sms_assignments;
begin
 select * into strict a from public.isv_sms_assignments where owner_id=p_owner and id=p_assignment;
 -- A signed status may arrive before the send response; retain it without guessing a CRM message.
 insert into public.isv_webhook_receipts(account_sid,event_sid,event_kind,owner_id,payload_hash) values(a.account_sid,p_sid,'delivery:'||p_status,p_owner,p_hash) on conflict do nothing;
 if not found then return false; end if;
 insert into public.outbound_delivery_events(owner_id,message_id,provider,event_key,event_type,occurred_at,source,error_code)
 select p_owner,m.id,'twilio','isv:'||p_sid||':'||p_status,case when p_status='sending' then 'submitted' when p_status='canceled' then 'failed' else p_status end,null,'webhook',null
 from public.outbound_messages m where m.owner_id=p_owner and m.provider='twilio' and m.provider_message_id=p_sid and exists(select 1 from public.isv_sms_dispatches d where d.owner_id=p_owner and d.assignment_id=p_assignment and d.provider_sid=p_sid)
 on conflict do nothing;
 insert into public.isv_sms_audit(owner_id,assignment_id,event,reference) values(p_owner,a.id,'DELIVERY_'||upper(p_status),p_sid);
 return true;
end $$;
create function public.isv_check_contact_owner() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.contact_id is not null and not exists(select 1 from public.contacts where id=new.contact_id and owner_id=new.owner_id) then raise exception 'Contact ownership mismatch'; end if;
 return new;
end $$;
create trigger isv_consent_owner before insert or update on public.isv_sms_consent for each row execute function public.isv_check_contact_owner();
create trigger isv_dispatch_owner before insert or update on public.isv_sms_dispatches for each row execute function public.isv_check_contact_owner();
create trigger isv_inbound_owner before insert or update on public.isv_inbound_messages for each row execute function public.isv_check_contact_owner();
revoke all on function public.isv_check_contact_owner() from public,anon,authenticated;
grant execute on function public.isv_check_contact_owner() to service_role;
create function public.isv_save_registration(p_owner text,p_name text,p_website text,p_party text,p_authority text,p_version text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare b public.isv_sending_businesses;
begin
 -- A subscriber submission can request review but can never set provider approval.
 insert into public.isv_sending_businesses(owner_id,legal_name,website,responsible_party,authorization_reference,setup_version,review_status)
 values(p_owner,p_name,p_website,p_party,p_authority,p_version,'submitted')
 on conflict(owner_id) do update set legal_name=excluded.legal_name,website=excluded.website,responsible_party=excluded.responsible_party,authorization_reference=excluded.authorization_reference,setup_version=excluded.setup_version,review_status='submitted',verified_at=case when isv_sending_businesses.setup_version=excluded.setup_version then isv_sending_businesses.verified_at else null end
 returning * into b;
 if b.verified_at is null then update public.isv_sms_assignments set messaging_enabled=false,registration_status='incomplete' where owner_id=p_owner and business_id=b.id; end if;
 return b.id;
end $$;
revoke all on function public.isv_save_registration(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.isv_save_registration(text,text,text,text,text,text) to service_role;
create function public.isv_audit_credential_change() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into public.audit_logs(owner_id,action,entity_type,metadata) values(new.owner_id,case when tg_op='INSERT' then 'ISV_CREDENTIAL_BOUND' else 'ISV_CREDENTIAL_ROTATED' end,'isv_credential',jsonb_build_object('accountSid',new.account_sid,'keyId',new.envelope->>'keyId','revision',new.revision));
 return new;
end $$;
create trigger isv_credential_audit after insert or update on public.isv_provider_credentials for each row execute function public.isv_audit_credential_change();
revoke all on function public.isv_audit_credential_change() from public,anon,authenticated;
grant execute on function public.isv_audit_credential_change() to service_role;
create function public.isv_project_delivery(p_owner text,p_message uuid)
returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare inserted_count integer;
begin
 insert into public.outbound_delivery_events(owner_id,message_id,provider,event_key,event_type,occurred_at,source,error_code)
 select m.owner_id,m.id,'twilio','isv:'||m.provider_message_id||':'||substring(r.event_kind from 10),case substring(r.event_kind from 10) when 'sending' then 'submitted' when 'canceled' then 'failed' else substring(r.event_kind from 10) end,null,'webhook',null
 from public.outbound_messages m join public.isv_sms_dispatches d on d.owner_id=m.owner_id and d.provider_sid=m.provider_message_id
 join public.isv_sms_assignments a on a.owner_id=d.owner_id and a.id=d.assignment_id
 join public.isv_webhook_receipts r on r.owner_id=a.owner_id and r.account_sid=a.account_sid and r.event_sid=m.provider_message_id
 where m.owner_id=p_owner and m.id=p_message and m.provider='twilio' and r.event_kind in ('delivery:accepted','delivery:queued','delivery:sending','delivery:sent','delivery:delivered','delivery:undelivered','delivery:failed','delivery:canceled')
 on conflict do nothing;
 get diagnostics inserted_count=row_count;
 return inserted_count;
end $$;
revoke all on function public.isv_project_delivery(text,uuid) from public,anon,authenticated;
grant execute on function public.isv_project_delivery(text,uuid) to service_role;
-- Defense in depth: clients have no grants and there are no client RLS policies.
do $$ declare t text; begin
 foreach t in array array['isv_sending_businesses','isv_provider_credentials','isv_sms_assignments','isv_sms_consent','isv_sms_suppressions','isv_webhook_receipts','isv_inbound_messages','isv_sms_dispatches','isv_sms_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert on public.%I to service_role',t);
 end loop;
end $$;
grant update on public.isv_sending_businesses,public.isv_provider_credentials,public.isv_sms_assignments,public.isv_sms_dispatches to service_role;
grant usage,select on sequence public.isv_sms_audit_id_seq to service_role;
revoke all on function public.isv_record_delivery(text,uuid,text,text,text),public.isv_claim_sms(text,uuid,uuid,text,text,text),public.isv_receive_sms(text,uuid,text,text,text,text,text,uuid),public.isv_rotate_credential(text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.isv_record_delivery(text,uuid,text,text,text),public.isv_claim_sms(text,uuid,uuid,text,text,text),public.isv_receive_sms(text,uuid,text,text,text,text,text,uuid),public.isv_rotate_credential(text,text,integer,jsonb) to service_role;
commit;
