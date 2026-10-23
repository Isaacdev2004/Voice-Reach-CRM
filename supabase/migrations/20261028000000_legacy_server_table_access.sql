-- REVIEW REQUIRED: prepared offline; do not apply to production automatically.
-- Clerk identities are authorized by server APIs, not by public PostgREST roles.
-- Legacy USING (true) policies are unsafe when browser roles have table grants.
begin;
do $$
declare name text;
begin
  foreach name in array array[
    'contacts','consent_records','voice_assets','campaigns','campaign_recipients','audit_logs',
    'campaign_steps','campaign_step_runs','engagement_events','automation_rules','automation_runs',
    'partner_workspaces','partner_invitations','partner_shared_assets','provider_webhooks',
    'integration_connections','contact_tasks','contact_notes','calendar_connections','calendar_events','voice_profiles'
  ] loop
    if to_regclass(format('public.%I',name)) is not null then
      execute format('alter table public.%I enable row level security',name);
      execute format('revoke all on table public.%I from public, anon, authenticated',name);
      execute format('grant all on table public.%I to service_role',name);
    end if;
  end loop;
end $$;
commit;
