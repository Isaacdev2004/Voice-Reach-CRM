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
