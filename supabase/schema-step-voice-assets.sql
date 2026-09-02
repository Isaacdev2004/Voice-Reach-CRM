-- Per-step voice recordings (multiple RVMs in one campaign)
alter table public.campaign_steps
  add column if not exists voice_asset_id uuid references public.voice_assets(id) on delete set null;

create index if not exists idx_campaign_steps_voice_asset
  on public.campaign_steps(voice_asset_id)
  where voice_asset_id is not null;
