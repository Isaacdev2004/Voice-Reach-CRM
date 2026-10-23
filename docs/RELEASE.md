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
