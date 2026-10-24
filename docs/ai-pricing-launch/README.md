# Corrected AI pricing architecture — review report

**This report supersedes the earlier staged $20 AI Pro add-on design. Nothing was deployed. No live subscriptions, prices, products, invoices, credentials or subscriber records were changed.**

Branch: `fix/ai-pricing-exclusive-plans`. The existing rollout gates remain disabled. The $20 add-on is retired unconditionally, including old saved quotes and direct calls even when its old environment flag is enabled. No Stripe product/price was deleted; existing references require read-only inventory before any later cleanup.

## Monthly price mappings

One base subscription item, quantity one. Prices are USD before applicable Stripe taxes/discounts/proration. AI Plus is included in the AI total, not a second charge.

| CRM tier | CRM Only | Stripe variable | CRM + AI Plus total | Stripe variable |
|---|---:|---|---:|---|
| Starter | $49 | `STRIPE_PRICE_STARTER` | $65 | `STRIPE_PRICE_STARTER_AI_MONTHLY` |
| Growth | $99 | `STRIPE_PRICE_GROWTH` | $115 | `STRIPE_PRICE_GROWTH_AI_MONTHLY` |
| Pro | $199 | `STRIPE_PRICE_PRO` | $215 | `STRIPE_PRICE_PRO_AI_MONTHLY` |

The difference is $16/month for every corresponding tier. `lib/billing/plans.ts` retains the CRM catalog and capabilities; `lib/billing/ai/catalog.ts` defines the AI totals/caps; `lib/billing/ai/choices.ts` validates the relationship, exact distinct configured price IDs, amounts, currency and monthly intervals. Duplicate mapping across choices, retired add-on or annual IDs fails closed. No inline AI products/prices are created.

Existing Founding 100 subscriptions, current discounts and legacy annual prices remain untouched. AI annual and post-launch regular prices remain unconfigured; the original CRM Monthly/Yearly flow remains available. Existing custom or differently priced subscriptions require individual migration review rather than an assumed $16 adjustment.

## Authoritative AI Plus entitlement and caps

`aiEntitlement` is the only AI tier authority. It retrieves the authenticated owner's mapped Stripe customer and unique nonterminal subscription, verifies ownership/status and exact base price mapping, quantity and actual period. Active/trialing AI base plans grant **Plus without any add-on**. CRM Only, failed/unpaid/paused/canceled or ambiguous subscriptions do not gain Plus. An actual price change, not metadata or the browser, controls access.

A historical $20 item never grants a higher tier; an AI base still supplies Plus while the historical reference is flagged for billing review. It is not removed/refunded automatically. Unknown extra items or mixed base prices fail closed. Previously configured Pro-cap constants remain dormant for historical code compatibility; no purchase or entitlement path grants them.

| AI Plus allowance | Per subscriber/month |
|---|---:|
| AI interactions | 200 |
| SMS/email drafts | 100 |
| New campaign drafts | 5 |
| Successfully created tasks/reminders | 75 |
| Successfully created events | 25 |
| Premium documents | 5 |
| Transcription | 30 minutes |
| Sapphire audio | 5 minutes, only where reliable generation metering is supported |
| Validated multi-step workflows | 10 |

Existing atomic usage ledger, idempotency, 80%/100% indications and actual subscription-period resets are unchanged. No per-team pooling or CRM-seat/permission expansion. $5 monitoring is separate from subscriber billing; no surprise overage/add-on charges. Paid Sapphire generation remains closed pending reliable duration acceptance, as documented in the prior assistant audit.

## Checkout and mutually exclusive choices

New AI checkout requires explicit new-subscription confirmation, rollout/database/entitlement gates, exact test/live price validation, approved launch dates/cohort and no prior subscription/open checkout. It creates one line item only. CRM checkout now verifies configured monthly amounts, blocks nonterminal existing subscriptions (including AI), and blocks open checkout sessions. Both authenticated checkout variants use the same Stripe customer-scoped idempotency key so different choices cannot create competing checkout sessions during Stripe's idempotency retention window. Expired checkout recovery requires waiting for key expiry or reviewed support handling; no automatic key reset creates duplicate charges.

No public checkout can buy the retired $20 item. Old `/api/billing/ai/upgrade` returns a discontinued error; old approval quotes cannot execute. Stripe Billing Portal configuration is outside this repository: production acceptance must confirm its allowed products/prices exclude the retired add-on and do not introduce extra base items.

