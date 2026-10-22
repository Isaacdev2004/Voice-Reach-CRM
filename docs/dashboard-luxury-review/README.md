# Dashboard luxury refinement

Local branch: `ui/dashboard-luxury-review`, based on `origin/main`. Not pushed, published, merged or deployed. Ready for visual review before approval to publish.

## Audit and approach

The application uses Next.js 16, React 19 and Tailwind 4, with shared LuxuryCard, Icon, dashboard hero, sidebar and header components. Existing brand tokens use cream, champagne and bronze, Cormorant/Playfair serif headings and Inter controls. Keep that system and its responsive breakpoints; add a home-only hero and scoped presentation styles rather than rebuilding pages.

The supplied reference guides the layout and materials. The approved dashboard eyebrow, headline, subheading and logo tagline remain exact. Hero action destinations, navigation items, search, account/notification menus, upgrade flow and recommendation actions remain in place.

## Changed files

- `app/dashboard-luxury.css` (new), `app/globals.css`: ivory/bronze home presentation, typography, rounded surfaces, responsive hero/table treatment, keyboard focus and reduced-motion behavior. New primary white-on-bronze controls use #956846 for at least 4.5:1 contrast.
- `components/crm/dashboard-luxury-hero.tsx` (new): home-only editorial hero with approved copy and existing action destinations.
- `public/brand/heroes/dashboard-interior.jpg` (new): locally stored, AI-generated decorative architectural image inspired by the reference. It represents no subscriber listing or actual property record.
- `components/layout/dashboard-shell.tsx`: mounts the new hero only at `/dashboard`; other page heroes remain unchanged.
- `components/layout/dashboard-sidebar.tsx`, `dashboard-header-provider.tsx`: refined shared navigation/logo/upgrade and top-bar presentation. All existing tabs and actions remain. Active navigation now exposes `aria-current`.
- `components/pages/stitch/OperationalDashboardPage.tsx`, `components/crm/kpi-card.tsx`: horizontal home KPI presentation; exact four labels; subscriber data calculations unchanged. Remove hard-coded decorative sparklines. Opportunities links to Contacts; no filtering implementation was added.
- `components/crm/marketing-pulse.tsx`: image-led trending feature, bronze circular performance chart, educational card and real engagement overlay. Existing content, analytics request and Last 30 days link remain. Real 0% now displays as 0%; unavailable analytics display a neutral dash.
- `components/crm/dashboard-recommended-for-you.tsx`: horizontal playbook rows with property thumbnails, existing durations/step counts/badges and arrows. Existing template creation click handler unchanged.
- `components/crm/dashboard-recent-campaigns-table.tsx`: compact table and mobile rows with real status labels, existing actions and dates. Reads the existing API's `campaigns` analytics field instead of the nonexistent `campaignMetrics` field. No API changes. Steps/reply rates remain unavailable where the feed provides no values.
- `lib/dashboard/layout.ts`: home section presentation class and cleaner section header rhythm.

No database, authentication, backend, API contract, consent, sending or production-record changes.

## Review artifacts

[Open the before-and-after gallery](index.html).

- [1440px after](after/dashboard-1440.png), [before](before/dashboard-1440.png)
- [1920px after](after/dashboard-1920.png), [before](before/dashboard-1920.png)
- [768px after](after/dashboard-768.png), [before](before/dashboard-768.png)
- [390px after](after/dashboard-390.png), [before](before/dashboard-390.png)
- [Responsive results](after/checks.json), [interaction results](after/interactions.json)

Screenshots use isolated synthetic fixtures outside the application source. No fixture data or mock authentication was added to application routes/hooks. All writes in the review harness were blocked; the recommendation action was checked by inspecting its request without creating a record.

## Validation and remaining issues

- `npm run lint`: passes with nine existing warnings (fonts, images, campaign/settings hooks and header ARIA).
- `npm run test:unit`: passes, including existing regression checks.
- `npm run test:security`: passes.
- `npm run build`: passes.
- `npx tsc --noEmit --pretty false`: passes.
- Chromium fixture review: exact copy, hero actions, Opportunities destination, Last 30 days link, four data-bound KPIs, image loading and no document overflow/page errors at 1440, 1920, 768 and 390px. Mobile menu, Quick Create, upgrade, notification and existing playbook actions passed. Empty-data states contain no fabricated metrics.

Authenticated live-app verification remains pending. The local development server is present, but the `/dashboard` request timed out after 25 seconds; earlier local logs report Clerk proxy socket-hang-up failures. No authentication bypass or configuration change was made. Review with an authorized test subscriber when the connection is available, then approve publishing the branch if desired.

Existing data limitations: dashboard contact-derived totals/budgets use the existing contact hook's loaded dataset, and no per-campaign step progress or reply-rate field is supplied to this component. Changing aggregation or expanding API payloads is outside this visual task. Those unavailable figures are not invented.
