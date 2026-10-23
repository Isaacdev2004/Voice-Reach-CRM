# Supabase RLS and tenant isolation

## What the repo SQL does

Migration files under `supabase/` enable RLS but many policies use:

```sql
using (true) with check (true)
```

Those policies are **not** multi-tenant isolation. They assume **only the server** accesses Postgres via the **service role**, and the app enforces `owner_id` in API routes.

## What you must verify in Supabase Dashboard

1. **API keys** — The `anon` key must not be exposed in the browser for data tables (this app uses server routes + service role).
2. **Grants** — `authenticated` / `anon` roles should not have broad `SELECT` on `contacts`, `campaigns`, etc., unless policies truly restrict by `auth.uid()` (Clerk IDs are not Supabase auth by default).
3. **Service role** — Used only in server code (`lib/supabaseAdmin.ts`). Never ship to client bundles or public env vars.

## Application rule

Every query in `app/api/**` must filter by `owner_id` from `requireUserId()` (or verified webhook context). Webhooks must authenticate the provider before mutating data.

## Future hardening

Replace `using (true)` policies with `owner_id = current_setting('app.owner_id')` if moving to Postgres session variables, or drop client-facing Supabase access entirely.

## Calendar scheduling proposal

`20261023020000_calendar_workspace.sql` restricts new `calendar_share_links`, `calendar_booking_requests`, and preference/booking functions to `service_role`. Dashboard handlers derive the owner from `requireUserId`; public feed/booking handlers derive it from a 256-bit hashed capability token, never an owner supplied by a guest. Private feeds expose Busy times only. Management tokens are separately hashed. Calendar OAuth tokens use a server-only AES-256-GCM key, and ETags protect external changes. See `docs/calendar-premium/README.md` for staging-only verification requirements; this migration has not been applied automatically.

## Dashboard presentation refinement

Uses existing authenticated contact snapshots, owned campaign-library records, analytics and priority APIs. No API, permission, SQL, schema, consent or outbound change. Frontend failed reads remain unavailable rather than false zeros/empty successes; account-keyed instances and abortable reads prevent stale display. QA uses synthetic subscribers with all writes blocked. [Review](dashboard-typography-review/REVIEW.md).
