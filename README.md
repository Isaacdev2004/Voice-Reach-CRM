# VoiceReach — Luxury AI-Powered Relationship Automation Platform

Premium SaaS for relationship-first agents: CRM + ringless voicemail + multi-channel sequences + AI assist + partner workspaces, all in one warm, calm dashboard.

## Stack

- Next.js App Router (route handlers, RSC)
- Clerk — identity
- Supabase — Postgres + Storage
- Provider adapter layer (Mock / Slybroadcast / Twilio, ready for DropCowboy, Telnyx, Plivo)
- Zod — request validation
- Standardized JSON envelope `{ success: true, data }` / `{ success: false, error }`

## 1. Install

```bash
npm install
cp .env.example .env.local
npm run dev
```

For Windows / large projects:

```bash
npm run dev:webpack
```

## 2. Supabase schema

Open the Supabase SQL editor and run:

1. `supabase/schema.sql` (Milestone 1+2: contacts, consent, voice assets, campaigns, recipients, audit logs)
2. `supabase/schema-m3.sql` (Milestone 3: campaign steps, step runs, engagement events, automation rules/runs, partner workspaces, partner invitations, partner shared assets, provider webhook log)

Create a private Supabase Storage bucket named `voice-assets`.

## 3. Configure Clerk

Create a Clerk application and add the keys to `.env.local`. Server routes use `auth()` from Clerk and treat `userId` as the `owner_id` everywhere.

## 4. API surface

All routes return the standard envelope:

```json
{ "success": true, "data": { /* payload */ } }
{ "success": false, "error": "Human readable", "code": "optional_code" }
```

Use `safeFetch<T>("/api/...", init)` from `lib/api-response.ts` on the client — it never throws on `Unexpected end of JSON input` and always gives you a structured envelope.

### CRM & compliance

| Route | Method | Purpose |
|---|---:|---|
| `/api/contacts` | GET / POST | List (with `?q=` server search) / create |
| `/api/contacts/[id]` | GET / PATCH / DELETE | Read / update / delete |
| `/api/contacts/import` | POST | CSV import |
| `/api/compliance/audit` | GET | Live compliance scan |

### Voice assets

| Route | Method | Purpose |
|---|---:|---|
| `/api/voice-assets` | GET | List with signed playback URLs |
| `/api/voice-assets/signed-upload` | POST | Signed upload URL |
| `/api/voice-assets/approve` | POST | Mark approved |
| `/api/voice-assets/[id]` | PATCH | Update title / script |

### Campaign engine (M3)

| Route | Method | Purpose |
|---|---:|---|
| `/api/campaigns` | GET / POST | List / create |
| `/api/campaigns/builder` | POST | Save template or activate blueprint (persists steps, schedules runs) |
| `/api/campaigns/[campaignId]/send` | POST | Compliance-check then send eligible recipients via provider |
| `/api/campaigns/runner` | GET / POST | Execute due step runs. Provide `x-cron-secret: $CAMPAIGN_RUNNER_SECRET` for cross-tenant cron, or sign in to run for your workspace |

### Automation engine (M3)

| Route | Method | Purpose |
|---|---:|---|
| `/api/automations` | GET / POST | Visual workflow CRUD (legacy nodes) |
| `/api/automations/rules` | GET / POST / DELETE | Trigger-rule CRUD (event → action) |

Triggers: `contact_added`, `voicemail_listened`, `email_opened`, `sms_replied`, `callback_received`, `tag_added`, `lead_inactive`, `engagement_score`, `manual`.

Actions: `send_sms`, `send_email`, `notify_user`, `assign_task`, `start_campaign`, `trigger_ai_follow_up`, `add_tag`.

### Engagement tracking (M3)

| Route | Method | Purpose |
|---|---:|---|
| `/api/engagement` | GET | Engagement events + score for a contact / campaign |
| `/api/engagement` | POST | Record an event (delivered, listened, clicked, replied, callback, opt_out, …) |

### Partner workspaces (M3)

| Route | Method | Purpose |
|---|---:|---|
| `/api/partners` | GET / POST / DELETE | Workspace CRUD |
| `/api/partners/invitations` | POST / PATCH | Invite collaborator / change status |
| `/api/partners/shared-assets` | POST / PATCH | Share asset / approve-reject |

### AI infrastructure (M3)

| Route | Method | Purpose |
|---|---:|---|
| `/api/ai/generate` | POST | Generate copy for one of 7 tasks: email, SMS, voicemail script, follow-up, note summary, next-best-action, campaign idea |

Currently uses on-brand template generators. Drop an OpenAI/Claude/ElevenLabs/Tavus key in `.env.local` and replace the body of `lib/ai/generate.ts` to enable live generation.

### Provider webhook (M3)

| Route | Method | Purpose |
|---|---:|---|
| `/api/webhooks/voice?provider=slybroadcast|twilio|mock` | POST | Receive delivery events, record engagement, update recipient status |

### Other

| Route | Method | Purpose |
|---|---:|---|
| `/api/activity` | GET / POST | Activity feed / acknowledge |
| `/api/settings` | GET / POST | Workspace settings |
| `/api/analytics` | GET | KPIs + engagement summary (`?range=7d|30d|90d|all`) |

## 5. Provider adapter layer

`lib/providers/` defines a clean interface (`ProviderAdapter`) and includes adapters for:

