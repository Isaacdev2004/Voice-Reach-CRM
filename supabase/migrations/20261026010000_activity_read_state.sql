create table if not exists public.activity_read_state (
 owner_id text not null,event_id text not null,read boolean not null default false,
 dismissed boolean not null default false,updated_at timestamptz not null default now(),
 primary key(owner_id,event_id)
);
alter table public.activity_read_state enable row level security;
revoke all on public.activity_read_state from anon,authenticated;
grant all on public.activity_read_state to service_role;
