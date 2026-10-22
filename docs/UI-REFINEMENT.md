# MyARI premium UI refinement

Branch: `ui/myari-premium-refinement`.
Base: `fix/myari-security-and-analytics` / `76d988e` (PR #8). This is a presentation
change layered on that existing work; it must not replace or undo those fixes.

## Audit and approach

The app uses Next.js 16 App Router, React 19, Tailwind CSS 4 and its forms plugin.
The shared shell/sidebar/top bar live in `components/layout`; route wrappers in
`app/(dashboard)/dashboard` render the existing page components. `LuxuryCard`,
`KpiCard`, and `Modal` provide existing shared presentation primitives. There is
no new styling framework, runtime dependency, API contract, or database migration.

Existing typography is Inter (operational text), Cormorant Garamond (editorial
headlines), and Caveat (legacy handwritten accents). Tailwind breakpoints remain
640 / 768 / 1024 / 1280px. Existing spacing and max-width token collisions require
explicit container variables for readable copy. The original hero combined titles,
quotes, signatures, repeated branding and photography, and filter/button styles were
duplicated. The refinement consolidates presentation while keeping all handlers,
data bindings, routes, consent labels and eligibility rules intact.

## Changes by page

| Page | Refinement |
| --- | --- |
| Dashboard | Approved headline/description, fewer competing statements, clear existing actions and compact KPI typography. |
| Contacts | Approved header, existing terrace image without overlays, grouped category/stage/sort controls, selected-state semantics, primary Add contact action, aligned compact statistics, table spacing and keyboard scroll region. Consent label/calculation unchanged; tooltip clarifies recorded status versus channel eligibility. |
| Property Finder | Shared header and approved copy; original property photo and client selector retained. Repeated slogan/wordmark removed. |
| Campaigns | Approved header, quieter secondary library heading, shared cards/controls/table treatments; builder and sending logic unchanged. |
| Calendar | Approved default headline and description; the existing opt-in Inspiration mode and stored preference remain available. |
| Mortgage | Approved header with the existing imagery; calculator inputs, formulas, rates and links unchanged. |
| Notes & Strategy | Compact approved header and a smaller operational section title; editor, storage and actions unchanged. |
| Tasks | Compact approved header, denser two-column mobile metrics and smaller operational heading; task actions and calendar links retained. |
| Voice Scripts | Approved header and clear library section heading; voice creation, preview and script actions unchanged. |
| Activity Logs | Compact approved header, shared surfaces, legible tables and focus treatment. |
| Analytics | Compact approved header and two-column mobile KPI layout; metrics and range logic unchanged. |
| Settings | Compact approved header, pressed-state semantics for existing settings sections; AI launcher clears the fixed Save bar. No billing, integration or account logic changes. |
| Automations / Partners | Consistent compact headers and shared surface treatments; existing workflow and collaboration functionality retained. |

Detail routes retain their utility headings and inherit workspace surfaces, typography,
focus and shared modal styling. Public marketing/authentication pages are not redesigned.

## Shared components and tokens

- New `PremiumPageHeader`: eyebrow, one headline, one description, optional existing
  actions, one unobscured image and an optional functional footer slot.
- Existing `DashboardPageHero` adapts centralized page configuration to full/compact
  headers. Property Finder uses the same primitive with its client-selector slot.
- Existing `LuxuryCard` remains the card primitive; workspace styles refine borders,
  radius and shadow. `KpiCard` uses compact spacing and sans-serif tabular numbers.
- `.premium-button` primary/secondary variants align Contacts actions, hero actions,
  upgrade action and the AI launcher.
- `Modal` gains restrained surfaces, unique accessible IDs, direct-control label
  association, keyboard focus containment and focus restoration after closing.
  Escape, overlay close, form callbacks and submission behavior remain in place.
- Sidebar active markers and `aria-current`; closed mobile navigation is not focusable.
- Decorative shared icons are hidden from screen readers. Reduced-motion overrides
  cover workspace and portal dialog animations. Focus rings include text fields.

Tokens are defined in `app/globals.css`. Scoped workspace aliases preserve public-site
branding rather than globally recoloring the site.

| Token | Value / purpose |
| --- | --- |
| Premium ivory / cream | `#F8F5EF` / `#F3EEE6` |
| Champagne | `#C5A384` decorative accent |
| Bronze | `#805B40` accessible text/button tone; darker than decorative champagne |
| Espresso / muted text | `#292520` / `#716960` |
| Borders | `#E9E2D9`; stronger controls `#B5A99C` |
| Panel / control radius | 20px / 12px |
| Panel / elevated shadow | restrained warm 12% / 20% opacity |
| Headline | responsive 30–40px; compact 28–34px |
| Workspace spacing | 8 / 16 / 24 / 32px |
| Transitions | 150ms; reduced motion respected |

## Validation

- Before/after screenshots: 14 routes × 4 widths × 2 states = 112 screenshots.
  View the [comparison gallery](ui-review/README.md).
- Isolated Chromium preview renders actual page components with synthetic API data;
  authentication/router/image adapters are stubbed only in the scratch preview.
  No preview writes are allowed. These are not authenticated production screenshots.
- All final captures: no document horizontal overflow and no uncaught page errors.
- 13 browser interaction/contrast checks pass: Contacts filter states, name sorting,
  selection, dialog form input, keyboard containment/Escape/focus restoration, CSV
  modal, all 12 sidebar links/active states, Settings sections, mobile menu, mobile
  table scrolling/focus, reduced motion and core palette contrast.
- Source scope is restricted to presentation components, stylesheet, page-hero
  configuration and review documentation. APIs, hooks, schemas, contacts, billing,
  campaigns, consent and integrations have no new logic changes in this UI branch.

Final automated commands:

- `npm run lint`: pass (0 errors; 8 existing warnings).
- `npx tsc --noEmit --pretty false`: pass.
- `npm run test:unit`: pass, including the prior security regression suite.
- `npm run test:security`: pass.
- `npm run build`: pass, all 86 static-generation entries processed.
- `git diff --check`: pass.

The invalid `aria-expanded` on the header's plain search textbox was removed;
search behavior is unchanged. This reduced the previous lint warning count by one.

## Existing issues and verification limits

- The real Next.js dev server starts, but local dashboard and health requests return
  HTTP 500 with Clerk proxy socket-hang-up / ECONNRESET errors. Authentication has
  not been bypassed or rewritten. Authenticated staging testing remains required.
- The request referenced a Contacts screenshot but none was attached. The repository's
  original Contacts UI at `76d988e` was used as the baseline.
- Existing Contacts fallback records can appear when no records are returned. This
  UI task preserves that behavior; empty state/data accuracy should be reviewed separately.
- Existing external profile/team avatar URLs can be unavailable in the fixture preview.
- Core text/button token contrast passes WCAG AA, but a complete accessibility audit
  of every legacy badge, chart, nested form and custom editor remains outstanding.
- No live payment, integration, sending, campaign activation or CRM write was executed.
  Browser checks confirm presentation interactions with fixtures, not live services.

## Review in staging

1. Review this UI diff against `fix/myari-security-and-analytics` so PR #8's functional
   fixes are not mistaken for new UI work. Resolve/merge that dependency first when
   preparing a main-targeted UI release.
2. Use the repository's non-production Vercel Preview for the review branch. Confirm
   the preview is configured for test Clerk/Supabase accounts and outbound simulation
   according to `docs/STAGING.md`. Do not promote it to Production.
3. Sign in with a test account; visit all 12 navigation destinations and the secondary
   Automations and Partners routes. Compare the gallery at 1440, 1920, 768 and 390px.
4. In test data, verify category/stage filtering, sorting, selection, pagination if
   available, contact links, CSV validation and create/edit dialogs. Check contact
   consent labels without treating the statistic as channel eligibility.
5. Check Calendar's Schedule/Inspiration preference, mortgage calculations, note
   editing, task completion, script previews, analytics ranges and every Settings
   section. Avoid real sending, billing or external integration changes during review.
6. Navigate by keyboard, open/close dialogs, test mobile navigation and inspect the
   fixed Settings save controls. Repeat with reduced motion enabled.
7. Complete authenticated service checks and human visual approval before any merge
   that could trigger Production. Nothing in this task authorizes production deployment.
