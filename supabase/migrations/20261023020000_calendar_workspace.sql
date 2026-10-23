-- REVIEW / APPLY IN STAGING FIRST. No production history is rewritten.
-- Preferences reuse the existing subscriber audit-settings infrastructure.
create or replace function public.save_calendar_preferences(p_owner text,p_preferences jsonb,p_expected uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare latest uuid; saved uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('calendar-preferences:'||p_owner,0));
 select id into latest from audit_logs where owner_id=p_owner and entity_type='calendar_preferences' and action='CALENDAR_PREFERENCES_SAVED' order by created_at desc,id desc limit 1;
 if latest is distinct from p_expected then raise exception 'stale preferences'; end if;
 insert into audit_logs(owner_id,action,entity_type,metadata) values(p_owner,'CALENDAR_PREFERENCES_SAVED','calendar_preferences',jsonb_build_object('preferences',p_preferences)) returning id into saved;
 return saved;
end $$;
revoke all on function public.save_calendar_preferences(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_calendar_preferences(text,jsonb,uuid) to service_role;

create table if not exists public.calendar_share_links(
 id uuid primary key default gen_random_uuid(),owner_id text not null,
 kind text not null check(kind in ('feed','booking')),token_hash text unique not null,
 active boolean not null default true,config jsonb not null default '{}',created_at timestamptz not null default now()
);
create index if not exists calendar_share_links_owner on public.calendar_share_links(owner_id);
alter table public.calendar_share_links enable row level security;
revoke all on public.calendar_share_links from anon,authenticated;
grant all on public.calendar_share_links to service_role;
create table if not exists public.calendar_booking_requests(
 id uuid primary key default gen_random_uuid(),owner_id text not null,link_id uuid not null references public.calendar_share_links(id) on delete cascade,
 starts_at timestamptz not null,ends_at timestamptz not null,guest_name text not null,guest_email text not null,
 manage_hash text unique not null,status text not null default 'pending' check(status in ('pending','cancelled')),
 created_at timestamptz not null default now(),check(ends_at>starts_at)
);
create index if not exists calendar_booking_owner_range on public.calendar_booking_requests(owner_id,starts_at,ends_at) where status='pending';
alter table public.calendar_booking_requests enable row level security;
revoke all on public.calendar_booking_requests from anon,authenticated;
grant all on public.calendar_booking_requests to service_role;
-- Transactional local hold. Provider rechecks happen in the API; external calendars cannot be locked here.
create or replace function public.reserve_calendar_booking(p_link uuid,p_start timestamptz,p_end timestamptz,p_name text,p_email text,p_manage_hash text,p_replace uuid default null,p_old_hash text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare l calendar_share_links; result uuid; before_interval interval; after_interval interval;
begin
 select * into l from calendar_share_links where id=p_link and active and kind='booking';
 if not found then raise exception 'unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended('calendar-booking:'||l.owner_id,0));
 before_interval:=make_interval(mins=>coalesce((l.config->>'bufferBefore')::int,0)+coalesce((l.config->>'travelMinutes')::int,0));
 after_interval:=make_interval(mins=>coalesce((l.config->>'bufferAfter')::int,0));
 if p_end<=p_start or p_start<now()+make_interval(mins=>coalesce((l.config->>'noticeMinutes')::int,60)) or p_end-p_start<>make_interval(mins=>(l.config->>'duration')::int) then raise exception 'unavailable'; end if;
 if p_replace is not null and not exists(select 1 from calendar_booking_requests where id=p_replace and owner_id=l.owner_id and link_id=l.id and manage_hash=p_old_hash and status='pending') then raise exception 'unavailable'; end if;
 if exists(select 1 from calendar_booking_requests where owner_id=l.owner_id and status='pending' and (p_replace is null or id<>p_replace) and starts_at<p_end+after_interval+before_interval and ends_at>p_start-before_interval-after_interval)
 or exists(select 1 from calendar_events where owner_id=l.owner_id and starts_at<p_end+after_interval+before_interval and ends_at>p_start-before_interval-after_interval and metadata->>'busy' is distinct from 'false') then raise exception 'overlap'; end if;
 if p_replace is null then
 insert into calendar_booking_requests(owner_id,link_id,starts_at,ends_at,guest_name,guest_email,manage_hash) values(l.owner_id,l.id,p_start,p_end,p_name,p_email,p_manage_hash) returning id into result;
 else
 update calendar_booking_requests set starts_at=p_start,ends_at=p_end,manage_hash=p_manage_hash where id=p_replace and owner_id=l.owner_id returning id into result;
 end if;
 return result;
end $$;
revoke all on function public.reserve_calendar_booking(uuid,timestamptz,timestamptz,text,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_calendar_booking(uuid,timestamptz,timestamptz,text,text,text,uuid,text) to service_role;
-- Confirming requests is an explicit subscriber action, never an automatic send.
alter table public.calendar_booking_requests drop constraint if exists calendar_booking_requests_status_check;
alter table public.calendar_booking_requests add constraint calendar_booking_requests_status_check check(status in ('pending','cancelled','confirmed'));
alter table public.calendar_booking_requests add column if not exists event_id uuid references public.calendar_events(id) on delete set null;
create or replace function public.confirm_calendar_booking(p_owner text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare r calendar_booking_requests; l calendar_share_links; result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('calendar-booking:'||p_owner,0));
 select * into r from calendar_booking_requests where id=p_request and owner_id=p_owner and status='pending' for update;
 if not found then raise exception 'unavailable'; end if;
 select * into l from calendar_share_links where id=r.link_id and owner_id=p_owner and active;
 if not found or r.starts_at<=now() then raise exception 'unavailable'; end if;
 if exists(select 1 from calendar_events where owner_id=p_owner and starts_at<r.ends_at and ends_at>r.starts_at) then raise exception 'overlap'; end if;
 if nullif(l.config->>'contactId','') is not null and not exists(select 1 from contacts where id=(l.config->>'contactId')::uuid and owner_id=p_owner) then raise exception 'unavailable'; end if;
 result:=gen_random_uuid();
 insert into calendar_events(id,owner_id,contact_id,external_event_id,provider,title,starts_at,ends_at,metadata)
 values(result,p_owner,nullif(l.config->>'contactId','')::uuid,'local-'||result,'local',coalesce(l.config->>'title','Client appointment'),r.starts_at,r.ends_at,jsonb_build_object('version',gen_random_uuid(),'bookingRequestId',r.id,'kind','crm','timeZone',l.config->>'timezone','syncState','local'));
 update calendar_booking_requests set status='confirmed',event_id=result where id=r.id and owner_id=p_owner;
 return result;
end $$;
revoke all on function public.confirm_calendar_booking(text,uuid) from public,anon,authenticated;
grant execute on function public.confirm_calendar_booking(text,uuid) to service_role;
-- Serialize app appointment writes with public booking reservations. Explicit overlap acknowledgements
-- apply to appointments only; pending client holds cannot be silently displaced.
create or replace function public.guard_calendar_slot() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('calendar-booking:'||new.owner_id,0));
 if new.ends_at<=new.starts_at then raise exception 'invalid calendar interval'; end if;
 if exists(select 1 from calendar_booking_requests b where b.owner_id=new.owner_id and b.status='pending' and b.id::text is distinct from new.metadata->>'bookingRequestId' and b.starts_at<new.ends_at and b.ends_at>new.starts_at) then raise exception 'overlap with booking request'; end if;
 if new.metadata->>'enforceConflict'='true' and exists(select 1 from calendar_events e where e.owner_id=new.owner_id and e.id<>new.id and e.starts_at<new.ends_at+make_interval(mins=>coalesce((new.metadata->>'gapMinutes')::int,0)) and e.ends_at>new.starts_at-make_interval(mins=>coalesce((new.metadata->>'gapMinutes')::int,0)) and e.metadata->>'busy' is distinct from 'false') then raise exception 'overlap with appointment'; end if;
 return new;
end $$;
drop trigger if exists calendar_slot_guard on public.calendar_events;
create trigger calendar_slot_guard before insert or update of starts_at,ends_at on public.calendar_events for each row execute function public.guard_calendar_slot();
revoke all on function public.guard_calendar_slot() from public,anon,authenticated;
