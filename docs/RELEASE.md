# Release and rollback (MyARI)

## Standard release

1. Merge to `main` (CI must pass: typecheck, lint, `test:unit`, build).
2. Vercel auto-deploys **Production** from `main`.
3. Smoke-check: `/`, `/sign-in`, `/dashboard`, `/api/health`.
4. Confirm `ALLOW_LIVE_OUTBOUND` matches intent (demo vs live).

## Preview / staging

- Every PR gets a **Vercel Preview** URL — use for client review before merge.
- Optional: add a dedicated `staging` branch in Vercel → assign a stable preview domain.

## Rollback

1. Vercel → **Deployments** → previous green deployment → **Promote to Production**.
2. If a bad migration ran in Supabase, restore from backup or run reverse SQL (no automatic down migrations).
3. If Stripe/billing metadata changed, reconcile via Stripe Dashboard + `/api/billing/claim` audit logs.

## Hotfix

1. Branch from `main`, minimal fix, PR with CI green.
2. Merge and verify production within 15 minutes.
3. Post incident note in audit log / internal channel.

## Before connecting Codex

- Enable **branch protection** on `main` (see `docs/GITHUB-SETUP.md`).
- Never commit `.env` or service role keys.
- Codex should open PRs only; human merges after CI.

### Financing & Closing Studio (review branch)

Adds closing calculators, owner-scoped lender/title management, original report exports and connected client follow-up at the preserved `/dashboard/mortgage` route. Requires review/application of the new Financing migration in staging before saved reports/partners work. Manual fees remain estimates; no title API or live sharing is enabled. See `docs/financing-studio/REVIEW.md` for scope, tests, limitations and compliance/provider approvals. Not deployed by this task.

### Financing and Property Finder reference refinements

Rearranges financing into property/loan/lender tools on the left and a combined payment chart plus rate history on the right. Adds stable original photographic covers to Property Finder actions, saved searches and client panels. Preserves all six Studio sections, search criteria, data ownership and existing destinations. See both `reference-layout/REVIEW.md` guides for screenshots and limitations. No additional database change or deployment is required/performed by this refinement.

## Premium Tasks workspace (pending release)

See [Tasks review](tasks-workspace/REVIEW.md) for visuals, metrics, tests and release gates. Requires reviewed `20261025000000_tasks_workspace.sql` on staging after prerequisite schema/migrations; no configured database was modified. Do not deploy automatically. Basic tasks remain available before the workspace update; dependencies/trackers/reviewed AI batches require it. Background notification delivery and Google series reconciliation remain separate provider/staging checks. Roll back the app before considering any database rollback; retain task/transaction records.

## Premium Studio, Activity, Settings and Brand Kit (review branch)

See [review and release gates](studio-activity-review/REVIEW.md). Includes Tasks hero/template refinements, safe Voice Studio previews, receiving-number-scoped inbound tracking, premium Activity/Settings and private approved branding. The four `20261026*`/`20261027*` migrations are **not applied** to the configured database. No production deployment or provider changes were performed. Server API-key issuance, organization invitations and a new direct SMS reply sender are explicitly unsupported rather than presented as functional.

## Dashboard typography refinement

Focused main-based visual/data-presentation refinement; no migrations or provider changes. The user explicitly requested automatic deployment after checks. Merge only this CI-green dashboard PR to trigger the existing Vercel production integration, then verify the exact main commit deployment status. Separate unmerged AI assistant PR #26 is excluded. See [before/after and QA](dashboard-typography-review/REVIEW.md).

## Property Finder refinement — 2026-10-23

See [Property Finder audit](PROPERTY-FINDER-AUDIT.md) for data sources, changes, synthetic QA, screenshots and integration limitations. History uses existing owner-scoped audit records with immutable retry IDs; no new migration. Search remains external Zillow links, with location/maximum price only. Additional preferences are optional, not live listing filters. No production contacts, schedules, messages or provider credentials were modified during tests.

## Voice Studio persistence repair — 2026-10-23

See [Voice Studio repair and QA](VOICE-STUDIO-REPAIR.md). Draft saves now use owner/revision checks, account-scoped device recovery and a private document fallback only for missing draft schema. Transcripts are separate reviewed records; approved audio and live sending gates remain protected. QA uses synthetic records and providers; production database/provider operation remains unverified. No production schema or credential changes are included.

Follow-up QA: campaign voice-test dialogs now sit above the preview drawer with isolated keyboard focus. Calendar preference failures distinguish missing database setup, conflicts and outages; production persistence remains unverified. See [Voice Studio repair report](VOICE-STUDIO-REPAIR.md#follow-up-campaign-overlay-and-calendar-preference-banner).

Dashboard / briefing / Twilio follow-up: see [final audit](DASHBOARD-BRIEFING-TWILIO-AUDIT.md). Compact UI and owner-scoped daily preferences; opt-in scheduling; validated Claude selections; conservative shared-number quarantine and transport holds. No production Twilio configuration or test communications. Verify worker/provider configuration separately.


### Dashboard bottom finish — 2026-10-23

Dashboard-only bottom spacing now leaves 80px on desktop and 96px on mobile, plus device safe-area inset, beneath the final cards. No records, routes or business logic change.


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

## Staged AI Assistant 2.0 and AI-inclusive pricing (2026-10-24)

Local review branch only: `feat/ai-operating-assistant`. Claude remains available; the OpenAI Responses assistant, monthly AI ledger and new $65/$115/$215 catalog with optional $20 AI Pro are disabled by default. No production data, credentials, Stripe products, subscriptions or deployment were changed. Legacy plans and annual prices remain intact.

Implementation, feature limitations and approval gates: [Assistant report](ai-operating-assistant/README.md), [pricing report](ai-pricing-launch/README.md). Do not enable public pricing before actual Stripe test-mode acceptance, migration review, provider access and business terms approval. No new annual/post-launch prices have been invented.

## Pricing architecture correction (2026-10-24)

CRM Only $49/$99/$199 and CRM + AI Plus $65/$115/$215 are mutually exclusive monthly base plans. The $16 difference includes AI Plus; there is no purchasable $20 AI add-on. Old add-on quotes and APIs are unconditionally retired, without deleting Stripe records. Corresponding monthly upgrades/downgrades require an owner-bound invoice preview and explicit base-item replacement confirmation. Existing subscriptions, Founding terms and CRM annual paths remain unchanged. New public prices/plan changes remain disabled; no deployment or production writes. See [corrected billing report](ai-pricing-launch/README.md).

## Assistant remaining-gap repair (2026-10-24)

Preserved Assistant 2.0 and the approved mutually exclusive pricing correction. Added atomic proposal-root approval/supersession, canonical sender/content-bound messaging, blocked/removed enrollment and simulation guards, mandatory evidence/unknown-outcome holds, provider timeouts and owner-scoped delivery status. Internal messaging now also requires explicit account/recipient allowlists; flags and lists remain off/empty. Voice saved-record context and OpenAI reasoning continuation are repaired. [Repair report](assistant-messaging-repair/README.md) includes the reviewed migration and release limitations. No production writes or deployment.
