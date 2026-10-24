# AI-inclusive pricing launch — staged implementation and billing audit

**Not launched. Not deployed. No production Stripe products/prices, subscriptions, invoices, customers or subscriber records were changed.** Existing monthly/annual pricing remains active in the source until explicit launch gates are approved. Development branch: `feat/ai-operating-assistant`.

## 1. Existing configuration and audit

The existing authoritative CRM catalog is `lib/billing/plans.ts`: Starter $49/mo, Growth $99/mo, Pro $199/mo, Team from $299/mo. Starter has 1,000 contacts/1 user/1,000 emails and PAYG SMS/RVM; Growth has 5,000 contacts/1 user/750 SMS/250 RVM/1,000 emails; Pro has 15,000 contacts/3 users/2,000 SMS/1,000 RVM/5,000 emails. Existing annual configuration uses its separate billing-period/price-ID flow and is retained unchanged.

Founding 100 marketing has a 14-day trial, list-price strike-throughs and static offer wording. Actual production Founding eligibility/counts/Stripe product configuration cannot be verified here. No new offer is assumed to inherit Founding eligibility. Existing checkout, claim ownership checks, webhook signature verification, subscription synchronization, trial pause behavior and Billing portal remain in place.

Confirmed legacy concerns: several CRM limits use saved server settings/engagement counts rather than a single atomic subscription/messaging ledger; generic campaign activation did not distinguish new AI Starter multi-step permissions; existing compound campaign persistence is not an atomic transaction; complete Founding enrollment/seat accounting and portal cancellation/proration policy are not proven by static marketing. These are not evidence that a particular customer's live bill is wrong. New AI entitlements therefore read actual Stripe customer ownership, subscription status/items, price identity, amount/currency/interval/quantity and period, rather than trusting browser/settings plan fields.

The new code adds an activation guard for AI-inclusive Starter multi-step delivery while retaining drafting. AI Pro does not grant Growth/Pro CRM features, extra seats or administrative rights. Existing legacy records/plans are not migrated.

## 2. New catalog and launch configuration

Single source: `lib/billing/ai/catalog.ts`.

| New monthly plan | Amount | CRM capabilities | Included AI |
|---|---:|---|---|
| Starter AI | $65 | Existing Starter | AI Plus |
| Growth AI | $115 | Existing Growth | AI Plus |
| Pro AI | $215 | Existing Pro | AI Plus |
| Optional AI Pro | +$20 | No CRM/seat change | Higher AI allowances |

No new AI yearly amount or post-launch regular price is invented. Existing yearly billing remains available on the legacy catalog. The new pricing path deliberately requires preconfigured exact Stripe prices and has **no inline-product/price fallback**.

`MYARI_AI_LAUNCH_CONFIG` is validated administrative configuration: approved flag, explicit ISO start/end exactly 90 days apart, eligible plans/cohort, all-new-subscriber option, approved continuous-subscription terms and nullable future prices. Implementation date is never used as launch start. [launch-config.example.json](launch-config.example.json) is deliberately disabled/incomplete until reviewed. Existing subscriptions do not qualify for automatic replacement; even canceled subscription history is not treated as a fresh customer. Current Stripe recurring prices remain unchanged after the window; no automatic future increase exists. Post-launch offer and interrupted-subscription grandfathering require business approval.

## 3. Monthly entitlements

| Capability | AI Plus | AI Pro |
|---|---:|---:|
| Accepted delivered AI interactions | 200 | 600 |
| Successfully generated SMS/email drafts | 100 | 350 |
| Newly generated campaign drafts | 5 | 15 |
| Successfully created tasks/reminders | 75 | 250 |
| Successfully created Calendar events | 25 | 100 |
| Completed premium flyers/documents | 5 | 15 |
| Transcription | 30 min | 90 min |
| Sapphire generation allocation | 5 min | 20 min |
| Initiated validated multi-action runs | 10 | 40 |

Limits are per entitled subscriber, never implicit pooled seats. Underlying CRM caps/permissions remain separate. Entitlements are based on one verified active/trialing AI base subscription item; one matching add-on permits AI Pro. Wrong amount/currency/interval, duplicate add-ons, quantity inflation, foreign customer metadata, ambiguous subscriptions, unverified status and payment-failed/paused/canceled states do not grant AI access. Legacy pricing is preserved and never silently reclassified as AI Plus. An explicit development-only beta override exists for synthetic/internal use; it cannot grant production access through browser input.

## 4. Atomic backend accounting

