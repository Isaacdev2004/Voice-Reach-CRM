# Dashboard reference correction

Local development branch: `ui/dashboard-reference-correction`, based on the earlier dashboard review branch. These revisions have not been pushed, published, merged or deployed. PR #11 still contains the prior version.

## Reference comparison and corrections

Reviewed the supplied luxury reference against actual component renders at **1451 × 1086**, the reference width. Screenshots are full-page captures from that viewport. After the first comparison, reduced the Marketing Pulse card heights and section padding, increased the hero height, and removed a floating-AI/campaign-action overlap.

- **Page frame:** 240px sidebar, 72px desktop navigation and 24px content gutters establish the reference's alignment. The logo, exact tagline and all navigation items remain.
- **Hero:** 340px immersive living-room hero on desktop; image covers the right two thirds with a soft fade into editorial copy. Exact approved wording and both existing action destinations remain. The shared home hero configuration also points to the interior asset, preventing sunset/pool artwork in home hero consumers.
- **KPIs:** larger 37px serif values, champagne icon containers, tighter 12px gaps and data-derived change labels. No invented historical charts or percentages.
- **Editorial row:** a 1.6:1 column split gives recommendations appropriate width. Marketing Pulse uses a full-width, integrated text/photo feature above two smaller cards. Performance displays a prominent measured percentage beside the ring; Insight has its own book icon and headline hierarchy. Last 30 days retains its analytics destination.
- **Engagement empty state:** the existing API can return `value: "Unavailable"` and `change: "No engagement measurements"`. Previously any non-empty change became an image overlay. The new display helper accepts measured percentages only. Missing engagement now appears in a quiet icon/text panel with an analytics link, outside the property image. Zero is still a valid measured value. Explanatory text never becomes an overlay statistic.
- **Recommendations:** consistent 60px square thumbnails, aligned title/duration/steps, compact badges and existing clickable row actions/arrows. Existing playbooks remain.
- **Recent Campaigns:** the compact table stays immediately below the editorial row; no intervening section. Existing backend values, links and actions remain.
- **Top navigation:** search expands across the available space; the existing AI launcher becomes Ask MyARI in the home top bar, alongside a compact Quick Create plus, notifications and avatar-first profile. This preserves AI access while removing the home floating button that covered campaign actions. Other routes retain their floating launcher. Menu handlers remain unchanged.

The reference's sample metrics and personal greeting were not copied. The decorative living-room asset is reused from the prior dashboard branch. No backend, authentication, database, API contract, subscriber-record or sending changes were made.

## Changed files

- `app/dashboard-luxury.css`: page grid, hero/frame proportions, editorial cards, compact rows, navigation and responsive layout.
- `components/pages/stitch/OperationalDashboardPage.tsx`: explicit editorial column arrangement.
- `components/crm/marketing-pulse.tsx`: recomposed feature/performance/insight markup and engagement empty state.
- `components/crm/dashboard-recommended-for-you.tsx`: thumbnail/copy/badge layout hooks.
- `components/crm/dashboard-luxury-hero.tsx`, `lib/dashboard/page-heroes.ts`: consistent interior asset and correct image metadata.
- `components/layout/dashboard-header-provider.tsx`, `dashboard-shell.tsx`: balanced search/action/profile groups; existing AI launcher in the home top bar. Search exposes its existing expanded state with combobox semantics.
- `lib/dashboard/layout.ts`: remove important padding utilities that prevented intentional section sizing.
- `lib/dashboard/engagement-display.ts` (new): numeric-only engagement presentation.
- `scripts/verify-regressions.ts`: unavailable, malformed, non-live, zero and measured engagement regressions, including the actual analytics snapshot shape.

## Screenshots and validation

[Before/after gallery](index.html) · [Before at reference width](before/dashboard-1451.png) · [After at reference width](after/dashboard-1451.png) · [Mobile](after/dashboard-390.png)

The isolated browser harness uses synthetic records outside application source and blocks writes. These are real component renders with fixture API responses, not authenticated subscriber or live staging screenshots. No fixtures or authentication bypass were added to the application.

- Chromium: passed at 1451, 1440, 1920, 768 and 390px; no document overflow or page errors.
- Verified exact approved copy, hero/analytics/contact links, actual-data bindings, image loading, section order/gaps and desktop search/profile bounds.
- Existing AI, Quick Create, upgrade, notification and account dialogs/menus opened successfully. The recommendation request retained its existing endpoint/body; its write was blocked by the harness.
- Unavailable engagement, measured engagement and completely empty data all passed.
- `npm run lint`: passed with eight pre-existing warnings, no errors. The prior search ARIA warning is resolved by the combobox semantics.
- `npm run test:unit`: passed, including the new engagement presentation regression assertions.
- `npm run test:security`: passed.
- `npm run build` and `npx tsc --noEmit --pretty false`: passed.

Authenticated subscriber checks remain pending; the earlier local verification was blocked by the Clerk proxy connection. No configuration or authentication changes were attempted. Existing unavailable step/reply metrics remain dashes; no backend expansion is included.
