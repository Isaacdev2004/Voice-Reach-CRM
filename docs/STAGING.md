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