Migration: `supabase/migrations/20261030000000_ai_usage_meter.sql`. Private owner/period/capability accounts and idempotent operation rows support reserved/committed/released units. A row lock serializes reservations; `used + reserved + requested <= server limit` is enforced transactionally. Client roles cannot read/write tables or invoke quota RPCs. Only service-side code passes catalog limits after verifying entitlement. A version-check RPC prevents staged checkout from proceeding before the usage schema is ready. Migration was applied **only to an isolated local PostgreSQL container**, not production.

Reset keys use authoritative Stripe base-item periods. A new period starts with its own account rows; a tier change keeps the same period and existing usage. At 80% the usage UI signals near-limit; at 100% the operation blocks before its service call with reset/upgrade guidance. Pending uncertain operations remain visible as reserved rather than falsely charged/completed. Administrative extra allowance requires server-admin scope, explicit confirmation, idempotency key, reason and audit; it never rewrites billing, actual usage or CRM permissions.

Definitions implemented:

- One submitted assistant interaction is metered once around the bounded reasoning/tool loop; internal calls/retries are not separate subscriber requests. Provider failure without delivered result releases the allowance; partial delivered drafts count one interaction and remain recoverable.
- Successful model-created SMS/email proposals count drafts. Manual edits do not trigger AI generation. Campaign revisions inherit a root ID and do not count as new campaign generation.
- Task/event counters commit after backend confirmation. Checklist assignment reserves the actual number of tasks. Uncertain partial service outcomes hold a reservation for reconciliation rather than blindly retrying or fabricating success.
- The first completed document export counts once per immutable draft root; subsequent downloads/formats preserve access to existing work.
- Transcription uses server-validated PCM frames, rounded up to one second. Browser dictation converts audio to PCM WAV. Client duration headers are ignored. Invalid/unknown-duration input is rejected before a paid operation for entitled accounts.
- A validated multi-action command reserves one workflow allowance when a second distinct prepare operation starts; internal loop iterations do not multiply this count. This is synchronous orchestration, not a claimed background worker.
- Sapphire seconds are configured but **paid generation for new AI-inclusive accounts is held closed** until reliable generated-audio duration/provider metering is accepted. No fabricated duration or substitute voice is used.

Legacy generic AI, Notes/Tasks/Voice Studio writing/Brand Kit/activity endpoints receive an entitlement-aware request wrapper so entitled customers cannot bypass caps through the old UI. Existing verified legacy subscribers retain their existing basic AI path. Background daily briefings keep their existing cache/scheduler behavior rather than charging a subscriber interaction on every refresh. Full legacy provider cost/entry-point coverage still requires staging acceptance before paid launch.

## 5. Stripe checkout and AI Pro

New checkout requires separate billing/entitlement/database approval gates, verified schema and exact configured monthly price. It uses existing Stripe customer mapping and validates ownership, rejects existing subscriptions/open checkout duplication, preserves the existing trial/pause behavior, sets base CRM metadata and uses stable idempotency. No production product is created. Existing live subscriptions are never replaced by this path.

AI Pro uses a real subscription item. The subscriber first requests an invoice/proration preview; a durable ten-minute quote binds subscription items, price, amount and approved proration policy. Only an explicit `CONFIRM_AI_PRO_UPGRADE` can request the update. Current ownership/items/cancellation state are rechecked; duplicate existing add-ons are refused and replaying a successful upgrade cannot add another. Stripe idempotency and `pending_if_incomplete` protect payment-dependent changes. No model tool can call billing.

`MYARI_AI_ADDON_PRORATION` has **no default**; business must approve `none`, `create_prorations` or `always_invoice` after actual Stripe test-mode verification. Downgrade/removal, annual/legacy migration, effective dates, grace/refund rules and portal configuration are not invented. Existing subscribers retain their bill; a fully verified self-service legacy-to-AI migration remains a release blocker. Existing Billing portal functionality is preserved.

## 6. Public website and subscriber UX

The approved architectural hero and luxury Pricing layout remain. A staged server-rendered three-card AI view derives $65/$115/$215 and +$20 from the backend catalog, shows AI Assistant Included, and includes a compact expandable allowance comparison. Growth remains featured. No annual discount, unlimited AI claim, or unverified Founding eligibility is attached to this new view. New checkout explicitly reviews the selected plan and then hands off to verified Stripe; it cannot silently use the old price.

