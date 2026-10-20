-- Phase 1/3: MyARI uses Clerk + service role on the server. Anon/authenticated clients must not read tenant data.
-- Review in Supabase before applying; adjust if you intentionally expose tables via PostgREST.

revoke all on table public.contacts from anon, authenticated;
revoke all on table public.campaigns from anon, authenticated;
revoke all on table public.campaign_recipients from anon, authenticated;
revoke all on table public.campaign_steps from anon, authenticated;
revoke all on table public.campaign_step_runs from anon, authenticated;
revoke all on table public.consent_records from anon, authenticated;
revoke all on table public.voice_assets from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.calendar_connections from anon, authenticated;
revoke all on table public.calendar_events from anon, authenticated;
