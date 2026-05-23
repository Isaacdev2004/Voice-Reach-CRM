# VoiceReach Backend Starter

This is the backend starter for the VoiceReach CRM prototype. It uses:

- Next.js App Router route handlers
- Clerk for login/user identity
- Supabase Postgres for contacts, consent records, campaigns, recipients, and audit logs
- Supabase Storage for voice recordings
- Server-side provider adapter for ringless voicemail delivery

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

## 2. Create Supabase tables

Open Supabase SQL Editor and run:

```sql
-- paste contents of supabase/schema.sql
```

Then create a private Supabase Storage bucket named `voice-assets`.

## 3. Configure Clerk

Create a Clerk application and add the keys to `.env.local`.

The API routes use `auth()` from Clerk and treat `userId` as the owner key in Supabase. The service role key is used only server-side and must never be exposed to the browser.

## 4. API routes

### Contacts & compliance (Milestone 2)

| Route | Method | Purpose |
|---|---:|---|
| `/api/contacts` | GET | List contacts (`?q=` server-side search on name, phone, email, source, notes) |
| `/api/contacts` | POST | Create contact with consent record |
| `/api/contacts/[id]` | GET | Get one contact with consent history |
| `/api/contacts/[id]` | PATCH | Update contact; appends new consent record when consent fields sent |
| `/api/contacts/[id]` | DELETE | Delete contact (cascades consent records) |
| `/api/contacts/import` | POST | CSV import for contacts and consent records |
| `/api/compliance/audit` | GET | Live compliance scan (DNC, consent, phone validity) |

### Voice assets

| Route | Method | Purpose |
|---|---:|---|
| `/api/voice-assets` | GET | List voice assets with signed playback URLs |
| `/api/voice-assets/signed-upload` | POST | Create signed upload URL for audio file |
| `/api/voice-assets/approve` | POST | Mark voice asset approved |
| `/api/voice-assets/[id]` | PATCH | Update voice asset title / script |

### Campaigns

| Route | Method | Purpose |
|---|---:|---|
| `/api/campaigns` | GET | List campaigns |
| `/api/campaigns` | POST | Create campaign and recipients |
| `/api/campaigns/builder` | POST | Save template or activate campaign blueprint |
| `/api/campaigns/[campaignId]/send` | POST | Compliance-check and send eligible recipients |

### Activity, settings, analytics, automations

| Route | Method | Purpose |
|---|---:|---|
| `/api/activity` | GET | Activity feed from audit logs |
| `/api/activity` | POST | Acknowledge activity items |
| `/api/settings` | GET / POST | User/workspace settings |
| `/api/analytics` | GET | Analytics snapshot (`?range=7d\|30d\|90d\|all`) |
| `/api/automations` | GET / POST | Automation workflows |

## 5. CSV import format

```csv
firstName,lastName,phone,email,type,source,consent,consentDate,consentSource,proof,dnc,notes
Jane,Doe,407-555-0100,jane@example.com,Past Residential Client,Closed client,Yes,2026-01-01,Client intake,Signed intake,false,Example note
```

## 6. Compliance engine

- `lib/compliance.ts` — `evaluateEligibility()` used before campaign send
- `lib/compliance/scan.ts` — aggregates issues across all contacts
- `GET /api/compliance/audit` — returns live counts (DNC, consent gaps, invalid phones, eligible)
- Contacts UI **Compliance engine** panel runs real scans (not mock data)

## 7. Audit logging

All major actions write to `audit_logs` via `lib/audit.ts`, including:

- `CONTACT_CREATED`, `CONTACT_UPDATED`, `CONTACT_DELETED`
- `CSV_IMPORTED`, `COMPLIANCE_AUDIT_RUN`
- `VOICE_SIGNED_UPLOAD_CREATED`, `VOICE_APPROVED`, `VOICE_ASSET_UPDATED`
- `CAMPAIGN_CREATED`, `CAMPAIGN_ACTIVATED`, `CAMPAIGN_SEND_ATTEMPTED`
- `SETTINGS_SAVED`, `AUTOMATION_SAVED`

View events in the dashboard **Activity Logs** tab (`GET /api/activity`).

## 8. Provider integration

The provider adapter is intentionally conservative. The mock adapter records delivery as `mock_sent`. To connect a real vendor, implement the provider request in `lib/providerAdapter.ts` and keep API keys server-side.

## 9. Compliance reminder

This code is a technical starter, not legal advice. Ringless voicemail, prerecorded voice, and AI voice outreach can trigger TCPA and state telemarketing rules. Do not send cold or automated voice campaigns without documented consent, DNC screening, time-window controls, opt-out handling, and counsel review.
