-- Lead engagement fields for buyer workflows (W1/W2/W3).
-- Run AFTER schema.sql and schema-m3.sql.

alter table public.contacts
  add column if not exists lead_type text default 'buyer'
    check (lead_type is null or lead_type in ('buyer','seller','investor','partner')),
  add column if not exists lead_status text default 'cold'
    check (lead_status is null or lead_status in ('cold','engaged_no_tour','toured_no_followup','active','nurture')),
  add column if not exists last_engagement_at timestamptz,
  add column if not exists last_engagement_type text,
  add column if not exists engagement_score integer not null default 0,
  add column if not exists tour_count integer not null default 0,
  add column if not exists sequence_active text,
  add column if not exists sequence_step integer,
  add column if not exists sequence_started_at timestamptz,
  add column if not exists listings_viewed jsonb not null default '[]',
  add column if not exists opt_out_requested boolean not null default false;

create index if not exists idx_contacts_lead_status
  on public.contacts(owner_id, lead_status);
create index if not exists idx_contacts_engagement
  on public.contacts(owner_id, engagement_score desc, last_engagement_at desc);

-- Idempotent: safe to re-run after partial applies.
