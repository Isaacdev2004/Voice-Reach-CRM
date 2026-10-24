# Staging and demo environments

## Recommended layout

| Environment | Source | Purpose |
|-------------|--------|---------|
| **Production** | `main` on Vercel | Client / symposium live URL |
| **Preview** | PR branches | QA before merge |
| **Local** | `npm run dev` | Developer + Codex |

## Demo-safe variables (symposium / sales)

```
ALLOW_LIVE_OUTBOUND=false   # or unset
VOICE_PROVIDER=mock
```

Live Twilio/Resend/Slybroadcast keys can remain set; outbound code respects `ALLOW_LIVE_OUTBOUND`.

## Production go-live variables

```
ALLOW_LIVE_OUTBOUND=true
APP_BASE_URL=https://your-domain.com
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
VOICE_WEBHOOK_SECRET=...   # append ?token= to dispo URL
STRIPE_WEBHOOK_SECRET=...
CRON_SECRET=...            # Vercel cron → /api/campaigns/runner
```

## Synthetic demo data

- Import `scripts/sample-contacts.csv` if present, or use Contacts → **Import CSV**.
- Create one **Simulation** campaign from Templates; do not launch live on stage.

See also `docs/SYMPOSIUM-DEMO.md`.

## Calendar workspace and unified contact activity

Review `docs/calendar-premium/README.md` for the Calendar/Phase 18 setup, isolated QA commands, Google OAuth redirect/scopes/encryption, read-only Apple feeds, and disabled-by-default booking links. Apply `20261023020000_calendar_workspace.sql` in a test database first. Verify actual preference CAS and concurrent booking locks there; local mocked tests do not establish PostgreSQL or live-provider verification. Keep live outbound off. No production rollout is authorized by this implementation.

### Notes & Strategy workspace

Review `docs/notes-premium/README.md` before enabling the Notes workspace. Apply `supabase/migrations/20261023030000_notes_workspace.sql` only to isolated staging first. It depends on the existing Notes/Contacts/Tasks schemas and adds service-role-only revision saves, version history, and source-note task deduplication. Verify legacy quick-note/contact-note routes, all tenant boundaries, two-client stale writes, restore/delete, and optional calendar reminders. Summary generation requires authorized Anthropic configuration; uploaded-audio transcription requires authorized OpenAI configuration. Use synthetic notes/audio and explicit consent attestations; never record real calls or trigger live outbound during QA. Production rollout remains subject to approval.

Notes compatibility correction: basic note reads/edits and a primary contact with its saved property context now work before the Notes workspace migration. Verify both original and migrated schemas. Only identified absent columns enable the legacy path; permission/network failures must remain errors. Basic writes use UUID retry protection and `updated_at` comparison. Advanced/independent associations still require the full migration; the UI must not discard unsupported fields or label a failed load as an empty library.

### Financing & Closing Studio

Review [the Financing Studio guide](financing-studio/REVIEW.md) and `20261024000000_financing_studio.sql` before applying to staging. Keep outbound off. Verify two owners, preferred lender/title defaults, saved report snapshots/timeline entries and manual fee assumptions. No production migration was performed by the implementation task.

Reference-layout review: compare Financing and Property Finder at 1440/1536/1920/768/390px using the `reference-layout` screenshot guides. Verify purchase/refinance, the right-column payment/report action, preferred-lender selection, illustrated action cards and saved client preferences. No new migration accompanies the presentation refinement; the original Financing migration is still needed for saved partner/report storage.

## Tasks workspace acceptance

Use [Tasks review and screenshots](tasks-workspace/REVIEW.md). Apply the Tasks migration to a confirmed non-production database only. Use two synthetic subscribers with distinct contacts, notes, campaigns, properties and tasks. Compare all four KPIs and card-click filters against full owner-scoped records, including local midnight/week boundaries, missing completion dates and more than 200 tasks. Verify CRUD, stale updates, blocked dependencies/cycles, deleted prerequisites, recurring completion retries, templates/date review, transaction progress, saved preferences across navigation/devices and source-context links. Test AI/microphone/provider failures without real communications. Confirm background notifications are not promised and provider series edits require review. Local QA does not prove production record accuracy.

## Studio / Activity / Settings / Brand Kit staging gate