The public switch requires approved launch/cohort/time window, entitlement flag, meter-database acceptance and a separate public verification flag. It is **off**. The Homepage announcement is gated by the same approval checks and describes drafts/preparation rather than autonomous sending. Existing public prices/homepage remain unchanged while gates are off. Both routes are dynamic so an expired window is not frozen into a static marketing build.

Settings Billing/Brand Kit and AI Command Center include backend-sourced AI tier, used/pending/remaining allowances, actual reset date, near/at-limit states and the explicit add-on preview flow. Unknown billing or missing schema shows unavailable, never fabricated subscriber counters. Saved preferences remain in existing versioned Settings.

## 7. Admin economics and cost safeguards

`/dashboard/admin/ai` and its API require server-configured administrative IDs and an explicit authorized reporting cohort. No frontend role can grant access. Each query is scoped to its authorized owner. Cohort subscriber counts become unavailable when verification is incomplete; they are not represented as global totals. Actual usage counters are shown; configured-rate token estimates are labeled with incomplete coverage.

AI Plus $5 / AI Pro $12 are **operational monitoring thresholds**, not customer billing caps. No automatic price increase, overage charge or entitlement cancellation follows from crossing them. Cost hard budgets require a separate approved policy flag. Token usage is recorded by provider/model; absent rates or invoice evidence remain unknown. Recognized AI revenue, provider-billed direct cost, contribution margin and conversion metrics remain unavailable until invoice allocation/reconciliation is connected. No profitability is fabricated. Automatic administrator alert delivery is not implemented; current monitoring is an authenticated reporting surface.

Per-subscriber rate/call/context/concurrency guards, unique operation keys, bounded media, no default expensive image generation, preserved drafts and fail-closed provider errors control abuse. These operational limits require acceptance/disclosure before paid launch and do not redefine the advertised monthly entitlement table.

## 8. Tests and rollout gates

New mocked Stripe tests verify catalog/CRM separation, explicit 90-day eligibility, public flags, subscription item identities/amounts/quantities/owners, trial/payment/cancellation states, billing-period reset keys, quota enforcement, missing schema, duplicate prevention, 80/100% display, checkout and AI Pro item updates/admin scope/audio duration. No actual Stripe test account was reachable under the environment policy, so these are mocked test-mode payload tests, **not live Stripe acceptance**.

Isolated PostgreSQL test: 12 concurrent requests against cap 5 admitted exactly 5; subsequent cap excess blocked; duplicate keys did not double-consume; failed-result release, separate subscribers, variable audio units, expired periods, RLS and client RPC denial passed. No production migration was applied. Assistant security/UI tests and full lint/type/unit/build results are recorded in the companion report and final QA record.

Staged rollout:

1. Internal synthetic testing, all launch flags off (current state).
2. Explicitly allowlisted beta, verified provider/model access, reviewed development/staging migration and recovery testing.
3. New-subscriber offer only after real Stripe test-mode checkout/webhook/invoice/proration/cancellation, entitlement/media/cost/permission acceptance, approved date/cohort/terms and public launch review.
4. Existing-subscriber optional upgrade only after a separate informed migration policy/current-bill comparison/effective-date workflow is verified.

Required business approvals: launch start/end/cohort; continuity/grandfathering terms; post-launch regular pricing (currently **unset**); new AI yearly pricing (unset); add-on proration/payment/failure/downgrade policy; legacy upgrade terms; verified price IDs and product reuse; retention and cost-reporting policy; internal operational rate limits and any separately disclosed hard cost budget; production migration; beta/public rollout.

**Not ready for production pricing activation.** Remaining blockers include actual Stripe/provider credentials/host access, reviewed production migration, Sapphire duration integration, property-photo/media workflows, complete provider-cost reconciliation/admin notifications, legacy migration/downgrade acceptance and signed-in staging/load/security QA. No deployment or production billing action was performed. Disabling the new pricing/entitlement/billing/public flags leaves the old CRM catalog and subscriptions intact; disable Assistant V2 to restore the existing Claude UI.

## Final local QA

See [complete test results and acceptance limits](../ai-operating-assistant/QA.md) and [files changed](FILES-CHANGED.txt). New launch pricing, V2 public access and approved-send flags remain disabled. Review readiness is established locally; production rollout remains blocked by the documented external acceptance and business approvals.

Billing mode is explicit: `MYARI_AI_STRIPE_MODE=test` by default, with actual Stripe price `livemode` verification. Live/public launch additionally requires separate live billing approval. API credentials or proxy placeholders are never used to infer the Stripe mode.