- **mock** — local development, always returns `mock_sent`
- **slybroadcast** — ringless voicemail (set `SLYBROADCAST_USERNAME`, `SLYBROADCAST_PASSWORD`, `SLYBROADCAST_CALLER_ID`)
- **twilio** — SMS (set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`); voicemail requires a TwiML bin (use Slybroadcast/DropCowboy for true ringless)

Add new providers by implementing the `ProviderAdapter` interface and registering it in `lib/providers/registry.ts`. The campaign engine picks a provider per channel automatically; webhook handler normalizes events.

## 6. Campaign execution

Campaigns now persist real `campaign_steps` and schedule `campaign_step_runs`. Step types: `voicemail`, `sms`, `email`, `avatar_video`, `task`, `callback`, `wait`. Each run is delayed by step `delay_minutes`. The runner picks scheduled runs whose `scheduled_at <= now()` and dispatches them.

**Local dev:** sign in and `POST /api/campaigns/runner` to fire your queue.

**Production:** the bundled `vercel.json` registers a Vercel Cron hitting `/api/campaigns/runner` every minute. For other providers, hit the same endpoint with `x-cron-secret: $CAMPAIGN_RUNNER_SECRET`.

### Blocked-recipient reporting

Every campaign has a dedicated detail page at `/dashboard/campaigns/[campaignId]` that shows:

- Recipient counts (total / eligible / blocked / sent / failed) and delivery rate
- A **blocked recipient report** that lists every contact filtered out by compliance (DNC, missing consent, invalid phone, quiet-hours, etc.) with the exact reason
- Step-run status (scheduled / sent / failed / blocked / skipped)
- Live engagement timeline for the campaign

### Smoke test

```bash
npm run dev               # in one terminal
npm run smoke             # in another — checks all 13 API endpoints return JSON envelopes
```

Pass `AUTH_COOKIE="__session=…"` to exercise authenticated GETs against staging.

## 7. AI assistant

`AiAssistantProvider` wraps the dashboard. The floating "AI assist" button opens a luxury sidebar with 7 task generators. Per-contact "AI follow-up" launcher is wired in the relationship profile.

`lib/ai/generate.ts` is the seam. Connect any LLM there — the API + UI shell is production-ready.

## 8. Engagement & relationship timeline

Every send dispatch, webhook event, and automation action writes to `engagement_events` with a weighted score. The relationship profile shows a live timeline + score, replacing the demo data.

Score weights (see `lib/engagement/record.ts`):

- `delivered` +1, `opened` +2, `listened` +4, `clicked` +5
- `replied` +8, `callback` +12
- `opt_out` -10, `blocked` -5

## 9. Partner workspaces

Each `partner_workspace` has invitations (viewer / collaborator / approver) and shared assets (campaign / voice asset / script / contact list / note) with approval workflow. Built for lender co-branding, co-agents, vendors, and team members.

## 10. CSV import format

```csv
firstName,lastName,phone,email,type,source,consent,consentDate,consentSource,proof,dnc,notes
Jane,Doe,407-555-0100,jane@example.com,Past Residential Client,Closed client,Yes,2026-01-01,Client intake,Signed intake,false,Example note
```

## 11. Audit logging

All major actions write to `audit_logs` via `lib/audit.ts`:

- Contacts/consent: `CONTACT_CREATED`, `CONTACT_UPDATED`, `CONTACT_DELETED`, `CSV_IMPORTED`, `COMPLIANCE_AUDIT_RUN`
- Voice: `VOICE_SIGNED_UPLOAD_CREATED`, `VOICE_APPROVED`, `VOICE_ASSET_UPDATED`
- Campaigns: `CAMPAIGN_CREATED`, `CAMPAIGN_TEMPLATE_SAVED`, `CAMPAIGN_ACTIVATED`, `CAMPAIGN_SEND_ATTEMPTED`, `CAMPAIGN_RUNNER_TICK`
- Automation: `AUTOMATION_SAVED`, `AUTOMATION_RULE_CREATED`, `AUTOMATION_RULE_UPDATED`, `AUTOMATION_RULE_DELETED`, `AUTOMATION_TRIGGERED`
- AI: `AI_GENERATED`
- Partners: `PARTNER_CREATED`, `PARTNER_UPDATED`, `PARTNER_INVITED`, `PARTNER_INVITE_ACCEPTED/REVOKED/EXPIRED`, `PARTNER_ASSET_SHARED/APPROVED/REJECTED`
- Settings: `SETTINGS_SAVED`

## 12. Environment variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=voice-assets

# Campaign runner (set when wiring a cron)
CAMPAIGN_RUNNER_SECRET=

# Providers (optional — falls back to mock)
VOICE_PROVIDER=slybroadcast # or twilio / mock
VOICE_PROVIDER_FROM_NUMBER=+15555550000
SLYBROADCAST_USERNAME=
SLYBROADCAST_PASSWORD=
SLYBROADCAST_CALLER_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# AI (optional — falls back to template generator)
OPENAI_API_KEY=
```

## 13. Compliance reminder

This code is a technical starter, not legal advice. Ringless voicemail, prerecorded voice, and AI voice outreach can trigger TCPA and state telemarketing rules. Do not send cold or automated voice campaigns without documented consent, DNC screening, time-window controls, opt-out handling, and counsel review.
