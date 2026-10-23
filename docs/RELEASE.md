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
