create extension if not exists "pgcrypto";

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  first_name text not null,
  last_name text,
  phone text not null,
  email text,
  type text default 'Imported Contact',
  source text,
  dnc boolean not null default false,
  notes text,
  last_contacted date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null check (status in ('Yes','No','Unknown')),
  source text,
  consent_date date,
  proof_reference text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  script_id text not null,
  title text not null,
  storage_path text not null,
  audio_url text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  script_id text not null,
  voice_asset_id uuid references public.voice_assets(id),
  provider text not null default 'mock',
  status text not null default 'draft' check (status in ('draft','queued','sending','sent','partial','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  eligibility_status text not null default 'pending',
  eligibility_issues text[] not null default '{}',
  delivery_status text not null default 'not_sent',
  provider_message_id text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id, contact_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_contacts_owner_id on public.contacts(owner_id);
create index if not exists idx_consent_contact_id on public.consent_records(contact_id);
create index if not exists idx_campaigns_owner_id on public.campaigns(owner_id);
create index if not exists idx_campaign_recipients_campaign_id on public.campaign_recipients(campaign_id);
create index if not exists idx_audit_logs_owner_id_created_at on public.audit_logs(owner_id, created_at desc);

alter table public.contacts enable row level security;
alter table public.consent_records enable row level security;
alter table public.voice_assets enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_recipients enable row level security;
alter table public.audit_logs enable row level security;

-- NOTE: This starter uses Clerk user IDs stored as owner_id and accesses data through
-- server-side route handlers. If you later expose Supabase directly to the browser,
-- replace these placeholder policies with Clerk JWT/Supabase Auth policies.

create policy "server owned contacts" on public.contacts for all using (true) with check (true);
create policy "server owned consent records" on public.consent_records for all using (true) with check (true);
create policy "server owned voice assets" on public.voice_assets for all using (true) with check (true);
create policy "server owned campaigns" on public.campaigns for all using (true) with check (true);
create policy "server owned campaign recipients" on public.campaign_recipients for all using (true) with check (true);
create policy "server owned audit logs" on public.audit_logs for all using (true) with check (true);
