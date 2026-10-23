# Approved luxury Pricing and Phase 16

## Result

`/pricing` follows the approved composition: a full-width 300px architectural hero, exact headline and supporting wording, three aligned plan cards, bronze Growth treatment, shared benefits, one gated playbook banner, collapsed comparison, a needs-based chooser and concise FAQ. The redundant hero/footer trial buttons and repeated per-card playbook links are removed. Header and card trial actions remain.

The hero is a newly generated architectural image commissioned for this implementation, optimized as `public/brand/marketing/pricing-olive-office.webp`; it is not a stock photograph with an asserted third-party license. The original generated asset remains in the execution workspace. It depicts olive greenery, oak, travertine and natural light without a fabricated product screen. No authorized playbook cover asset was available, so the banner uses a book icon and the existing `/playbook` lead-capture flow.

## Verified pricing and annual implementation

| Plan | Monthly | Yearly, charged annually | Standard monthly comparison |
| --- | ---: | ---: | ---: |
| Starter | $49 | $490 | $79 |
| Growth | $99 | $990 | $149 |
| Pro | $199 | $1,990 | $325 |

Prices come from `PLAN_OPTIONS`, standard comparisons from `FOUNDING_100`, and the annual amount is the previously advertised ten-month-price rule, now centralized in `billing-period.ts` and connected to Stripe. The supplied preview's Growth comparison differs from the repository ($179 versus $149); the verified repository value is preserved. Founding eligibility wording remains conditional; no scarcity deadline or availability count is invented. Annual equivalent prices and savings relative to twelve monthly payments are derived from these amounts.

Previously Yearly changed only the display; trial creation and checkout always selected monthly. Now the selected period travels in the signup URL, pending intent, authenticated trial request, Stripe line items and subscription metadata. Missing period defaults to monthly for existing callers. Clerk authentication is preserved; only the plan-intent handoff reads the additional query value. `/checkout` also retains the selected period.

Existing monthly Stripe price mappings are unchanged. Optional yearly mappings are `STRIPE_PRICE_STARTER_YEARLY`, `STRIPE_PRICE_GROWTH_YEARLY`, `STRIPE_PRICE_PRO_YEARLY`, and `STRIPE_PRICE_TEAM_YEARLY`. A configured yearly price must be active, USD, annual with interval_count 1, and match the advertised amount; otherwise creation fails safely. Without a configured yearly ID, the existing price-data workflow creates a yearly recurring USD amount. Subscription price data now correctly references a Stripe product rather than using unsupported nested product_data. Trial and product creation have idempotency keys. Existing subscriptions are returned without replacement or billing-period changes.

Account settings and sidebar read actual USD billed amounts/periods from the authenticated customer's verified Stripe subscription. Customer owner checks remain in place. Settings writes cannot grant or change billing entitlements. No database migration is required.

## Comparison, recommendations and factual corrections

Comparison details use plan configuration and capability definitions for contact limits, campaigns, SMS, voicemail, email, team access, onboarding and supported integrations. AI descriptions explicitly depend on provider configuration and account limits. Provider-dependent analytics are described without promised results.

The chooser recommends the smallest self-service plan that covers entered contacts, user seats and monthly SMS without overages. Above those included limits it recommends a Team discussion rather than inventing a quote. It explains its criteria and asks visitors to review email and voicemail separately. It makes no performance or savings prediction.

The audit found that `assertCanSendChannel` blocks Growth/Pro at included SMS/RVM limits, although previous entitlement copy promised automatic overages. Updated descriptions and FAQ now explain upgrading or waiting for the next month. Sending enforcement was not changed. Annual payment does not turn monthly messaging allowances into yearly pools. Trial safety caps remain from `FOUNDING_100`.

## Validation

- 28 public responsive render/interaction checks at 1440, 1280, 768 and 390px, followed by focused Pricing checks after final refinements.
- All three desktop prices and trial CTAs visible before 900px; no horizontal overflow.
- Actual MyARI serif/sans fonts and icon font used in local visual captures.
- Monthly/yearly amounts, period-bearing signup links, collapsed comparison, chooser and comparison navigation checked.
- Isolated billing tests exercise actual service code with mocked Stripe: yearly/monthly amounts and intervals, price IDs, mismatched interval rejection, metadata, cardless trial pause, duplicate-submission idempotency keys, existing-subscription protection, pending intent persistence, recommendation boundaries and owner-isolated annual billing displays.
- Full unit suite, security checks, lint, typecheck and production build are required before merge. Lint has seven existing warnings and no errors.
- No charges, live signup records, notifications, credentials or existing subscriptions modified during testing. No live/test-mode external Stripe transactions were created; provider payloads are validated by mocked-service tests and TypeScript.

Before/after captures: [desktop before](approved-pricing/before-pricing-1440.webp), [desktop after](approved-pricing/after-pricing-1440.webp), [laptop](approved-pricing/after-pricing-1280.webp), [tablet](approved-pricing/after-pricing-768.webp), [mobile](approved-pricing/after-pricing-390.webp).

## Files and deployment

Main changes: Pricing route; LandingPricing; new PricingDetails and pricing-guidance; public-only CSS and hero; billing-period, pending-plan and activation helpers; Stripe price selection, checkout and trial services/routes; read-only billing verification/settings displays; focused test scripts and release documentation. Authentication provider configuration, monthly Stripe IDs, customer records and subscription entitlements are preserved.

Deployment uses the existing PR, CI and Vercel workflow only after critical checks pass. Read-only production QA verifies the new hero, actual catalog prices, Yearly amounts and signup query values on desktop/mobile. It records the pre-existing mobile hosted sign-in overflow separately from marketing-page failures and fixes artifact filenames so screenshots can upload.

Remaining limits: real payment collection, external SSO completion and live subscriber changes are deliberately untested. Existing subscribers are not silently switched to annual billing. Provider configuration is not altered automatically; incorrect configured annual IDs are rejected rather than charged. Production verification results are available in the Public production QA workflow for the merged commit.
