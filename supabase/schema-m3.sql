-- Milestone 3 extensions: campaign steps, engagement, automation triggers, partners.
-- Run this AFTER schema.sql.

-- ----- Campaign steps & queue -----
create table if not exists public.campaign_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  step_order int not null,
  type text not null check (type in ('voicemail','sms','email','avatar_video','task','callback','wait')),
  title text not null,
  description text default '',
  delay_minutes int not null default 0,
  day_label text,
  time_label text,
  conditions jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','active','paused','sent')),
  created_at timestamptz not null default now()
);
create index if not exists idx_campaign_steps_campaign_id on public.campaign_steps(campaign_id, step_order);

create table if not exists public.campaign_step_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  step_id uuid not null references public.campaign_steps(id) on delete cascade,
  recipient_id uuid not null references public.campaign_recipients(id) on delete cascade,
  scheduled_at timestamptz not null,
  executed_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','running','sent','skipped','failed','blocked')),
  provider_message_id text,
  result jsonb default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_step_runs_scheduled_at on public.campaign_step_runs(scheduled_at) where status = 'scheduled';
create index if not exists idx_step_runs_campaign on public.campaign_step_runs(campaign_id);

-- ----- Engagement events -----
create table if not exists public.engagement_events (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  contact_id uuid references public.contacts(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  step_id uuid references public.campaign_steps(id) on delete set null,
  event_type text not null check (event_type in (
    'delivered','listened','clicked','opened','replied','callback','opt_out','blocked','failed','task_completed'
  )),
  channel text check (channel in ('voicemail','sms','email','video','task','callback','system')),
  score int not null default 0,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create index if not exists idx_engagement_owner_contact on public.engagement_events(owner_id, contact_id, occurred_at desc);
create index if not exists idx_engagement_campaign on public.engagement_events(campaign_id);

-- ----- Automation triggers & rules -----
create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  description text default '',
  trigger_type text not null check (trigger_type in (
    'contact_added','voicemail_listened','email_opened','sms_replied','callback_received',
    'tag_added','lead_inactive','engagement_score','manual'
  )),
  trigger_config jsonb not null default '{}',
  actions jsonb not null default '[]',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_automation_rules_owner on public.automation_rules(owner_id, enabled);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  rule_id uuid references public.automation_rules(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  status text not null default 'completed' check (status in ('queued','running','completed','failed')),
  actions_executed jsonb not null default '[]',
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_runs_rule on public.automation_runs(rule_id, created_at desc);

-- ----- Partner workspace -----
create table if not exists public.partner_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  type text not null default 'lender' check (type in ('lender','co_agent','vendor','team_member','other')),
  brand_color text,
  logo_url text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_partners_owner on public.partner_workspaces(owner_id);

create table if not exists public.partner_invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  partner_id uuid not null references public.partner_workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'collaborator' check (role in ('viewer','collaborator','approver')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  token text not null unique
);
create index if not exists idx_partner_invites_status on public.partner_invitations(status);

create table if not exists public.partner_shared_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  partner_id uuid not null references public.partner_workspaces(id) on delete cascade,
  asset_type text not null check (asset_type in ('campaign','voice_asset','script','contact_list','note')),
  asset_id uuid not null,
  permission text not null default 'view' check (permission in ('view','edit','approve')),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  shared_at timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists idx_partner_assets_partner on public.partner_shared_assets(partner_id);

-- ----- Provider webhook log -----
create table if not exists public.provider_webhooks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text,
  event_type text,
  raw jsonb not null,
  processed boolean not null default false,
  received_at timestamptz not null default now()
);
create index if not exists idx_provider_webhooks_processed on public.provider_webhooks(processed, received_at desc);

-- Enable RLS placeholders
alter table public.campaign_steps enable row level security;
alter table public.campaign_step_runs enable row level security;
alter table public.engagement_events enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;
alter table public.partner_workspaces enable row level security;
alter table public.partner_invitations enable row level security;
alter table public.partner_shared_assets enable row level security;
alter table public.provider_webhooks enable row level security;

create policy "server owned campaign_steps" on public.campaign_steps for all using (true) with check (true);
create policy "server owned step_runs" on public.campaign_step_runs for all using (true) with check (true);
create policy "server owned engagement" on public.engagement_events for all using (true) with check (true);
create policy "server owned rules" on public.automation_rules for all using (true) with check (true);
create policy "server owned rule_runs" on public.automation_runs for all using (true) with check (true);
create policy "server owned partners" on public.partner_workspaces for all using (true) with check (true);
create policy "server owned partner_invites" on public.partner_invitations for all using (true) with check (true);
create policy "server owned partner_assets" on public.partner_shared_assets for all using (true) with check (true);
create policy "provider webhooks open" on public.provider_webhooks for all using (true) with check (true);
