-- Provision number ownership only after independently verifying the Twilio account/number.
create table if not exists public.subscriber_phone_numbers(
 id uuid primary key default gen_random_uuid(),owner_id text not null,
 phone text not null unique,account_sid text not null,verified boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.inbound_communications(
 id uuid primary key default gen_random_uuid(),owner_id text not null,provider_id text not null,
 kind text not null check(kind in ('sms','call')),contact_id uuid references public.contacts(id) on delete set null,
 from_number text not null,to_number text not null,body text not null default '',status text not null,
 classification text not null default 'Needs review',duration integer,received_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),unique(owner_id,provider_id,kind)
);
alter table public.subscriber_phone_numbers enable row level security;
alter table public.inbound_communications enable row level security;
revoke all on public.subscriber_phone_numbers,public.inbound_communications from public,anon,authenticated;
grant all on public.subscriber_phone_numbers,public.inbound_communications to service_role;
create table if not exists public.communication_suppressions(
 owner_id text not null,phone text not null,channel text not null default 'sms' check(channel='sms'),reason text not null,created_at timestamptz not null default now(),primary key(owner_id,phone,channel)
);
alter table public.communication_suppressions enable row level security;
revoke all on public.communication_suppressions from public,anon,authenticated;
grant all on public.communication_suppressions to service_role;
create or replace function public.ingest_inbound_communication(p_owner text,p_sid text,p_kind text,p_contact uuid,p_from text,p_to text,p_body text,p_status text,p_classification text,p_duration integer default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare inserted_id uuid; prior_status text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner||':'||p_sid,0));
 if not exists(select 1 from subscriber_phone_numbers where owner_id=p_owner and phone=p_to and verified) then raise exception 'Number ownership unavailable';end if;
 if p_contact is not null and not exists(select 1 from contacts where id=p_contact and owner_id=p_owner) then raise exception 'Contact unavailable';end if;
 select status into prior_status from inbound_communications where owner_id=p_owner and provider_id=p_sid and kind=p_kind;
 if prior_status is not null then
   if p_kind='call' and prior_status not in ('completed','busy','failed','no-answer','canceled') then
     update inbound_communications set status=p_status,duration=coalesce(p_duration,duration),updated_at=now() where owner_id=p_owner and provider_id=p_sid and kind=p_kind;
   end if;
   return jsonb_build_object('duplicate',true);
 end if;
 insert into inbound_communications(owner_id,provider_id,kind,contact_id,from_number,to_number,body,status,classification,duration)
 values(p_owner,p_sid,p_kind,p_contact,p_from,p_to,p_body,p_status,p_classification,p_duration) returning id into inserted_id;
 if p_kind='sms' and p_classification='Opt-out' then insert into communication_suppressions(owner_id,phone,channel,reason) values(p_owner,p_from,'sms','Inbound opt-out') on conflict(owner_id,phone,channel) do nothing;end if;
 if p_contact is not null and p_kind='sms' then
   insert into engagement_events(owner_id,contact_id,event_type,channel,metadata)
   values(p_owner,p_contact,case when p_classification='Opt-out' then 'opt_out' else 'replied' end,'sms',jsonb_build_object('from',p_from,'to',p_to,'body',p_body,'messageSid',p_sid,'direction','Inbound','classification',p_classification));
   if p_classification='Opt-out' then update contacts set dnc=true,opt_out_requested=true,sequence_active=null,updated_at=now() where owner_id=p_owner and id=p_contact;end if;
   -- Existing worker policy stops all outreach after a reply/opt-out. Skip queued sends atomically with receipt.
   update campaign_step_runs r set status='skipped',result=jsonb_build_object('reason','Inbound reply or opt-out; review before further outreach.')
   where r.owner_id=p_owner and r.status='scheduled' and exists(select 1 from campaign_recipients cr where cr.id=r.recipient_id and cr.owner_id=p_owner and cr.contact_id=p_contact);
 end if;
 return jsonb_build_object('id',inserted_id,'duplicate',false);
end $$;
revoke all on function public.ingest_inbound_communication(text,text,text,uuid,text,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.ingest_inbound_communication(text,text,text,uuid,text,text,text,text,text,integer) to service_role;
