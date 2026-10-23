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

## Ask MyARI review demo

Use synthetic staging contacts only; keep `ALLOW_LIVE_OUTBOUND` off. Open the drawer, summarize a selected saved contact, inspect source links, edit a task proposal, save the edit and explicitly confirm once. Reopen history and confirm one record after retry. Demonstrate an email proposal as an approved draft, not a sent message. Open Daily briefing and show unavailable/unverified data honestly. Never demo fabricated account counts or live sends. [Screenshots and report](ai-assistant-review/REVIEW.md).
