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

## Property Finder refinement — 2026-10-23

See [Property Finder audit](PROPERTY-FINDER-AUDIT.md) for data sources, changes, synthetic QA, screenshots and integration limitations. History uses existing owner-scoped audit records with immutable retry IDs; no new migration. Search remains external Zillow links, with location/maximum price only. Additional preferences are optional, not live listing filters. No production contacts, schedules, messages or provider credentials were modified during tests.

## Voice Studio persistence repair — 2026-10-23

See [Voice Studio repair and QA](VOICE-STUDIO-REPAIR.md). Draft saves now use owner/revision checks, account-scoped device recovery and a private document fallback only for missing draft schema. Transcripts are separate reviewed records; approved audio and live sending gates remain protected. QA uses synthetic records and providers; production database/provider operation remains unverified. No production schema or credential changes are included.

Follow-up QA: campaign voice-test dialogs now sit above the preview drawer with isolated keyboard focus. Calendar preference failures distinguish missing database setup, conflicts and outages; production persistence remains unverified. See [Voice Studio repair report](VOICE-STUDIO-REPAIR.md#follow-up-campaign-overlay-and-calendar-preference-banner).

Dashboard / briefing / Twilio follow-up: see [final audit](DASHBOARD-BRIEFING-TWILIO-AUDIT.md). Compact UI and owner-scoped daily preferences; opt-in scheduling; validated Claude selections; conservative shared-number quarantine and transport holds. No production Twilio configuration or test communications. Verify worker/provider configuration separately.


### Dashboard bottom finish — 2026-10-23

Dashboard bottom-spacing follow-up changes presentation and browser QA only; authentication, tenant queries, permissions and provider behavior are unchanged.


## Calendar functionality repair — 2026-10-23

See [Calendar repair report](CALENDAR-FUNCTIONALITY-REPAIR.md). Calendar view changes are immediate and independent of cloud saves. Preferences use owner-scoped existing storage with revision checks; the optional compatibility SQL was tested only in isolation and must not be applied to production automatically. Review using synthetic events; no real communications or production appointment edits are needed. Google connection status must be verified per subscriber, never assumed.


## Public website refinement — review pending

See [public website report](PUBLIC-WEBSITE-REFINEMENT.md). Homepage and Features follow the approved premium composition; shared menus have a mobile equivalent. Trial/pricing/authentication and SEO routes are preserved. Contact delivery is mocked in QA; errors are safe and the email fallback requires an explicit click. Canonical metadata was added to existing legal routes without policy edits. Review screenshots and run the public tests before approval. Do not publish or send real contact-form messages during testing.

### Gated playbook delivery
See [PLAYBOOK-GATED-DELIVERY.md](./PLAYBOOK-GATED-DELIVERY.md). Contact submission and provider acceptance gate the private email attachment; no public download bypass. Verify only with synthetic requests and mocked email in QA; production sender configuration remains unverified.

### Public homepage correction and Phase 12
See [PUBLIC-HOMEPAGE-CORRECTION.md](./PUBLIC-HOMEPAGE-CORRECTION.md) for before/after images, the architectural hero without a device, actual Dashboard showcase, responsive validation and production-verification limits. Public presentation and lead-magnet delivery only; no production CRM records or provider settings changed.

### Public polish and Phase 14 walkthrough
See [PUBLIC-POLISH-PHASE14.md](./PUBLIC-POLISH-PHASE14.md): branding consistency, compact Pricing, focused synthetic Contacts/Builder images, resource claim/link corrections and accessible lazy-loaded walkthrough. Public production QA runs read-only after a successful main-branch Vercel deployment. Billing/auth/provider credentials and subscriber records are unchanged.

### Pricing compact follow-up (October 23, 2026)
Public Pricing now presents plan names and prices before supporting copy, with a shorter hero and a single heading/billing-toggle row. No billing, authentication, credentials, or subscriber records changed. Public production video QA uses Google Chrome with media diagnostics.

Analytics preview follow-up: replaced the incomplete capture with the actual interface calculated from 48 synthetic delivery records, including correlated replies. Corrected a confirmed chart layout defect (percentage-height bars had no definite-height parent), reduced date-label crowding, and captured complete charts. Demonstration labeling remains; no production metrics or records changed.

Walkthrough placement follow-up: removed the standalone phone-thumbnail strip and integrated the modal trigger into the Dashboard editorial showcase. Restored the original `/brand/ari-dashboard-hero.png` video cover. Preserved the existing finished video and transcript; refreshing its embedded interfaces requires an editable source or a new recording.

## Approved Pricing + Phase 16 (October 23, 2026)
See [implementation and QA report](APPROVED-PRICING-PHASE16.md). Approved architectural hero, aligned cards, shared benefits, single gated playbook CTA, comparison and plan chooser. Annual billing now carries the selected period to Stripe using the existing advertised ten-month-price annual offer. Existing monthly mappings and subscriptions are preserved; annual IDs are validated, fallback price data uses a yearly interval, and tests mock all external providers. Account billing periods/amounts are read from verified owner-scoped Stripe records. No production records or credentials changed during testing.


## Premium campaigns and Reviews & Referrals

See [implementation, validation and release gates](campaign-premium/README.md). Adds separate review-only campaign drafts, private planning PDFs, owner-scoped review/referral history, manual relationship management and additional review-reminder restrictions. No production records, credentials, enrollments or approved audio were changed during testing; no migration was applied. Use synthetic contacts and keep live outbound disabled for demos. User authorized deployment after critical checks; provider verification, subscriber Brand Kit setup, approved recordings and live campaign inventory remain separate gates.

## AI tool and usage boundaries

Assistant browser context contains stable record IDs only; server tools reauthorize with authenticated owner_id. Retrieved messages/notes/documents are untrusted data. Models can read or prepare proposals; separate subscriber confirmation revalidates digest, expiry, ownership, permissions, consent and sender configuration. Native tool call claims and execution claims prevent replay. Unknown partial writes require reconciliation rather than blind retry. Approved single campaign messages remain behind a separate disabled send gate; bulk/activation/admin/billing are not model execution tools.

Usage accounts, operations and audited adjustments are RLS-protected; reserve/settle/schema RPCs are service-role only. PostgreSQL owner-period-capability row locks enforce atomic caps. Browser counters never authorize usage. Existing subscribers are not migrated. Billing uses strict Stripe item identity and explicit test/live approval. Dollar estimates are not provider invoices; $5/$12 monitoring thresholds do not terminate paid usage. No production migration was applied. Full retention purge and real provider acceptance remain release gates.
