# Campaigns — premium library and preview QA

Development branch: `design/campaigns-premium`, based on the existing Property Finder branch/PR #16. No push, merge, deployment, production mutation or migration execution is included in this task.

## Completed phases

1. **Premium composition:** exact approved CAMPAIGNS eyebrow/headline/subheading, a new sunlit residential library/sitting-room hero, four compact KPI cards, warm ivory/bronze surfaces, editorial serif hierarchy, four-column desktop library and responsive tablet/mobile layouts. The existing logo, tagline, sidebar routes, account controls, notifications and Quick Create remain. AI assistance moves to the top bar for this route. A duplicate shell hero is suppressed only on the Campaigns library route. The existing builder remains available in the Campaign studio disclosure, which opens for existing `new`, `edit` and `#campaign-builder` links.
2. **Functional library:** collections, actual search/status/channel/sort/grid/list controls, actual saved audience/goal filters when metadata exists, browser-local owner-scoped pin/unpin, JSON content import as a simulation draft, existing template installation and custom builder. Reinstalling an existing playbook preserves and accurately reports its existing execution state. Removed fabricated enrollment counts, hardcoded folder totals, inferred channels/steps from campaign names, automatic pseudo-pins and inert folder/saved-view/filter controls.
3. **Preview drawer:** Overview, Sequence, Contacts and Performance tabs. Opening/closing keeps library state and scroll; Escape closes, focus returns, Tab stays in the drawer, and arrow/Home/End keys switch tabs. Sequence messages are expandable plain text. Contact names and links resolve only against owned contacts. Existing full-campaign and edit destinations remain. Duplicate creates a simulation draft; no recipients, automations, execution state or schedules are copied. Existing live pause/resume is exposed only when a live launch gate is available and requires explicit confirmation.
4. **Data audit:** new read-only owner-scoped library/preview APIs fetch all pages and reconcile exact counts rather than silently accepting the database response cap. Incomplete/changing totals and duplicate primary keys fail closed. Required-query failures never become zero counts. Missing engagement data is marked unavailable. Malformed responses, empty results and fetch timeouts receive safe presentation states. Cross-account reads are rejected and foreign contact references never return private contact details.
5. **QA:** automated route/data/browser checks plus lint, TypeScript, unit/security/regression suites and production build. Screenshots use isolated fixtures, not subscriber records.

## Authoritative data and calculations

| Presentation | Source and calculation |
| --- | --- |
| Total Campaigns | Distinct IDs from `campaigns`, filtered by authenticated `owner_id`. On All/My campaigns, summary counts use the same search/status/channel/audience/goal cohort as the cards. On template/recommended/shared collections, KPIs retain the saved-owned-campaign cohort and are labeled accordingly. |
| Active Campaigns | Stored `status = sending`, excluding live records explicitly gated off by `live_launched = false`. Mock campaigns retain the stored sending state. `sent`, `partial` and `failed` are never relabeled Active/Paused. |
| Drafts / Queued | Exact stored `status = draft` / `status = queued` within the same owned cohort. |
| Enrolled contacts | Distinct `contact_id` values from owned `campaign_recipients` for that campaign. Not estimated from a name or seeded ID. Existing hard-deletion cascades remove enrollments according to the schema. |
| Steps / channels | Actual owned `campaign_steps` rows; distinct step IDs and configured communication types. Wait/task steps remain in the sequence but are not advertised as communication channels. |
| Duration | Maximum valid `delay_minutes` across saved steps: elapsed time from enrollment to the final offset, consistent with the existing scheduler's enrollment-relative offsets. It is not a sum of delays or an inferred template marketing duration. Zero means same day; no steps means unavailable. |
| Description / audience / goals | Existing campaign fields when available, enriched from the newest owned `audit_logs` campaign blueprint. Template metadata comes from the configured product templates. Missing values are not inferred from campaign names. |
| Last edited | Actual campaign `updated_at`, falling back to `created_at`. |
| Sent | Distinct executed `campaign_step_runs` with `status = sent` for live campaigns. Queued runs and mock sends are excluded. This measures executed live steps, not unique people or every legacy provider event. |
| Delivered / opened / replied | Distinct matching `engagement_events.id` values, with all owner/campaign pages fetched. These are event counts, not unique-contact rates. A failed event read is unavailable, not zero. |
| Completed sequences | Enrolled recipients with a sent/skipped run for every current saved step; no-step sequences have no calculated completion total. This derivation is explicitly explained in the drawer. |
| Current step / next action / last activity | Running/next scheduled owned step run; earliest actual scheduled timestamp; latest executed run or matching engagement timestamp. No dates are invented from recipient row modification times. |

All new queries use `requireUserId()` and `owner_id` predicates. Preview ownership is verified before related reads. Contact details use a separate owned-contact lookup rather than an unchecked relationship join. The delivery engine, enrollment logic, API activation contracts, consent rules, billing and database schema are unchanged.

## Artwork and persistence

The new hero and 24 distinct campaign cover photographs are generated editorial brand artwork, never listing photographs or subscriber property records. Two local atlases supply the covers. Their cells are cropped without changing their original proportions and use Next's local image optimizer at runtime. Existing stored `cover_image_url`/`image_url` artwork takes precedence and is not overwritten.

