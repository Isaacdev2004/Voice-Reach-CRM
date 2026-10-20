# Agent guide (MyARI / Voice-Reach-CRM)

## Security (non-negotiable)

- **Auth:** `requireUserId()` on dashboard APIs; every Supabase query filters `owner_id`.
- **Billing:** Use `claimCheckoutSessionForOwner` / `evaluateCheckoutClaim` — never attach Stripe sessions without ownership checks.
- **Webhooks:** Twilio SMS validates signature; voice webhooks require `VOICE_WEBHOOK_SECRET` in production.
- **Outbound:** Respect `ALLOW_LIVE_OUTBOUND`; `sendToContact` blocks live adapters when paused.
- **OAuth:** Callback cookie owner must match Clerk user.

## Reliability

- Campaign **step runs:** `claimStepRunForExecution` before work; `releaseStepRunToScheduled` when deferring.
- Campaign **recipients:** `claimRecipientForOutboundSend` before manual bulk send.
- **CSS:** Avoid `max-w-xl` for prose — spacing tokens cap at ~48px; use `var(--container-xl)`.

## Workflow

- Open **PRs**; do not force-push `main`.
- CI must pass: typecheck, lint, `test:unit`, build.
- Docs: `docs/RELEASE.md`, `docs/STAGING.md`, `docs/SECURITY-RLS.md`, `docs/SYMPOSIUM-DEMO.md`.

## Demo

- Symposium checklist: `docs/SYMPOSIUM-DEMO.md`
- Keep `ALLOW_LIVE_OUTBOUND` off for live presentations unless sending real messages intentionally.
