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

### Notes workspace and audio

The proposed `20261023030000_notes_workspace.sql` migration revokes direct `anon`/`authenticated` access to private notes/history and grants workspace-save/task RPC execution only to `service_role`. Every Notes API authenticates the subscriber; application reads filter `owner_id`, and SQL save/task functions independently verify all linked contact/property IDs under the server-supplied owner. Revision comparison and history creation occur in the same transaction. Additional contact associations enter timelines only by stable IDs. Authorized note deletion cascades transcript history; tasks remain, with the source note foreign key cleared.

Audio upload processing requires authentication, explicit consent attestation, bounded upload/type validation, and provider timeouts. Audio is not stored by MyARI. Provider retention still applies; note/transcript/history retention follows note deletion. Browser draft recovery is scoped to the authenticated owner and available for seven days, with expired recovery removed on the next workspace visit. AI outputs are schema-validated and quote-grounded drafts for review, never autonomous communications, contact updates, or campaign enrollment. The migration and hosted-provider behavior still require staging verification before rollout.
