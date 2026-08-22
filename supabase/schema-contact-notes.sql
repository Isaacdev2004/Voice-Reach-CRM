-- Notes & Strategy + Property Finder fields
-- Supabase → SQL Editor → New query → Paste all → Run
-- Safe to re-run.

create table if not exists public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  kind text not null default 'note'
    check (kind in ('note', 'strategy', 'goal')),
  title text not null default '',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contact_notes_owner on public.contact_notes(owner_id, created_at desc);
create index if not exists idx_contact_notes_contact on public.contact_notes(contact_id, created_at desc);
create index if not exists idx_contact_notes_kind on public.contact_notes(owner_id, kind);

alter table public.contact_notes enable row level security;

drop policy if exists "server owned contact_notes" on public.contact_notes;
create policy "server owned contact_notes" on public.contact_notes for all using (true) with check (true);

alter table public.contact_notes add column if not exists kind text;
alter table public.contact_notes add column if not exists title text;
alter table public.contact_notes add column if not exists body text;
alter table public.contact_notes add column if not exists contact_id uuid;
alter table public.contact_notes add column if not exists owner_id text;
alter table public.contact_notes add column if not exists created_at timestamptz;
alter table public.contact_notes add column if not exists updated_at timestamptz;

update public.contact_notes
set title = left(coalesce(body, ''), 80)
where title is null or title = '';

alter table public.contacts add column if not exists preferred_area text;
alter table public.contacts add column if not exists budget numeric;
alter table public.contacts add column if not exists property_address text;
