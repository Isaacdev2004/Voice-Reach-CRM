-- REVIEW REQUIRED. New evidence only; does not backfill or rewrite historical records.
begin;
create table if not exists public.outbound_messages (
 id uuid primary key default gen_random_uuid(), owner_id text not null, logical_key text not null,
 provider text not null, channel text not null check(channel in ('sms','email','voicemail')),
 campaign_id text, contact_id uuid, recipient_id text, step_id text,
 provider_message_id text, subject text, body text,
 submission_status text not null default 'pending' check(submission_status in ('pending','accepted','failed','unknown')),
 error_code text, created_at timestamptz not null default now(), unique(id,owner_id,provider)
);
create index if not exists outbound_messages_owner_date on public.outbound_messages(owner_id,created_at,id);
create unique index if not exists outbound_provider_reference on public.outbound_messages(provider,provider_message_id) where provider_message_id is not null;
create table if not exists public.outbound_delivery_events (
 id uuid primary key default gen_random_uuid(), owner_id text not null,
 message_id uuid not null, provider text not null,
 foreign key(message_id,owner_id,provider) references public.outbound_messages(id,owner_id,provider),
 event_key text not null, event_type text not null check(event_type in ('queued','submitted','accepted','sent','delivered','failed','undelivered','bounced','rejected','opened','clicked','replied','opt_out','listened','callback')),
 occurred_at timestamptz, received_at timestamptz not null default now(),
 source text not null check(source in ('submission','webhook','reconciliation')), error_code text,
 unique(provider,event_key)
);
create index if not exists delivery_events_owner_message on public.outbound_delivery_events(owner_id,message_id);
create table if not exists public.provider_sync_runs (
 id uuid primary key default gen_random_uuid(), owner_id text not null,
 provider text not null, channel text not null check(channel in ('sms','email','voicemail')),
 attempted_at timestamptz not null, succeeded_at timestamptz, error_code text
);
alter table public.outbound_messages enable row level security;
alter table public.outbound_delivery_events enable row level security;
alter table public.provider_sync_runs enable row level security;
-- No browser policies: read/write only through service-role owner-scoped server APIs.
revoke all on public.outbound_messages, public.outbound_delivery_events, public.provider_sync_runs from anon, authenticated;
grant select,insert,update on public.outbound_messages to service_role;
grant select,insert on public.outbound_delivery_events, public.provider_sync_runs to service_role;
commit;
