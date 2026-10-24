# Pricing correction QA — 2026-10-24

No production changes or real charges. All Stripe objects below are synthetic mocks in test mode; Stripe account/network access is unavailable.

| Check | Result |
|---|---|
| Pricing/billing correction suite | 33/33 passed |
| Full unit suite | Passed (including legacy pricing, annual billing and assistant tests) |
| Security checks | Passed |
| TypeScript | Passed |
| Lint | Passed:0 errors,7 pre-existing warnings |
| Production build | Passed |
| Browser fixture | Passed at1440/1280/768/390 |
| Local production public crawl | 48 routes HTTP200, one H1/canonical; sitemap/robots reachable |

Coverage:

- All six monthly combinations: one base item, quantity1, exact configured price/currency/interval/total and correct Plus entitlement.
- $49/$99/$199 CRM Only; $65/$115/$215 AI-inclusive; exactly $16 difference, no $20 item.
- All three corresponding upgrades/downgrades and repeat cycles: existing item ID replaced, no second subscription, no new trial, explicit confirmation, owner-bound quote/digest, actual mocked invoice preview, same proration timestamp, state revalidation and duplicate claims.
- Old add-on preview/approval API returns410 even when old flags are enabled; old quotes cannot execute.
- Failure/pending/cancellation/foreign-owner/annual/custom/multiple items/duplicate mappings fail safely. Unknown provider outcomes retain the execution claim.
- Subscription/invoice events refresh current Stripe state; Settings reflects AI total or CRM total; unpaid/canceled does not grant Plus.
- Existing monthly/yearly price payloads, trial behavior, period persistence and legacy pricing tests remain passing.
- Public selector switches CRM Only / CRM + AI; CRM annual controls retained. AI comparison contains only Plus. Plan replacement checkbox starts unchecked, no confirm call before explicit approval, exactly one after approval. No horizontal overflow at four widths.

Screenshots in this directory: `crm-only-{width}.png`, `pricing-{width}.png`, `plan-change-{width}.png`. These are synthetic component captures; the actual public architectural hero remains unchanged. During fixture extension the closed allowance panel first had to be expanded to reach its button; a separate premature run lacked build CSS while a build was clearing assets. Both test setup issues were corrected; final responsive tests passed with the completed build.

Not executed: real Stripe test-mode checkout, actual invoices/taxes/discount calculations, hosted portal, signed provider delivery, production migration, live subscription changes, product cleanup or deployment. Required Stripe account acceptance and business approvals are detailed in [the current report](README.md). New AI/public/billing/plan-change rollout flags remain off; this is ready for code review, not approved for production activation.
