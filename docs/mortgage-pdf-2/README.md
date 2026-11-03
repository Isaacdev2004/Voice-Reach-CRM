# Luxury Mortgage Estimate PDF 2.0

## Implementation

Mortgage-only replacement of the primitive text export with two true US Letter pages, selectable text, embedded Cormorant Garamond/Inter fonts, vector chart, ivory/bronze/botanical styling, and an actual PDF preview before download. Other financing calculators retain their existing exports. The supplied request contained the written design composition but no separate approved two-page reference image; this implementation uses that composition and existing MyARI assets.

Use Financing & Closing → Mortgage, enter/review assumptions, select an existing authorized preferred lender, confirm review, then **Preview PDF**. Choose MyARI, Agent, or Agent & lender presentation. Saved mortgage reports also open this preview. Defaults persist through the existing Settings → Brand Kit save flow. No migration is needed: preferences and lender headshot URLs use existing JSON payloads.

## Financial accuracy

The existing mortgage engine is unchanged. P&I, tax, insurance, HOA, PMI, loan amount, and comparison totals reuse its results. A visible cent-rounding adjustment is included when separately rounded components differ from its total. Zero amounts remain visible; missing insurance/taxes and unusually low insurance are flagged.

Comparison rates are entered assumptions, not live lender offers or APR. The 5/1 ARM comparison is an initial-rate amortization illustration only; later resets are not modeled. Cash needed is displayed only with explicit closing costs, prepaid expenses, and reserves. Unclassified calculator fee items are informational and never silently added again to closing costs. Deposits/credits are not modeled. Rate and fee sources/dates remain explicit, including Not Provided when absent.

## Branding and security

Profile and approved Brand Kit fields populate agent details; only the selected owner's lender is used. Authorized images load in the browser, with no server-side arbitrary URL fetch. Unauthorized lender image bytes are excluded even from invisible PDF resources. Missing/CORS-blocked/expired images fall back to contact text with a review warning. Existing owner authorization on reports and partners remains unchanged. No sending, billing, enrollment, CRM migration, or Production writes are introduced.

Existing architectural photography is inspiration, explicitly not the subject property. Asset source: `public/brand/heroes/financing-interior.png`; optimized derivative in `public/brand/pdf/financing-architecture.jpg`. The existing MyARI logo is reused. Fonts are distributed under their included SIL Open Font Licenses. Full embedded fonts are intentional: subsetting caused rendering defects in PDF readers during validation.

## Validation

- TypeScript: passed.
- ESLint: no errors; seven pre-existing unrelated warnings.
- Security verifier: passed.
- Production build: passed locally.
- Full unit/regression command: passed; no live providers used.
- Eight PDF-focused assertions cover calculator reconciliation, missing inputs, zero costs, insurance review, ARM caveats, reusable preferences, fee non-duplication, unauthorized image exclusion, overflow errors, and seven two-page edge-case reports.
- Browser preview/template/download/focus checks: passed at 1440, 768, and 390px with synthetic authenticated fixtures; no overflow or browser errors.
- Existing Financing browser regression: passed at 1440, 1536, 1920, 768, and 390px.
- Poppler/PyMuPDF visual checks: two 612 × 792pt pages; embedded fonts, selectable text, chart, page content bounds verified. Sample page PNGs are rendered from the PDF itself.

Browser fixtures test the actual components and generator, not live Clerk subscriber sessions. Hosted owner sign-in, actual owner Brand Kit persistence, and external branding-image availability require the owner's protected Preview session and remain owner acceptance steps. Do not describe those as completed hosted acceptance.

## Limits and recovery

The standard layout supports up to three comparison products. Excessive custom text fails clearly instead of clipping content, hiding disclosures, or silently adding pages. Embedded fonts support Latin, Greek, and Cyrillic; unsupported glyphs produce a clear error instead of blank characters. The PDF is selectable but is not claimed to be a tagged PDF/UA document. Mobile browsers may prefer **Open full PDF preview** over inline rendering.

The sample uses synthetic contacts and explicit illustrative rates. Download: `myari-illustrative-mortgage.pdf`. Page renders: `page-1.png`, `page-2.png`. Desktop/tablet/mobile preview captures and results are in `browser/`.

Production release remains separate and unapproved. Before release, review the protected Preview and existing stacked PR dependencies. Rollback is a code revert/redeployment of the preceding reviewed revision; no database rollback is required. JSON additions are optional/defaulted for backward compatibility; existing estimates and settings remain readable.
