-- Phase 2: faster inbound SMS phone lookup (apply in Supabase SQL editor if not using migrations)
create index if not exists idx_contacts_phone on public.contacts (phone);

create index if not exists idx_provider_webhooks_dedupe
  on public.provider_webhooks (provider, external_id)
  where external_id is not null;