Use a confirmed non-production Clerk/Supabase/provider setup. Review prerequisites and apply the migrations listed in [the review report](studio-activity-review/REVIEW.md). Run `test:unit`, `test:studio-db` (PGlite), `test:studio-browser`, `test:tasks-browser`, typecheck/lint/build. Keep `ALLOW_LIVE_OUTBOUND` off. Test with synthetic contacts and provider mocks; do not enroll contacts, send messages/calls, charge accounts, rotate keys or modify live schedules.

Verify two separate subscriber sessions, stale-save conflicts, profile photo persistence/provider restrictions, private brand upload access, real signed audio, recording/approval/explicit assignment and real provider status interpretation. Configure only staging Twilio number ownership/callbacks; the call-status endpoint is not a forwarding handler. Capture desktop/mobile results. All actual provider and authenticated staging checks remain pending until this gate is completed. A database update here is applying supplied SQL, not purchasing an upgrade.

## Dashboard typography review

Run `npm run test:dashboard-browser` for synthetic 1440/1920/768/390px captures with writes blocked. Check hero copy/actions, all four KPI destinations, actual campaign enrollment/step counts versus delivery metrics, row navigation, recommendation failure, empty/error priorities and subscriber switching. No live data reconciliation is claimed. [Report](dashboard-typography-review/REVIEW.md).

## Property Finder refinement — 2026-10-23

See [Property Finder audit](PROPERTY-FINDER-AUDIT.md) for data sources, changes, synthetic QA, screenshots and integration limitations. History uses existing owner-scoped audit records with immutable retry IDs; no new migration. Search remains external Zillow links, with location/maximum price only. Additional preferences are optional, not live listing filters. No production contacts, schedules, messages or provider credentials were modified during tests.

## Voice Studio persistence repair — 2026-10-23

See [Voice Studio repair and QA](VOICE-STUDIO-REPAIR.md). Draft saves now use owner/revision checks, account-scoped device recovery and a private document fallback only for missing draft schema. Transcripts are separate reviewed records; approved audio and live sending gates remain protected. QA uses synthetic records and providers; production database/provider operation remains unverified. No production schema or credential changes are included.

Follow-up QA: campaign voice-test dialogs now sit above the preview drawer with isolated keyboard focus. Calendar preference failures distinguish missing database setup, conflicts and outages; production persistence remains unverified. See [Voice Studio repair report](VOICE-STUDIO-REPAIR.md#follow-up-campaign-overlay-and-calendar-preference-banner).

Dashboard / briefing / Twilio follow-up: see [final audit](DASHBOARD-BRIEFING-TWILIO-AUDIT.md). Compact UI and owner-scoped daily preferences; opt-in scheduling; validated Claude selections; conservative shared-number quarantine and transport holds. No production Twilio configuration or test communications. Verify worker/provider configuration separately.


### Dashboard bottom finish — 2026-10-23

Dashboard finish QA: scroll to the end at 1440/1920/1280/768/390px widths and 700/900px heights. The final recommendation remains fully visible above the bottom edge, with no horizontal overflow. Synthetic screenshots: dashboard-bottom-spacing/desktop.png and mobile.png.


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

## AI pricing / Assistant 2.0 acceptance gates

Use synthetic owners and mocked messaging. Apply `20261030000000_ai_usage_meter.sql` only to an isolated development database first; verify service-role RPC access, RLS, schema version and concurrent usage reservations. Keep production flags off. Configure only explicitly authorized test Stripe prices and `MYARI_AI_STRIPE_MODE=test`; actual Stripe price `livemode` must match before writes. Launch start/end/cohort/terms and proration require business approval. Never copy live customers into fixtures.

Run unit/security/type/lint/build, synthetic assistant browser tests, isolated usage DB tests and the local public build crawl. Then separately verify real test-mode checkout, signed webhooks, invoices/payment failure/renewal/add-on removal, connected-calendar behavior, provider usage and existing customer upgrade disclosure. No live outbound or campaign activation. See [rollout report](ai-pricing-launch/README.md).

## Pricing architecture correction (2026-10-24)

CRM Only $49/$99/$199 and CRM + AI Plus $65/$115/$215 are mutually exclusive monthly base plans. The $16 difference includes AI Plus; there is no purchasable $20 AI add-on. Old add-on quotes and APIs are unconditionally retired, without deleting Stripe records. Corresponding monthly upgrades/downgrades require an owner-bound invoice preview and explicit base-item replacement confirmation. Existing subscriptions, Founding terms and CRM annual paths remain unchanged. New public prices/plan changes remain disabled; no deployment or production writes. See [corrected billing report](ai-pricing-launch/README.md).
