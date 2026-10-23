# Reference layout refinement

The approved financing wording, existing route and six-section Studio remain intact. This correction changes composition rather than just recoloring cards:

- Property/client context now sits inside the left calculator column above loan inputs.
- Loan inputs and the actual preferred-lender picker sit side by side on desktop.
- Payment amount, itemized monthly costs, total, allocation donut and report action share one right-column card. Percentages use calculated amounts; the zero-payment state uses a neutral ring.
- The payment panel aligns beside the compact section navigation at wide desktop widths. Rate history sits immediately underneath it, with benchmark-application controls still available in a disclosure.
- Scenario comparisons, detailed principal/interest breakdown, insights and existing next-step links remain available in expandable sections. Deep links open the required disclosure before scrolling and respect reduced motion.
- Top navigation restores Quick Create, and the original financing interior gets the reference-style cream callout. Headline and subheading remain exactly as previously approved.

Compared actual captures at 1536px (the supplied reference width), plus 1440/1920 desktop, 768 tablet and 390 mobile. Previous 1440/390 captures are retained here as `before-*`; current screenshots and browser results are one directory above. Financial and contact values in captures are synthetic test records, not production data.

The preview's property photograph/valuation, lender directory, Fannie Mae projection cards and live tax/insurance prefill are not fabricated when no authorized source exists. The existing subscriber property address and lender records are used; missing values remain unfilled/manual. Current rate history displays only the existing verified PMMS source when available. Synthetic chart observations in QA captures are explicitly labeled as synthetic.

No database migration, production data mutation, message sending or deployment accompanies this visual correction.

## Verified delivery

Production build, TypeScript, full unit suite, security and regression checks passed. ESLint has zero errors and eight existing warnings. Final mortgage browser tests passed at all five widths, including purchase/refinance switching, actual preferred-lender creation/selection, report totals/export, saved context, zero/missing data, malformed rates and tenant-isolated APIs. Property Finder's full browser suite also passed at all five widths. No horizontal page overflow or JavaScript page errors occurred in either suite. Screenshots were visually reviewed at 1536px and on mobile; baseline captures are retained for comparison.

Presentation files changed: financing workspace/CSS, the new combined payment summary, existing mortgage/market panels, optional shared hero callout and route-specific header styles. Property Finder changes are limited to action/client/saved-search presentation, stable artwork assignments and search-workspace focus/navigation. There are no new backend contracts, database migrations, dependencies or live-data changes in this refinement. The original Studio migration remains a separate staging prerequisite for saved partners/reports.
