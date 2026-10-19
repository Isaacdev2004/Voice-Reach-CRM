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
