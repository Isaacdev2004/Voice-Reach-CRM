# Final approved Concierge UX

Continues draft PR61 on its existing branch; retains PR52 as the security/hosted acceptance dependency. Based on the exact existing fdd600c source, preserving current main’s Assistant, settings, Brand Kit and Mortgage PDF. No migration, feature flag or Production change.

## Campaigns as the visual baseline

Inspected app/campaigns-premium.css, CampaignLibraryCard/CampaignCover and the existing approved artwork. Reuses CampaignCover, ivory #fffdf9, champagne #f5efe5, bronze #946744, editorial serif typography, 18–20px cards, restrained borders/shadows. Removed all green CSS colors and collection-number labels. Campaign covers use distinct approved full-resolution MyARI architectural assets through the existing image optimizer, rather than enlarging 362px mosaic tiles. Connections have three relevant photographs. Campaign descriptions and steps remain the actual reviewed library content.

## Retained and improved

Retains the authorized first-login welcome, server-persisted audit preferences, prominent White-Glove Setup navigation, Dashboard card, questionnaire, CSV templates/review, 500-row/1MB import limits, no-overwrite behavior, Unknown consent, explicit campaign draft approval, integration evidence, staff access and version-bound independent signoff. Save and Return Later / Save & Continue are explicit. Journey and launch review distinguish intentionally skipped integrations from verified evidence. No changes to Brand Kit data.

Written orientations now open in-place before an optional Open Full Workspace link. Seven existing core topics explain setup, value and agent-reviewed actions. Notes, Tasks and Contacts use a new read-only owner-scoped existence endpoint; it returns booleans only, and errors remain unknown. Campaign and Calendar guides require existing authoritative case evidence. Dashboard and Reporting remain explicitly personal acknowledgements, not verified business activity. A saved record does not prove every instructional substep was performed. No fake videos, generated customer data or automatic record creation.

## Files changed in this refinement

- components/concierge/workspace.tsx
- components/concierge/concierge.css
- lib/concierge/journey.ts
- lib/concierge/orientation.ts
- app/api/concierge/orientation/route.ts
- scripts/concierge-browser.test.cjs
- scripts/concierge-welcome.test.cjs
- scripts/campaign-library-browser.test.cjs (CSS asset handling for reused navigation/welcome)

## Verification and limits

Full unit suite, repository lint (seven pre-existing warnings), security checks, optimized build, disposable PostgreSQL regression and actual-component Chromium browser tests. Browser tests use synthetic local HTTP fixtures, six real approved campaign templates and approved image assets. They cover welcome dismissal, saved preferences, navigation, all six steps, orientation evidence gating/persistence, CSV cancellation/approval, draft approval, no sends, warm palette and responsive layouts. The existing Campaigns browser suite supplies the side-by-side visual baseline.

Authenticated hosted manager signoff, staff self-review HTTP403, unrelated subscriber denial and STAFF_READINESS_SIGNED remain PR52 acceptance gates; this UI work does not claim to complete them. Safari, real provider authorizations and cross-device authenticated persistence are not simulated as hosted success. No Production activation recommendation until those pass and separate approval is granted. No new database dependencies; existing Concierge tables, audit_logs and owner-scoped CRM tables are required.
