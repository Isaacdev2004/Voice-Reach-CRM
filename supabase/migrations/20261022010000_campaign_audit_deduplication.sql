-- REVIEW ONLY: do not apply automatically. No historical records are deleted or rewritten.
begin;
do $$ begin
 if exists(select 1 from public.campaign_step_runs group by owner_id,campaign_id,recipient_id,step_id having count(*)>1) then
  raise exception 'Existing duplicate step runs require human reconciliation before this migration.';
 end if;
 if exists(select 1 from public.provider_webhooks where external_id is not null and external_id<>'' group by provider,external_id,event_type having count(*)>1) then
  raise exception 'Existing duplicate provider events require human reconciliation before this migration.';
 end if;
end $$;
create unique index if not exists campaign_step_run_once on public.campaign_step_runs(owner_id,campaign_id,recipient_id,step_id);
create unique index if not exists provider_event_once on public.provider_webhooks(provider,external_id,event_type) where external_id is not null and external_id<>'';
commit;
