# MyARI symposium demo checklist

Use this the night before and 30 minutes before presenting.

## Demo-safe production settings (recommended)

| Variable | Value for demo | Why |
|----------|----------------|-----|
| `ALLOW_LIVE_OUTBOUND` | **unset** or `false` | No real SMS/RVM/email blast during the talk |
| `VOICE_PROVIDER` | `mock` | Simulation voicemails |
| Clerk | Production keys OK | Sign in with your demo account |
| Stripe | Live or test | Use a **demo account** already on a plan (avoid live checkout on stage) |

## Pre-flight (15 min)

1. Hard-refresh **`/`** — homepage, pricing, log in.
2. Sign in → **`/dashboard`** — KPIs load, no setup errors.
3. Click **Contacts** — list populated (import CSV beforehand if empty).
4. **Property Finder** — select client, hero + workspace load.
5. **Campaigns** — open library + builder; confirm **Simulation** mode label.
6. **Voice Scripts** — hero image + library visible.
7. Hide **API keys** in Settings if screen-sharing.

## Suggested live path (5 min)

Home → Contacts (search one name) → Property Finder (save criteria + copy link) → Campaigns (template + flow) → Calendar → Voice Scripts → Activity.

Full narration: see product walkthrough script in team docs / chat history.

## Security fixes shipped (Oct 2026 audit)

- Stripe checkout **claim** bound to account + single use
- Twilio SMS **signature** + replay dedupe
- Voice webhook **secret** in production (`VOICE_WEBHOOK_SECRET`)
- OAuth callbacks match **signed-in user**
- Campaign send **skip / lock** for already-queued recipients

## If something breaks on stage

- **401/403 on webhooks** — expected for unsigned test POSTs; not user-facing.
- **Billing claim fails** — sign in with the **same email** used at Stripe checkout.
- **Empty contacts** — use Import CSV or demo fallback rows on Contacts.
- **Live send blocked** — correct in demo mode; say “Simulation protects real phones.”

## After symposium

1. Set `VOICE_WEBHOOK_SECRET` on production if using Slybroadcast dispo URL.
2. Confirm `APP_BASE_URL` matches your Vercel domain (Twilio signatures).
3. Audit Supabase **RLS/grants** in dashboard (see `docs/SECURITY-RLS.md`).

### Financing Studio demo

Use synthetic contacts and manually verified test amounts. Show calculation assumptions, report preview and local export. Apply the Financing migration to the demo/staging database before demonstrating saved reports/partners. Do not claim live valuations, official title pricing, guaranteed rates or verified legal compliance. Keep outbound messaging off.

Reference-layout evidence is under `docs/financing-studio/reference-layout` and `docs/property-finder-premium/reference-layout`. The charts/client names in QA screenshots are synthetic. Demonstrate actual saved clients and optional preferred lenders in staging; show the genuine Zillow search empty state when there is no authorized listing feed.

## Tasks workspace demo

Review [Tasks screenshots and release gates](tasks-workspace/REVIEW.md). Use synthetic staging data with outbound off. Demonstrate compact list/board/focus, real KPI filters, a reviewed custom checklist and a blocked milestone. Complete the prerequisite, then the next milestone; show the same tasks in Contacts/Calendar and real tracker progress. Review/edit an AI proposal before approving it; do not imply that dictation, AI, live provider sync or background reminders have been verified without their separate staging checks. The database workspace update is a migration, not a paid plan upgrade.

## Premium Studio / Activity / Settings demo

Use the isolated synthetic screenshots in `docs/studio-activity-review`, not production subscribers. Show read-only Test Voice Script and synthetic text personalization; explain that prerecorded audio is unchanged and provider acceptance is not delivery. Demonstrate Settings profile tabs, private branding previews and derived onboarding progress. Do not describe roster entries as real invitations, browser references as working API keys, or keyword suggestions as AI-verified intent. Keep live outbound off and do not send, call, charge or modify provider configuration. Authenticated staging/provider verification and migrations remain release gates.

## Dashboard typography QA

The compact hero preserves exact approved copy and original photo. Review real KPI links, measured delivery rates, library enrollment/step counts and compact priorities; unknown reply metrics remain dashes. Never represent synthetic review screenshots as subscriber records. Existing live-outbound settings remain unchanged. [Before/after](dashboard-typography-review/REVIEW.md).

## Property Finder refinement — 2026-10-23

See [Property Finder audit](PROPERTY-FINDER-AUDIT.md) for data sources, changes, synthetic QA, screenshots and integration limitations. History uses existing owner-scoped audit records with immutable retry IDs; no new migration. Search remains external Zillow links, with location/maximum price only. Additional preferences are optional, not live listing filters. No production contacts, schedules, messages or provider credentials were modified during tests.

## Voice Studio persistence repair — 2026-10-23

See [Voice Studio repair and QA](VOICE-STUDIO-REPAIR.md). Draft saves now use owner/revision checks, account-scoped device recovery and a private document fallback only for missing draft schema. Transcripts are separate reviewed records; approved audio and live sending gates remain protected. QA uses synthetic records and providers; production database/provider operation remains unverified. No production schema or credential changes are included.

Follow-up QA: campaign voice-test dialogs now sit above the preview drawer with isolated keyboard focus. Calendar preference failures distinguish missing database setup, conflicts and outages; production persistence remains unverified. See [Voice Studio repair report](VOICE-STUDIO-REPAIR.md#follow-up-campaign-overlay-and-calendar-preference-banner).

Dashboard / briefing / Twilio follow-up: see [final audit](DASHBOARD-BRIEFING-TWILIO-AUDIT.md). Compact UI and owner-scoped daily preferences; opt-in scheduling; validated Claude selections; conservative shared-number quarantine and transport holds. No production Twilio configuration or test communications. Verify worker/provider configuration separately.


### Dashboard bottom finish — 2026-10-23

Dashboard visual check: scroll to the final recommendation and confirm the complete rounded card and bottom breathing room remain visible on desktop and mobile.


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
