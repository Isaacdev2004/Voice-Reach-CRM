-- Contact tasks & reminders. Run AFTER schema.sql.

create table if not exists public.contact_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  reminder_at timestamptz,
  completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  recurrence text default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contact_tasks_contact on public.contact_tasks(contact_id, due_at);
create index if not exists idx_contact_tasks_owner on public.contact_tasks(owner_id, completed);

alter table public.contact_tasks enable row level security;
create policy "server owned contact_tasks" on public.contact_tasks for all using (true) with check (true);

-- If table already exists without recurrence:
alter table public.contact_tasks add column if not exists recurrence text default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly'));
