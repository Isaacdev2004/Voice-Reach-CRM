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
