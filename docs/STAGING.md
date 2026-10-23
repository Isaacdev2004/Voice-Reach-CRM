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

## Calendar workspace and unified contact activity

Review `docs/calendar-premium/README.md` for the Calendar/Phase 18 setup, isolated QA commands, Google OAuth redirect/scopes/encryption, read-only Apple feeds, and disabled-by-default booking links. Apply `20261023020000_calendar_workspace.sql` in a test database first. Verify actual preference CAS and concurrent booking locks there; local mocked tests do not establish PostgreSQL or live-provider verification. Keep live outbound off. No production rollout is authorized by this implementation.

### Notes & Strategy workspace

Review `docs/notes-premium/README.md` before enabling the Notes workspace. Apply `supabase/migrations/20261023030000_notes_workspace.sql` only to isolated staging first. It depends on the existing Notes/Contacts/Tasks schemas and adds service-role-only revision saves, version history, and source-note task deduplication. Verify legacy quick-note/contact-note routes, all tenant boundaries, two-client stale writes, restore/delete, and optional calendar reminders. Summary generation requires authorized Anthropic configuration; uploaded-audio transcription requires authorized OpenAI configuration. Use synthetic notes/audio and explicit consent attestations; never record real calls or trigger live outbound during QA. Production rollout remains subject to approval.
