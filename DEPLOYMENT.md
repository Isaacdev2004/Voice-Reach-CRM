# Vercel production setup

The dashboard shows errors when Supabase credentials are missing from the Vercel deployment. Add these in **Vercel → Project → Settings → Environment Variables**, then **Redeploy**.

## Required (fixes dashboard errors)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (server only — never expose client-side) |
| `SUPABASE_STORAGE_BUCKET` | `voice-assets` (create bucket in Supabase Storage first) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API Keys |
| `CLERK_SECRET_KEY` | Clerk → API Keys |
| `APP_BASE_URL` | `https://voice-reach-crm.vercel.app` |

## Clerk redirect URLs (Clerk dashboard)

- Sign-in: `/sign-in`
- Sign-up: `/sign-up`
- After sign-in redirect: `/dashboard`

## Database

Run in Supabase SQL editor (in order):

1. `supabase/schema.sql`
2. `supabase/schema-m3.sql`

## After env vars are saved

Redeploy from Vercel (Deployments → … → Redeploy). Verify at `/api/health` — should return `"status": "ok"`.

## Scalability

Each signup gets an isolated workspace (`owner_id`). Clerk handles unlimited users; Supabase and Vercel scale with plan tier. Provider rate limits (Slybroadcast/Twilio) govern send volume per account.