Anonymous legacy checkout cannot prove an existing person's account identity from an email alone. Existing authenticated subscriptions are protected; complete cross-funnel/customer-creation concurrency and anonymous reconciliation still require real Stripe staging acceptance before rollout. The existing cardless trial path returns an existing subscription rather than replacing it. No claim is made that these checks constitute a distributed transaction across every legacy initiation route.

## Explicit corresponding-plan upgrade/downgrade

Settings and Command Center offer **Review CRM + AI** or **Review CRM Only**. They use `/api/billing/ai/plan-change`, never new checkout for an existing subscriber.

1. Authenticate owner and re-read the actual unique subscription/customer.
2. Require one supported monthly base item; block annual/custom/extra-item/pending/scheduled/canceling/payment-problem states.
3. Keep the same Starter/Growth/Pro tier; select its corresponding other choice.
4. Require separately approved `MYARI_AI_PLAN_CHANGE_PRORATION` (no assumed policy) and `MYARI_AI_PLAN_CHANGES_ENABLED` (off by default).
5. Generate an actual Stripe invoice preview, binding subscription/item/version, target price, proration timestamp, currency/amount due and ten-minute expiry.
6. Display old/new recurring totals, ±$16 difference, requested effective time, renewal, invoice amount, consequences and founding eligibility warning. Explicit `CONFIRM_REPLACE_MONTHLY_PLAN` is required.
7. Revalidate snapshot/configuration/eligibility and claim the subscription source version once. Replace `{id: existingItemId, price: targetPrice, quantity:1}` with Stripe idempotency and `pending_if_incomplete`.
8. Preserve subscription identity, trial/billing anchor, discounts and other fields; do not append an item, create a subscription, grant new seats, restart a trial or assume payment success.

Success and pending outcomes are recorded. Concurrent quotes share a source-version claim. Unknown provider outcomes require reconciliation, not blind retry. Successful later round trips are possible without reusing an earlier source-version claim. AI access and billing display are refreshed from actual Stripe state. Switching back to a CRM catalog price does not promise restoration of a historical promotion. No existing subscriber is migrated automatically.

## Webhooks, invoices and billing display

Signed subscription-created/updated/deleted events retrieve current Stripe subscription state instead of trusting an outdated event snapshot. Signed paid/failed invoice events retrieve their referenced subscription and refresh status. Exact base mapping supplies $65/$115/$215 names/totals to Settings; downgrade supplies the corresponding CRM amount. Checkout claim and existing-trial projections use the same monthly mapping. AI authorization never depends on that display projection or stale plan metadata. Unpaid/pending changes do not automatically gain Plus.

Existing webhook signatures and ownership metadata are preserved. Legacy annual/customer/checkout ownership infrastructure remains. Real signature delivery, invoice taxes, discounts, portal policies and event ordering must still pass Stripe account acceptance.

## Public Pricing and usage experience

The approved architectural hero, three cards and Growth emphasis remain. A staged **CRM Only / CRM + AI** selector displays either the original CRM catalog (including its existing annual toggle/Founding terms) or the AI-inclusive monthly catalog. It explains $16 difference and that the displayed AI total includes AI Plus. Only Plus limits are offered; all public $20 add-on promotion and usage upgrade buttons are removed.

The selector/new AI prices remain behind the existing approved public-launch gates. Production still displays the current CRM offer until approval; source changes do not activate new prices. AI Usage and Command Center use actual backend counters and show a base-plan replacement review instead of AI Pro checkout. Homepage AI messaging remains launch-gated.

## Verification and remaining blockers

[Current QA results](CORRECTION-QA.md) and [prior Assistant report](../ai-operating-assistant/README.md).

All six monthly combinations are exercised using synthetic customers and mocked Stripe **test-mode objects**. No real Stripe test account or network access is available here; actual Stripe-hosted checkout/invoices were **not** exercised. No real charges, communications or production writes occurred.

Required before rollout:

- Read-only inventory of real test/live products, subscriptions and historical $20 references; verify all six distinct price IDs without deleting referenced prices.
- Actual test-mode checkout for all six choices, confirmation/invoice/proration and upgrade/downgrade/renewal/trial/failure/cancellation webhooks, discounts/tax, pending payment and concurrent/cross-funnel duplicate prevention.
- Approved plan-change proration/effective timing, grandfathering disclosures, launch start/end/cohort, portal product allowlist and annual AI policy (if introduced later).
- Reviewed usage migration and all prior provider/media/metering acceptance gates; controlled beta, deployment approval and rollback verification.

Rollback: keep public/billing/plan-change flags off; preserve CRM Only/annual and Claude. No live customer needs a rollback or price migration from this local change.
