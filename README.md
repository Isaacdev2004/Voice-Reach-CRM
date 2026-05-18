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

## 2. Create Supabase tables

Open Supabase SQL Editor and run:

```sql
-- paste contents of supabase/schema.sql
```

Then create a private Supabase Storage bucket named `voice-assets`.

## 3. Configure Clerk

Create a Clerk application and add the keys to `.env.local`.

The current API routes use `auth()` from Clerk and treat `userId` as the owner key in Supabase. The service role key is used only server-side and must never be exposed to the browser.

## 4. API routes included

| Route | Method | Purpose |
|---|---:|---|
| `/api/contacts` | GET | List current user's contacts |
| `/api/contacts` | POST | Create one contact with consent record |
| `/api/contacts/import` | POST | CSV import for contacts and consent records |
| `/api/voice-assets/signed-upload` | POST | Create signed upload URL for audio file |
| `/api/voice-assets/approve` | POST | Mark voice asset approved |
| `/api/campaigns` | POST | Create campaign and selected recipients |
| `/api/campaigns/[campaignId]/send` | POST | Compliance-check and send eligible recipients through provider adapter |

## 5. CSV import format

```csv
firstName,lastName,phone,email,type,source,consent,consentDate,consentSource,proof,dnc,notes
Jane,Doe,407-555-0100,jane@example.com,Past Residential Client,Closed client,Yes,2026-01-01,Client intake,Signed intake,false,Example note
```

## 6. Provider integration

The provider adapter is intentionally conservative. The mock adapter records delivery as `mock_sent`. To connect a real vendor, implement the provider request in `lib/providerAdapter.ts` and keep API keys server-side.

## 7. Compliance reminder

This code is a technical starter, not legal advice. Ringless voicemail, prerecorded voice, and AI voice outreach can trigger TCPA and state telemarketing rules. Do not send cold or automated voice campaigns without documented consent, DNC screening, time-window controls, opt-out handling, and counsel review.
