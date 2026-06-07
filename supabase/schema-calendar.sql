-- Calendar sync (Google Calendar MVP). Run AFTER schema.sql and schema-m3.sql.

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  provider text not null default 'google' check (provider in ('google')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  calendar_id text not null default 'primary',
  account_email text,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider)
);
create index if not exists idx_calendar_connections_owner on public.calendar_connections(owner_id);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  step_run_id uuid,
  external_event_id text not null,
  provider text not null default 'google',
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (owner_id, provider, external_event_id)
);
create index if not exists idx_calendar_events_contact on public.calendar_events(contact_id, starts_at desc);

-- AI voice profiles (ElevenLabs cloned voices)
create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  provider text not null default 'elevenlabs',
  provider_voice_id text not null,
  label text not null,
  sample_asset_id uuid references public.voice_assets(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_voice_profiles_owner on public.voice_profiles(owner_id);

alter table public.calendar_connections enable row level security;
alter table public.calendar_events enable row level security;
alter table public.voice_profiles enable row level security;

create policy "server owned calendar_connections" on public.calendar_connections for all using (true) with check (true);
create policy "server owned calendar_events" on public.calendar_events for all using (true) with check (true);
create policy "server owned voice_profiles" on public.voice_profiles for all using (true) with check (true);
