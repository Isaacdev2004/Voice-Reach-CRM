-- Staging-only until reviewed. No existing subscription or production record is migrated.
create table if not exists public.ai_usage_accounts (
 owner_id text not null,period_start timestamptz not null,period_end timestamptz not null,
 capability text not null check(capability in ('requests','message_drafts','campaign_drafts','tasks','calendar_events','documents','transcription_seconds','sapphire_seconds','workflows')),
 used integer not null default 0 check(used>=0),reserved integer not null default 0 check(reserved>=0),
 primary key(owner_id,period_start,capability)
);
create table if not exists public.ai_usage_operations (
 owner_id text not null,period_start timestamptz not null,capability text not null,operation_key text not null,
 units integer not null check(units>0),state text not null check(state in ('reserved','committed','released')),
 created_at timestamptz not null default now(),settled_at timestamptz,
 primary key(owner_id,period_start,capability,operation_key),
 foreign key(owner_id,period_start,capability) references public.ai_usage_accounts(owner_id,period_start,capability)
);
alter table public.ai_usage_accounts enable row level security;
alter table public.ai_usage_operations enable row level security;
revoke all on public.ai_usage_accounts,public.ai_usage_operations from anon,authenticated;
grant all on public.ai_usage_accounts,public.ai_usage_operations to service_role;
create or replace function public.reserve_ai_usage(p_owner text,p_period timestamptz,p_end timestamptz,p_capability text,p_key text,p_units integer,p_limit integer) returns jsonb
language plpgsql security definer set search_path=public as $$
declare account public.ai_usage_accounts; operation public.ai_usage_operations;
begin
 if p_owner is null or p_key is null or p_units is null or p_limit is null or p_period is null or p_end is null or p_owner='' or p_key='' or length(p_key)>200 or p_units<=0 or p_limit<0 or p_period>=p_end or now()<p_period or now()>=p_end then raise exception 'AI_INVALID';end if;
 insert into public.ai_usage_accounts(owner_id,period_start,period_end,capability) values(p_owner,p_period,p_end,p_capability) on conflict do nothing;
 select * into account from public.ai_usage_accounts where owner_id=p_owner and period_start=p_period and capability=p_capability for update;
 select * into operation from public.ai_usage_operations where owner_id=p_owner and period_start=p_period and capability=p_capability and operation_key=p_key;
 if found then
  if operation.units<>p_units then raise exception 'AI_KEY_CONFLICT';end if;
  if operation.state='released' then
   if account.used+account.reserved+p_units>p_limit then raise exception 'AI_LIMIT';end if;
   update public.ai_usage_accounts set reserved=reserved+p_units where owner_id=p_owner and period_start=p_period and capability=p_capability;
   update public.ai_usage_operations set state='reserved',settled_at=null where owner_id=p_owner and period_start=p_period and capability=p_capability and operation_key=p_key;
   return jsonb_build_object('fresh',true,'state','reserved');
  end if;
  return jsonb_build_object('fresh',false,'state',operation.state);
 end if;
 if account.used+account.reserved+p_units>p_limit then raise exception 'AI_LIMIT';end if;
 insert into public.ai_usage_operations(owner_id,period_start,capability,operation_key,units,state) values(p_owner,p_period,p_capability,p_key,p_units,'reserved');
 update public.ai_usage_accounts set reserved=reserved+p_units where owner_id=p_owner and period_start=p_period and capability=p_capability;
 return jsonb_build_object('fresh',true,'state','reserved');
end;$$;
create or replace function public.settle_ai_usage(p_owner text,p_period timestamptz,p_capability text,p_key text,p_delivered boolean) returns void
language plpgsql security definer set search_path=public as $$
declare operation public.ai_usage_operations;
begin
 perform 1 from public.ai_usage_accounts where owner_id=p_owner and period_start=p_period and capability=p_capability for update;
 select * into operation from public.ai_usage_operations where owner_id=p_owner and period_start=p_period and capability=p_capability and operation_key=p_key for update;
 if not found then raise exception 'AI_NOT_FOUND';end if;
 if operation.state<>'reserved' then return;end if;
 update public.ai_usage_accounts set reserved=reserved-operation.units,used=used+case when p_delivered then operation.units else 0 end where owner_id=p_owner and period_start=p_period and capability=p_capability;
 update public.ai_usage_operations set state=case when p_delivered then 'committed' else 'released' end,settled_at=now() where owner_id=p_owner and period_start=p_period and capability=p_capability and operation_key=p_key;
end;$$;
revoke all on function public.reserve_ai_usage(text,timestamptz,timestamptz,text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.settle_ai_usage(text,timestamptz,text,text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_ai_usage(text,timestamptz,timestamptz,text,text,integer,integer),public.settle_ai_usage(text,timestamptz,text,text,boolean) to service_role;

create table if not exists public.ai_usage_adjustments (
 id uuid primary key,owner_id text not null,period_start timestamptz not null,capability text not null,
 additional_units integer not null check(additional_units>0 and additional_units<=60000),
 approved_by text not null,reason text not null check(length(reason)>=10),created_at timestamptz not null default now()
);
alter table public.ai_usage_adjustments enable row level security;
revoke all on public.ai_usage_adjustments from anon,authenticated;
grant all on public.ai_usage_adjustments to service_role;
create or replace function public.ai_usage_schema_version() returns integer language sql stable security definer set search_path=public as $$select 1;$$;
revoke all on function public.ai_usage_schema_version() from public,anon,authenticated;
grant execute on function public.ai_usage_schema_version() to service_role;
