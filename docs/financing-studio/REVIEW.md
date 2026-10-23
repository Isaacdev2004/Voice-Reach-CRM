# Financing & Closing Studio review

Branch: `feature/financing-closing-studio`. Existing route: `/dashboard/mortgage`.

## Implemented

- Sidebar and quick navigation say **Financing & Closing**. The existing route and mortgage section anchors remain valid. MyARI logo/tagline are unchanged.
- Exact headline **Clarity behind every number.** and subheading **Explore financing scenarios and guide clients with greater confidence.** preserved. New original generated residential interior hero; no provider imagery/branding copied.
- Six sections: Mortgage Calculator, Seller Net Sheet, Buyer Estimate, Compare Offers, Partners, Resources. Refinance is under Mortgage; seller-to-net under Seller Net Sheet; fee calculator under Resources.
- Existing mortgage inputs, scenario actions, first-month principal/interest donut, market history/time ranges, benchmark application, educational links and configured mortgage-partner destination remain available. Market information sits beside loan tools. Added cents precision, safe malformed-response handling, timeout, accessible input labels and explicit illustrative-rate/PMI/ARM assumptions. Canceling a benchmark confirmation now leaves both rate and term unchanged.
- Seller net, seller-to-net, buyer cash to close, up-to-five offer comparisons, refinance payment/cost/break-even and manual fee totals share a validated calculation engine. Browser preview, PDF and image reports use that engine. Server saves independently recalculate totals.
- No broker compensation is assumed: percentage and flat dollar inputs start at zero. Fees start at zero and are excluded until entered. Report creation requires explicit review of inputs/exclusions. No current property valuation, tax record, official title premium or county schedule is fabricated.
- Fee provenance: subscriber-entered, estimate, published government fee or authorized provider quote. Government/provider inputs require a reference and effective date, but are still subscriber-supplied assertions, not independently verified integration results. Location is recorded in assumptions; changing county/state does not silently invent fee rules.
- Separate lender/title records support name, contact, email/phone/address, website/logo reference, areas/counties, licensing, quote reference, notes, preferred/default and branding permission. Only one default per subscriber/type, enforced atomically. Existing `/dashboard/partners` collaboration workspaces are preserved and not repurposed as title records.
- Owner-scoped client search supports name, email and formatted phone. Existing contact `property_address` is selectable independently from report client; manually editing it clears its saved-property association. Missing preferences are not invented. Saved budget/area are identified as preferences, not a verified price. Current schema does not contain a verified tax/property-value or saved financing-preference data source.
- Draft assumptions/context persist in an owner-keyed browser session across tabs and return navigation. Mortgage inputs survive section changes. Reports save immutable calculation/branding/client/partner snapshots, engine version and an owner-scoped contact activity event. Duplicate retries with the same report key do not create duplicate timeline entries.
- Existing contact profile, Property Finder and Calendar creation routes retain client context. Campaign navigation opens the existing library without unsupported query parameters or enrollment. Existing contact tasks support intentional follow-up creation. Existing AI assistant can prepare an email/SMS or an explanatory draft from reviewed calculator output. No AI output enters the calculation engine. Nothing sends or enrolls automatically.
- Original paginated MyARI PDF export and SVG image export run locally, with itemized totals, sources/dates, address/county, transaction/closing/preparation dates, assumptions, realtor information and selected partner details. Authorized logos/headshots appear in the browser preview when available; the downloadable PDF/SVG are text-based original MyARI layouts and do **not** embed external photos/logos. No proprietary provider disclosure is reproduced.

## Database setup — not applied to production

Review `supabase/migrations/20261024000000_financing_studio.sql`. It adds only `financing_partners`, `financing_reports`, indexes and two server-only transaction functions. It does not alter existing mortgage/contact schemas or modify live records.

Tables have RLS and no browser/anonymous grants; only server `service_role` accesses them after Clerk `requireUserId()`. Queries filter `owner_id`. Transactions validate and lock related owned records, prevent cross-owner partner edits and ensure one preferred partner per type. Existing saved report snapshots survive partner deletion.

Apply through the project's migration process to an isolated Supabase staging project after backup/review. Keep outbound messaging off. Configure the staging deployment with staging Clerk/Supabase credentials; never substitute production credentials for these tests. Verify owner A/B in staging and the unified contact timeline before release approval. If storage is unavailable the UI shows an error, with calculations and local exports still usable.

## Title integration audit and options

Repository audit found no authorized title-premium/settlement integration. `lib/financing/providers.ts` supplies an inactive typed adapter contract (location, transaction, price, loan amount, quote ID, dates and sourced fee lines). No outbound title request is enabled and no credential is exposed to the browser.

