# Vercel production setup

Add these in **Vercel → Project → Settings → Environment Variables**, then **Redeploy**.

## Brand assets

Place the client **MyARI** wordmark PNG at `public/brand/myari-logo.png` (sidebar + favicon). Until then, the app uses `public/brand/myari-logo.svg`.

## Required (dashboard + auth)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `SUPABASE_STORAGE_BUCKET` | `voice-assets` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk API keys |
| `CLERK_SECRET_KEY` | Clerk API keys |
| `APP_BASE_URL` | Production site URL, e.g. `https://myari.io` (or your current Vercel URL until the custom domain is connected) |

## Phase 4A — Live sending

| Variable | Channel |
|---|---|
| `VOICE_PROVIDER` | `slybroadcast` (not `mock`) |
| `SLYBROADCAST_USERNAME` | Ringless voicemail |
| `SLYBROADCAST_PASSWORD` | Ringless voicemail |
| `SLYBROADCAST_CALLER_ID` | Outbound caller ID |
| `TWILIO_ACCOUNT_SID` | SMS |
| `TWILIO_AUTH_TOKEN` | SMS |
| `TWILIO_FROM_NUMBER` | SMS-enabled number |
| `RESEND_API_KEY` | Email |
| `RESEND_FROM_EMAIL` | e.g. `MyARI Team <noreply@myari.io>` (verified domain) |
| `ALLOW_LIVE_OUTBOUND` | Must be `true` for real SMS / RVM / email (master kill switch) |
| `CRON_SECRET` | Random string — **required** for Vercel Cron to auth to `/api/campaigns/runner` (auto-send every minute) |
| `CAMPAIGN_RUNNER_SECRET` | Optional manual cron header `x-cron-secret` |

## Voice AI (ElevenLabs)

| Variable | Notes |
|---|---|
| `ELEVENLABS_API_KEY` | Script-to-speech + voice clone |
| `ELEVENLABS_VOICE_ID` | Default premade voice (optional) |

Voice Studio → **Generate audio** creates a `voice_assets` row. Approve it, link to a campaign, then voicemail steps can send via Slybroadcast.

## Google Calendar sync

| Variable | Notes |
|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client |
| `GOOGLE_CLIENT_SECRET` | OAuth secret |
| `APP_BASE_URL` | Must match authorized redirect |

**Google Cloud console:** create OAuth client (Web), add **every** redirect URI you use (must match character-for-character):

- `https://www.myari.io/api/integrations/google/callback`
- `https://myari.io/api/integrations/google/callback` (if users hit the apex domain)

Set `APP_BASE_URL` in Vercel to the **same host** users sign in on (e.g. `https://www.myari.io`). Optional override: `GOOGLE_OAUTH_REDIRECT_URI` if you need a fixed callback URL.

Settings → **Google Calendar** → Connect. Callback/task campaign steps create calendar events when connected.

## Database

Run in Supabase SQL editor:

1. `supabase/schema.sql`
2. `supabase/schema-m3.sql`
3. `supabase/schema-calendar.sql`
4. `supabase/schema-contact-tasks.sql`
5. `supabase/schema-integrations.sql` (Dotloop OAuth tokens)
6. `supabase/schema-lead-engagement.sql` (buyer workflow fields + engagement score)
7. `supabase/schema-contact-notes.sql` (Notes & Strategy + Property Finder fields)

Create Storage bucket: **`voice-assets`** (private).

## Webhooks

| Provider | URL |
|---|---|
| Slybroadcast | `https://myari.io/api/webhooks/voice?provider=slybroadcast` |
| Twilio (SMS status) | `https://myari.io/api/webhooks/voice?provider=twilio` |
| Twilio (inbound STOP/HELP) | `https://myari.io/api/webhooks/twilio/sms` |
| Resend (email events) | `https://myari.io/api/webhooks/voice?provider=resend` |

**Twilio inbound:** Phone Number → Messaging → “A message comes in” → webhook URL above (HTTP POST). Required for STOP → DNC.

## Stripe (agent membership)

| Variable | Notes |
|---|---|
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys (Secret) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key |
| `STRIPE_WEBHOOK_SECRET` | From webhook endpoint below |

**Stripe Dashboard → Developers → Webhooks → Add endpoint:**

`https://myari.io/api/webhooks/stripe`

Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

Optional: create three recurring Products ($49 / $97 / $197) and set `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO`. If omitted, checkout creates prices automatically.

After env vars are set, **Redeploy**. Agent flow: Sign up → pick plan → Stripe Checkout → dashboard unlocked.

## Verify

1. `GET /api/health` → `"status": "ok"` and `providers: { voicemail: true, sms: true, email: true }`
2. Sign in → add contact with phone + email + consent
3. Approve voice asset → send voicemail batch
4. Campaign with SMS/email steps → **Run scheduler** or wait for cron