Cover assignments persist in `myari:campaign-art:<subscriber>` in local browser storage. New records keep existing assignments, deleted records release slots, and no cover slot is reused within an assigned library. A library exceeding the available artwork gets a restrained neutral architectural placeholder for unassigned cards, rather than repeated photographs. Pins use a separate `myari:campaign-pins:<subscriber>` namespace and are explicitly labeled browser-local; no fake server pin model was introduced. No new dependencies were added.

## Boundaries and remaining issues

- **Live/staging verification is pending.** No live subscriber campaign totals, production records, provider analytics, storage uploads or two-account staging sessions were available/verified. Tests use real UI and route modules with synthetic data and substituted auth/database/service boundaries.
- **Shared with me:** the existing Partners API manages owner-scoped outgoing assets; it does not provide an authenticated incoming campaign library or permissions to open another subscriber's campaign. The collection shows an explicit supported empty state and an unavailable count (`—`). No sharing integration or cross-owner bypass was invented.
- **Owner filtering:** this library is already scoped to one subscriber. A decorative/inert Owner dropdown was removed. Audience/goal filters appear only where real saved metadata or configured template metadata provides values.
- **Artwork scope:** 24 unique built-in photographs are available; additional campaigns need subscriber artwork or use the neutral fallback. Browser-local art/pins do not sync between devices.
- **Import:** accepts documented JSON message content only, max 500 KB. Execution status/provider, contacts and schedules are rejected; external voice/attachment references must be linked through the existing editor. This is not an unauthorized import connector or CRM migration tool.
- **Live execution:** confirmation UI and absence of execution requests were tested. No real pause, resume, launch, send, activation, enrollment or schedule update was executed.
- Existing lint warnings remain in fonts, OAuth images, campaign detail hook dependencies and settings hook dependencies. There are no new lint errors.
- The inherited Property Finder optional-preference migration remains a separate, unapplied prerequisite for that feature; Campaigns adds no migration.

## Checks and review

Commands: `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run test:unit`, `npm run test:security`, `npm run test:regressions`, `npm run build`, `npm run test:campaign-library-browser`.

The browser runner uses installed Playwright/esbuild/Chromium and compiled production CSS. `CHROMIUM_PATH` selects Chromium; `CONTACTS_ICON_FONT` can select the existing offline Material Symbols TTF. Checks cover 1440, 1920, 768 and 390px, combined filters and empty cohorts, counts, sorting, unique art, pins/reloads, all drawer tabs and keyboard controls, actual fixture sequence/contact/performance values, confirmation without execution, malformed/failed responses, template preview/install, import/duplicate, custom-builder draft save, account switching and horizontal overflow. Actual route tests also cover >1,000 campaign rows, distinct enrollments, saved-metadata freshness, lifecycle/enrollment updates and safe error handling.

All check commands passed locally. Lint has **0 errors and 8 existing warnings**. Campaign data tests and **8 actual-route test groups** pass. Browser checks passed at **1440/1920/768/390px** with no page/console errors or horizontal overflow; final screenshots are listed below. The production build succeeds. A brief executor transport disconnect occurred after the checks started; the environment recovered, files remained intact, and both final sessions returned successful completion. Text contrast was checked against the ivory surfaces and bronze controls darkened to meet normal-text contrast; this is not a full assistive-technology audit.

A local Next production server also served a cover atlas through its image optimizer with HTTP 200: WebP output was 266,788 bytes instead of the roughly 3 MB PNG. The server was stopped after verification.

Screenshots: [1440px desktop](screenshots/campaigns-1440.png), [1920px desktop](screenshots/campaigns-1920.png), [768px tablet](screenshots/campaigns-768.png), [390px mobile](screenshots/campaigns-390.png). Full-page captures are included alongside these. Drawer: [desktop overview](screenshots/campaign-overview-1440.png), [mobile overview](screenshots/campaign-overview-390.png), [desktop sequence](screenshots/campaign-sequence-1440.png), [mobile performance](screenshots/campaign-preview-390.png). [Machine-readable browser results](browser-results.json).

To review in staging: deploy this development branch to an authorized non-production preview, sign in with a dedicated test subscriber, visit `/dashboard/campaigns`, compare the screenshot composition, and repeat read-only checks under a second subscriber. Use dedicated fixture records for draft import/save tests. Do not confirm live execution controls or send messages during review.

## Changed files

- Route composition: `app/(dashboard)/dashboard/campaigns/page.tsx`, `components/campaigns/campaigns-workspace-page.tsx`.
- Shared presentation: `components/campaigns/campaign-list-panel.tsx`, `campaign-library-card.tsx`, new `campaign-preview-drawer.tsx`, `app/campaigns-premium.css`, import in `app/globals.css`.
- Shell: Campaigns-only hero/AI conditions in `components/layout/dashboard-shell.tsx` and `dashboard-header-provider.tsx`.
- Data: new `app/api/campaigns/library/route.ts` and `[campaignId]/route.ts`; `lib/campaigns/library-data.ts`, `library-server.ts`, `library-transfer.ts`, `library-art.ts`; remove seeded/incorrect helpers from `library-ui.ts`.
- Builder integration: successful saves emit a refresh event in `components/pages/stitch/CampaignBuilderPage.tsx`; existing save/activation behavior is preserved.
- QA/assets: `scripts/campaign-library.test.ts`, `campaign-library-routes.test.cjs`, `campaign-library-browser.test.cjs`, `scripts/campaigns-browser/entry.jsx`, test commands in `package.json`, `public/brand/heroes/campaign-library-interior.png`, `public/brand/campaigns/interiors-a.png`, `interiors-b.png`, and this report/screenshots.
