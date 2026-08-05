# Vercel production setup

Add these in **Vercel → Project → Settings → Environment Variables**, then **Redeploy**.

## Required (dashboard + auth)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `SUPABASE_STORAGE_BUCKET` | `voice-assets` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk API keys |
| `CLERK_SECRET_KEY` | Clerk API keys |
| `APP_BASE_URL` | `https://voice-reach-crm.vercel.app` |

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
| `RESEND_FROM_EMAIL` | e.g. `noreply@knectcrm.com` or `Voice Reach <noreply@knectcrm.com>` (verified domain) |
| `CAMPAIGN_RUNNER_SECRET` | Random string for cron |

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

**Google Cloud console:** create OAuth client (Web), add redirect URI:

`https://voice-reach-crm.vercel.app/api/integrations/google/callback`

Settings → **Google Calendar** → Connect. Callback/task campaign steps create calendar events when connected.

## Database

Run in Supabase SQL editor:

1. `supabase/schema.sql`
2. `supabase/schema-m3.sql`
3. `supabase/schema-calendar.sql`
4. `supabase/schema-contact-tasks.sql`
5. `supabase/schema-integrations.sql` (Dotloop OAuth tokens)
6. `supabase/schema-lead-engagement.sql` (buyer workflow fields + engagement score)

Create Storage bucket: **`voice-assets`** (private).

## Webhooks

| Provider | URL |
|---|---|
| Slybroadcast | `https://voice-reach-crm.vercel.app/api/webhooks/voice?provider=slybroadcast` |
| Twilio (SMS status) | `https://voice-reach-crm.vercel.app/api/webhooks/voice?provider=twilio` |
| Resend (email events) | `https://voice-reach-crm.vercel.app/api/webhooks/voice?provider=resend` |

## Verify

1. `GET /api/health` → `"status": "ok"` and `providers: { voicemail: true, sms: true, email: true }`
2. Sign in → add contact with phone + email + consent
3. Approve voice asset → send voicemail batch
4. Campaign with SMS/email steps → **Run scheduler** or wait for cron
