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

Notes original-schema compatibility uses authenticated owner-filtered reads and schema probes. Basic updates compare the exact stored timestamp as well as `owner_id` and `id`; duplicate creation retries use an owner-checked primary UUID. Property context in this mode is derived only from the actual linked owned contact's saved address. Independent/multiple associations require the full migration. Unknown schema, permission and network failures never authorize weaker writes. No migration is auto-applied by the compatibility path.

### Financing records

`financing_partners` and `financing_reports` are server-only/RLS tables with browser grants revoked. Financing APIs require Clerk authentication and owner filters. Server-calculated report snapshots validate owned contact/property/partner associations, and transaction functions recheck associations under locks. Preferred partners are unique per owner/type. See `docs/financing-studio/REVIEW.md` for isolated PostgreSQL and API tests; production RLS has not been verified by this task.

The subsequent Financing/Property Finder reference-layout changes preserve existing tenant APIs and permissions. Decorative artwork uses bundled static URLs with stable crop assignments and never includes client information or claims to depict a listed/client property. Property Finder browser tests again exercise subscriber switching and confirm prior client information clears.

## Tasks workspace ownership

`20261025000000_tasks_workspace.sql` removes broad browser-role grants on `contact_tasks` and makes `task_transactions` server-only. API routes authenticate with Clerk and scope every record read/write by owner. Contact/property/note/campaign/event and workspace-member references are checked before writes. Trigger guards validate contact/property/note/transaction/dependency ownership and cycle/completion safety under an owner advisory lock. Checklist and reviewed AI batch inserts are atomic and retry-safe; transaction snapshots reference canonical task IDs. New workspace requests include an expected-owner header, preventing an old account's queued preference/task request from writing into a newly authenticated account. This header supplements authentication; it never selects the authenticated owner. No subscriber IDs or foreign row details are returned on denied requests. See the isolated PostgreSQL and route tests in the Tasks review; no claim is made that the configured production database was audited.
