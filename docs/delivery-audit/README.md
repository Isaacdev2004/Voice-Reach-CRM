# Campaign analytics, delivery accuracy and provider health audit

Date: 2026-10-23. Review branch: `audit/delivery-analytics-health`, based on `audit/campaign-delivery-safety`.

## Result and scope

The repository and execution environment are operational. Code repairs, an isolated Delivery Audit Log, message details, per-channel health, and mocked reconciliation are implemented. **This is ready for code/UI review, not production activation.**

**No subscriber database or provider account records were accessed.** The environment's enforced network policy permits package/GitHub/font destinations but excludes the configured Supabase host and provider API hosts. No authorized staging subscriber identity/URL was available. Provider-level accuracy, current subscriber totals, and historical synchronization timestamps are therefore **UNVERIFIABLE**. There are no real last-successful-sync timestamps to report.

No real SMS, email or voicemail was sent; no real contact was enrolled; no production record, campaign, schedule or content was changed; no migration was applied. New evidence capture and reconciliation are disabled by default. Pushing this review branch does not authorize deployment, migrations, activation or resends.

## Providers and message trace

| Channel | Implementation | Submission | Confirmation | Reconciliation |
| --- | --- | --- | --- | --- |
| SMS | Twilio REST Messages | Provider SID + actual returned queued/accepted/sent state | Native Twilio-signed status callback | Explicit bounded GET of owned stored message references; tested with mocks only |
| Email | Resend REST Emails | Email ID + accepted submission; never assumed delivered | Native Svix HMAC verification on unmodified webhook body, including timestamp tolerance | Explicit bounded GET of owned stored email references; tested with mocks only |
| Ringless voicemail | Slybroadcast/mobile-sphere gateway | Session reference + submitted state | Shared-secret callback and conservative recognized dispositions; ambiguous numeric/completed values ignored | Verified reconciliation API unavailable; no invented endpoint |

Twilio's voicemail adapter explicitly reports unsupported setup; it is not a working ringless voicemail integration. Mock adapters are simulations and never enter live delivery totals. Missing live configuration no longer silently falls back to a successful mock send.

Trace: authorized enrollment → owner-scoped scheduled step/claim → safe rendered message → final outbound authorization → durable new attempt record (when enabled) → provider submission/reference → independently authenticated receipt or explicit status read → append-only event → shared read model → subscriber-scoped reporting. Existing worker `sent` means processed/submitted, not delivered.

See [metric definitions and classifications](METRICS.md) and [rollout/review instructions](REVIEW.md).

## Incorrect calculations discovered and repaired

- Analytics treated `sent`, `mock_sent`, and recipient rollups as delivery success; now only message-correlated provider evidence counts as confirmed delivery.
- Campaign Details included queued/mock recipients in Sent and divided that count by enrolled recipients; now confirmed-sent messages and confirmed-delivery/message-cohort rates use shared definitions. Enrollment counts remain separate.
- Preview Drawer counted event rows and executed runs as message statistics; now it receives shared unique-message counts. Without new evidence it displays unavailable values. Executed sequences are explicitly worker progress, not delivery proof.
- Dashboard Campaigns Sent inferred sending from mutable campaign status; now it counts campaigns with observed provider-confirmed sent events. The recent table no longer uses message volume as a contact count.
- Activity Logs injected seed activity into quiet subscriber accounts; seed injection is removed. New delivery evidence is displayed when available; legacy recipient statuses are labeled unverified and never described as received voicemail.
- Contacts activity exposed provider error details and treated historical engagement as authoritative. It now separates verified delivery events from unverified recorded activity and strips raw metadata/error text. Related-record writes and joined contact/asset names are owner checked.
- Empty channel/funnel rates remain unavailable when no denominator exists. Provider distribution explicitly counts dispatch attempts and does not label them delivered messages.
- Submission records, retries, logical messages and contacts are now distinct. Duplicate receipts have a database uniqueness key; out-of-order queued/sent/open events cannot erase a terminal disposition. Conflicting terminal dispositions without reliable order are unknown, not silently successful.
- Provider IDs and per-message reconciliation evidence are persisted. Page refresh time, a channel's last sync, and webhook arrival time are not substituted for a message's provider delivery timestamp.

## Delivery Audit Log and message drawer

Route: `/dashboard/delivery`, linked from Campaigns and Analytics. Presentation follows the existing ivory, bronze, serif/sans-serif design without changing navigation destinations.

The log supports contact/campaign/step search; campaign, contact, channel, status and UTC date filters; sorting; stable pagination; matching unique-message, attempt and contact counts; loading, empty and safe error states. Tables scroll inside their container on small screens.

Opening a record loads an independently owner-checked detail response with its recorded subject/body, provider reference, step, event timeline, submission/sent/delivery times where known, actual submission/retry history, safe failure guidance, channel health and confirmation availability. The index omits message bodies. Recorded voicemail scripts are **not** represented as the actual audio; no transcript, signed audio URL or recording content is invented/exposed. The drawer supports Escape, focus trapping/restoration, mobile scrolling and existing contact/campaign links. There is no resend action.

