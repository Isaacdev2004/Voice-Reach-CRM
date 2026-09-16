-- Explicit launch gate: cron / auto-scheduler will not deliver LIVE campaigns
-- until live_launched is true (set by "Launch campaign" in the UI).
alter table public.campaigns
  add column if not exists live_launched boolean not null default false;

create index if not exists idx_campaigns_live_launched
  on public.campaigns(owner_id, live_launched)
  where live_launched = true;
