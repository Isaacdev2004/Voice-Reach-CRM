-- Third-party OAuth connections (Dotloop first). Run AFTER schema.sql.

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  provider text not null check (provider in ('dotloop')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  account_label text,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider)
);
create index if not exists idx_integration_connections_owner on public.integration_connections(owner_id);

alter table public.integration_connections enable row level security;
drop policy if exists "server owned integration_connections"
  on public.integration_connections;
create policy "server owned integration_connections"
  on public.integration_connections for all using (true) with check (true);
