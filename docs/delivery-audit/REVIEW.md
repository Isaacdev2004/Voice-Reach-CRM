# Review and isolated staging instructions

## Local review

1. Review this branch against `audit/campaign-delivery-safety`, which contains the preceding campaign safety audit. Neither branch should be merged or deployed without the appropriate review.
2. Read `README.md`, `METRICS.md`, changed files, test logs and fixture screenshots. Fixture names, timestamps, counts and messages are synthetic and are not subscriber observations.
3. Run `npm run test:delivery`, `npm run test:unit`, `npm run test:security`, `npm run test:regressions`, `npm run lint`, `npx tsc --noEmit` and `npm run build`.
4. Browser checks require installed Chromium/Playwright/esbuild and compiled `.next/static/css`: `npm run test:delivery-browser`. Optional `CONTACTS_ICON_FONT` points to an existing Material Symbols font for faithful offline screenshots. Existing Campaigns browser checks remain `npm run test:campaign-library-browser`.

## Explicitly approved isolated staging only

- Supply an authorized non-production URL and subscriber owner identity, permitted network access, isolated database credentials and provider sandbox/test configuration. Never point this procedure at production records.
- Review `supabase/migrations/20261023010000_delivery_evidence.sql` before applying it to staging. It creates new service-role-only tables with RLS and event/reference uniqueness; no historical backfill or destructive cleanup. Validate retention/access/index policies and the previous audit's unapplied uniqueness migration independently.
- Keep `ALLOW_LIVE_OUTBOUND` off. New evidence capture requires `DELIVERY_EVIDENCE_ENABLED=true`, which defaults off. When enabled, a live send is blocked if its initial evidence record cannot be saved. Do not enable capture on an unmigrated live deployment.
- New Twilio SMS submissions attach `${APP_BASE_URL}/api/webhooks/delivery/twilio` when evidence is enabled. Validate native signatures using the exact externally configured URL. Do not redirect through an untrusted host.
- Configure Resend to `/api/webhooks/delivery/resend` and set the native `RESEND_WEBHOOK_SECRET` through the secret manager; do not paste it into logs or repository files. Shared voice secrets do not replace native Resend signature verification on the new path.
- Slybroadcast defaults to `/api/webhooks/delivery/slybroadcast` when evidence is enabled, or uses the explicitly configured disposition URL. It requires `VOICE_WEBHOOK_SECRET`. Review any existing override and the actual provider disposition specification. The legacy voice route delegates to the evidence processor when enabled; old uncorrelated messages are not silently trusted.
- Use synthetic contacts and mocked providers for all sending tests. Verify no provider POST is made and no real contact is enrolled. Test real callback authenticity/status reads only through expressly authorized provider sandbox facilities without sending.
- Open `/dashboard/delivery` via Campaigns or Analytics. Verify all filters, sorting, pagination, summary totals, contact/campaign links and keyboard/mobile drawer behavior. A refresh reads stored evidence; it is not a provider sync.
- Optional manual provider status checks require a **separate** `ALLOW_DELIVERY_RECONCILIATION=true` approval/configuration. UI actions explicitly confirm before reading. The authenticated POST `/api/delivery/reconcile` requires `{ "channel": "sms" or "email", "confirmReadOnly": true }`; it reads at most five owned references, records new evidence, and never resends. Voicemail reconciliation is explicitly unavailable. Do not invoke against production during review.
- Verify native provider IDs, missing/early callbacks, duplicate callbacks, out-of-order/conflicting receipts, 429/timeouts, independent channel errors, foreign-user references and missing receipts. Confirm real successful/attempted sync timestamps and actual callback timestamps without substituting page-load time.
- Cross-check identical UTC attempt cohorts across Analytics, Campaign Details, Preview and Delivery Audit Log, accounting for all-time versus 30-day views. Do not compare recipient enrollment counts to message attempt counts.
- Stage the legacy engagement/automation mirror failure case before release. Delivery event commit and downstream automation effects are not one transaction. Do not automatically replay workflow effects or claim exactly-once downstream execution.

## Approval boundaries

Publishing a review branch authorizes no database changes or provider actions. Production deployment, enabling evidence capture, enabling reconciliation, historical record repairs, callback configuration, automation/outbox changes, active campaign changes and resends require explicit approval. This task made none of those production changes.