A selected title company can provide an authorized quote or licensed schedule for manual entry now. For a future live integration, obtain written vendor confirmation of an available API/program, agreement/rights to display and export charges/branding, credentials, supported jurisdictions/products, quote expiration and update rules, sandbox access and test fixtures. First American IgniteRE access is not itself evidence of public API rights. No claim is made that its API is available to this subscriber, and its proprietary calculators have not been scraped. Government charges require current jurisdiction-specific published schedules and professional validation.

The additional IgniteRE screenshot and Seller Net Sheet PDF mentioned in the text were not included with this turn. The implementation follows the detailed functional requirements and supplied MyARI Mortgage preview; comparison against those two additional documents remains pending.

## Compliance review before release

Estimates identify assumptions and omit guarantees. Broker compensation is editable/negotiable. Rates are benchmarks/manual assumptions, not offers, APRs, rate locks or loan approvals. ARM comparison totals assume the initial rate remains fixed; they are not an adjustable-rate forecast. PMI uses the existing illustrative 0.6% annual assumption. Refinance break-even is simple closing costs divided by payment savings, excludes escrow/PMI, and is not a full economic analysis. Seller-to-net holds fees fixed and requires re-quoting price-dependent fees at the resulting price. Buyer negative cash-to-close is a surplus estimate, not guaranteed refundable credit.

Subscribers may add reviewed disclosures/NMLS/licensing text and must confirm partner branding permission. Counsel/compliance must review RESPA Section 8/referral or co-marketing arrangements, state title insurance/anti-rebate rules, mortgage advertising/TILA/Regulation Z triggers, fair housing/real estate advertising, licensing/NMLS and brokerage disclosure requirements for the actual jurisdictions and report content. Automated checks do not establish legal compliance. No provider endorsement, exclusive partner requirement or legally compliant referral arrangement is asserted.

## Validation and review evidence

See `browser-results.json`, `mortgage-{1440,1920,768,390}.png`, `seller-{1440,1920,768,390}.png` and synthetic sample PDF exports in this directory. These use synthetic clients only, not subscriber records.

- `npm run test:financing`: independent arithmetic/rounding, 150 reverse-price reconciliations, buyer deposits/credits, 5 offers, refinance/zero-rate/payment break-even, fees/provenance, invalid inputs, report totals/escaping/pagination, partner validation, client search/navigation and mortgage comparisons; API authentication/tenant checks and outage handling.
- `PGLITE_MODULE=/path/to/@electric-sql/pglite npm run test:financing-db`: actual isolated embedded PostgreSQL migration/function execution; default uniqueness, partner editing, report retry idempotency, timeline insert, foreign association rejection, browser-role access denial. PGlite is a temporary QA tool, not an application dependency.
- `CONTACTS_ICON_FONT=/path/to/material-icons.ttf REVIEW_FONTS_DIR=/path/to/fonts npm run test:financing-browser`: actual React components with synthetic local HTTP services, all six sections and key calculator/client/property/partner/report workflows at 1440/1920/768/390px. Fonts are optional; no live-service requests are permitted in the harness.
- Existing full unit/security/regression suites, lint, typecheck and production build are run separately; final results are recorded at delivery.

**Production readiness:** ready for code/visual review, not approved for production. Staging migration and authenticated staging smoke checks are still required. No live subscriber records, production database schema, message delivery or schedules were modified. No deployment or publishing is authorized/performed by this task.

### Completed verification

- TypeScript check: passed.
- ESLint: passed, zero errors and eight existing warnings.
- Full `test:unit` suite: passed, including the new Financing tests (12 calculation/workflow/report cases and 8 API cases).
- Existing security and regression checks: passed.
- Production build: passed.
- Isolated embedded PostgreSQL migration tests: passed.
- Final browser rerun after reconnecting the environment: passed at 1440, 1920, 768 and 390px. Screenshots were refreshed; no page overflow or JavaScript page errors occurred in the exercised workflows.
- Exported PDF was additionally parsed with `pdftotext`; its synthetic seller net of $142,500.00 matches the calculator preview.

These checks use local/synthetic services. Authenticated staging and production subscriber records were not inspected. No database migration was run outside the isolated test engine.

## Subsequent reference layout correction

See [the reference comparison guide](reference-layout/REVIEW.md): the default calculator now uses the mockup's property/loan/lender composition with combined payment costs and donut, compact rate history and photo callout. All six Studio sections are retained. Updated screenshots include the reference's 1536px width, in addition to 1440/1920/768/390. Property Finder's related photo-backed navigation/client refinements are documented in `docs/property-finder-premium/reference-layout/REVIEW.md`.