## Independent health and synchronization

Each channel has its own configured provider, connection evidence, attempted/successful reconciliation times, latest authenticated webhook, pending attempt count, error state and confirmation capability. Credential presence only establishes configuration. A webhook is not a reconciliation sync. Idle time alone never generates an outage or delayed-sync warning.

- **Not Configured:** required channel configuration is absent.
- **Status Unavailable:** no successful status read establishes connection health. A received webhook is displayed separately.
- **Connected:** the most recent reconciliation attempt succeeded; the actual timestamp is shown. This is a recorded observation, not a continuous connection probe.
- **Connection Error:** the latest explicit reconciliation failed.
- **Sync Delayed:** an explicit reconciliation was rate limited; no age-based outage is guessed.

When separately enabled after approval, the SMS/email **Check provider statuses** action requires confirmation, reads at most five owned pending references sequentially, uses request timeouts, spaces requests, stops on 429, records new evidence, and never sends/retries or overwrites historical statuses. Provider rate/concurrency policy still needs staging verification. Voicemail remains webhook-only with explicit unavailable reconciliation. Empty queues never create false successful connection checks.

## Tests

[Final verification results, logs, changed files and screenshots](RESULTS.md). All required checks passed; the new suite has **26 passing test groups**. Lint has zero errors and eight pre-existing warnings. The production build generated 93 pages.

Final command logs, browser results and screenshots are stored beside this report. Test data is explicitly synthetic. Database, auth and provider boundaries are mocked; these results do **not** certify live provider delivery.

- TypeScript, lint, unit/security/regression scripts, production build and browser checks are run before publishing the review branch.
- New analytics tests cover acceptance versus delivery, failures/unknown outcomes, duplicate/out-of-order/conflicting events, timestamp provenance, retries and denominators, ownership, independent channel outages, UTC cohorts and shared reporting, combined filters and pagination, unsupported receipts and empty evidence.
- New route tests cover owner-isolated list/details, safe failures, signed Twilio callbacks, missing IDs/correlation, native Resend signatures, Slybroadcast auth/unknown dispositions, complaint suppression/replay, durable submission capture, explicit reconciliation gating, shared Analytics/Preview metrics, mocked GET-only reconciliation, rate limits and blocked silent mock fallback.
- Browser QA uses the actual shell/library/delivery components and synthetic APIs at 1440, 1920, 768 and 390 pixels. No browser action connects to a live provider. Account switching, filters, pagination, drawer, keyboard handling, error/empty states and page overflow are checked.

## Remaining blockers and production readiness

1. Review/apply the **new, unapplied** evidence migration only in an authorized isolated staging database first. It adds new tables/constraints/RLS; it does not backfill, delete or modify legacy records. The previous audit's replay/step-run uniqueness migration also remains a separate review item.
2. Verify actual subscriber campaigns/messages and provider records with an explicitly authorized staging owner. Inspect real Twilio/Resend/Slybroadcast payload formats, sender credentials, domains, callback URLs, recording dispositions and native authentication. Slybroadcast's actual disposition mapping is not independently verified.
3. Historical recipient statuses and engagement events cannot prove delivery. They are not silently imported into confirmed metrics. Any proposed reconciliation/backfill of old production data needs separate approval and evidence.
4. Inbound SMS replies are currently contact-level events and cannot reliably identify an outbound campaign message; email reply ingestion is absent. New reply metrics count only explicitly correlated events, and show unavailable when no supported evidence exists. They do not claim to count every subscriber reply. Automatic open/click tracking can reflect privacy proxies or security scanners; it is not proof of human engagement.
5. The existing email unsubscribe workflow and channel-specific consent/legal evidence remain prior release blockers. Complaint suppression is owner scoped and replay safe; it is not a complete email unsubscribe implementation.
6. The append-only delivery event is durable and idempotent. Its mirror into legacy engagement scoring/automation is guarded against duplicate execution but is not a transactional outbox: a process failure between event commit and mirror completion can leave downstream activity incomplete. Do not automatically replay those automation effects; stage/review an outbox design before relying on exactly-once downstream workflows. Reconciliation appends reporting evidence without replaying automation effects.
7. Provider acceptance/timeouts without a reference remain unknown/pending. Exactly-once provider delivery is not guaranteed by application claims; reconcile ambiguous outcomes before any explicitly authorized resend. Preflight consent/eligibility blocks remain in campaign blocked reports and are not fabricated provider attempts.
8. New attempt records store authorized message text in service-role-only tables. Review retention/access policies before enabling capture. A consistent multi-table snapshot, large-tenant performance/index usage and provider account-wide concurrency/rate limits require staging validation. Current owner-scoped reads paginate all evidence and reject count changes rather than silently truncate.
9. Real last sync for SMS/email/voicemail: **unavailable/unverified**. No page-load timestamps or synthetic test timestamps are presented as live observations in this report.

Approval is required for staging migration/configuration, production rollout, any historical data repair, automation/outbox changes, and any resend. No production deployment is authorized by this audit.
