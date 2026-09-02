-- Custom contact categories (user-managed groups like Residential / Commercial / Investors)
alter table public.contacts
  add column if not exists category text;

create index if not exists idx_contacts_owner_category
  on public.contacts(owner_id, category);
