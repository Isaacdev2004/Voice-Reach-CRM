# Property Finder — premium layout and connected client workflow

Branch: `design/property-finder-premium`, based on the existing Contacts view-memory work. No production deployment, publication, live data mutation or database migration execution is part of this task.

## What changed

- Replaced the tall split sunset hero/client bar with a 180px desktop editorial banner using the exact approved copy and a **new architectural dining-room brand image**. The generated editorial image is decorative brand art, not a photograph of an offered listing. It has garden views and natural light; no ocean, pool, exterior mansion or imagery reused from the other tabs.
- Moved the working search into a compact workspace directly below the hero. Find Properties opens a Zillow search without requiring a client; Search by Client finds the subscriber's contacts by name, email or phone and loads their actual preferences. Price is the existing maximum-budget criterion. Unsupported listing filters are not presented as working controls.
- Replaced four large photo cards with compact bronze-icon action cards while preserving all destinations: search workspace, saved searches, activity log, campaign builder.
- Saved searches are compact horizontal cards derived from actual criteria on owned contact records. They are not a separate saved-search database/table. Opening a card loads the same editable client and criteria. A single contact has one stored set of preferences; saving uses the existing authenticated contact PATCH route and never creates duplicate contact/search records.
- Suggested properties uses a composed empty state with a working Zillow action. There is no listing-feed/MLS integration in the inspected code, so there is no fabricated listing grid, address, price, listing photo, recommendation score or live-MLS claim.
- Client tools include the existing copy/SMS/email/Zillow links, an existing Contacts-profile link, existing contact follow-up task UI and existing campaign-assignment modal. Follow-up changes refresh the surrounding task summary. Global follow-ups/analytics and quick-pick/recent clients remain available in compact disclosures.
- Create Campaign retains `/dashboard/campaigns#campaign-builder`. The builder does not accept selected-contact query context, so no invented parameter or automatic recipient enrollment was added. Explicit assignment uses the already-supported contact-ID recipient workflow and existing consent/permission checks.
- Selected client IDs are remembered per subscriber in the current browser-tab session. Returning from a profile restores the selected client only if the ID still resolves in the current verified owned snapshot. Actual saved preferences are reloaded; unsaved draft values are not treated as persisted preferences. Recent-client IDs are scoped by subscriber. Account changes reset local workspace state and pending dialogs.
- The existing AI launcher is available in the Property Finder top bar instead of floating over page content. All other navigation, logo, tagline, search, notifications, account and upgrade features remain in the existing shell.

## Optional client preferences requested during implementation

In addition to the existing area and budget fields, the client editor supports these **optional, nullable** preferences:

| UI field | Contact column | Meaning |
| --- | --- | --- |
| Property type | `preferred_property_type` | Free-text client preference, not the contact's lifecycle/type or an invented home classification. |
| Desired square footage (sq ft) | `preferred_sqft` | Positive number, optional. |
| Bedrooms | `preferred_beds` | Non-negative whole number; an actual zero is preserved. |
| Bathrooms | `preferred_baths` | Non-negative number, including fractional bathrooms. |
| Garage spaces | `preferred_garage_spaces` | Non-negative whole number; zero is distinct from unspecified. |
| Lot size (sq ft) | `preferred_lot_sqft` | Positive square-foot value, optional. |

Blank fields remain `null`/unspecified, never fake defaults. Saved cards and selected-client details show only actual supplied preferences. Missing values in the editor remain blank. Property type, beds, baths, footage, garage and lot size are **saved client preferences**, not claimed live Zillow/MLS filters. The existing verified Zillow-link helper is unchanged and includes **location and maximum price only**. The UI tells the user to apply the extra preferences on Zillow.

The PATCH contract adds an optional `propertyPreferences` object. Existing request shapes remain valid. Keys and numeric values are validated; unknown nested keys are rejected. Only edited preferences are sent and only whitelisted columns are updated. Owner and contact predicates remain on every existing mutation/read boundary. Empty area/budget-only saves do not require any new columns.

## Required migration — prepared, not applied

[20261022000000_optional_property_preferences.sql](../../supabase/migrations/20261022000000_optional_property_preferences.sql) adds six nullable, constrained columns to the existing `contacts` table. It has no contact INSERT/UPDATE/DELETE statements and does not change authentication, ownership, consent, policies or existing column values.

Apply this migration to an **authorized staging database before validating the new preference fields**. The SQL has not been executed against staging or production, and no local PostgreSQL runtime was available to execute it here. Until the columns exist, area/budget-only saves continue to work. Attempting to save additional preferences fails safely with a subscriber-friendly unavailable message and no false success or partial area/budget update.

Before release, validate the migration and exact column types in staging, save/reload each optional preference under two dedicated subscriber accounts, clear values back to null, and check the existing profile/campaign/task flows there. Production rollout remains a separate approved operation.

## Verification and limitations

Tests use isolated synthetic fixtures and real application components/route handlers with database/auth/service boundaries substituted. Browser fixtures never connect to live subscriber data, send SMS/email, launch a campaign or query live listings. Screenshot names such as Client 01 QA are intentionally artificial test records. No authoritative subscriber records or live Supabase persistence were verified.

Automated coverage includes:

- Existing Zillow URL formats, safe location slugging and positive-price validation.
- Actual saved area/budget and optional preferences; no criteria inferred from creation dates, contact types or reference sample values.
- Optional/blank/zero/fractional values, field clearing, unknown-field rejection and preserving untouched preferences.
- Authenticated actual contact PATCH handler: repeated saves update the same row, foreign contacts are rejected, invalid values cannot write, and missing optional columns fail safely while old saves still work.
- Four viewport browser checks (1440, 1920, 768, 390px): exact hero copy/new image, tab/client lookup, name/email/phone search, keyboard selection/Escape, price search, actual preference reload/edit/save, retry/missing-schema states, copied/text/email links, clipboard failure, profile navigation/return, existing follow-up task creation, campaign modal context, account switching, empty/error/loading states, and horizontal page overflow.

Commands: `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run test:unit`, `npm run test:security`, `npm run test:regressions`, `npm run build`, `npm run test:property-finder-browser`. The browser runner needs installed Playwright/esbuild and Chromium; `CHROMIUM_PATH` can select the browser. `CONTACTS_ICON_FONT` optionally points to the existing Material Symbols TTF for offline icon rendering. No dependencies were added.

All listed commands passed. Lint reports eight existing warnings and no errors. The production build completed successfully. Browser checks passed at all four widths without page errors or horizontal page overflow. Screenshot review found no overlapping controls or clipped text. Campaign/action destinations were checked against existing route links; the existing assignment modal was opened with real selected-client context in the fixture. Campaign creation, launch, external Zillow results and live authenticated staging remain unverified.

## Visual review

The reference's compact hero/workspace/actions/saved-search sequence is reproduced using functioning controls and actual contact criteria. Unlike the illustrative reference, the page intentionally omits unsupported Beds/Baths/More Filters search pills and fabricated listing cards. The warm palette, editorial serif hierarchy, rounded surfaces, restrained shadows and compact spacing align with Dashboard/Contacts. Desktop hero height is 180px; at 390px the photograph stacks below the copy and action cards use two columns. Form grids use two columns on mobile with aligned labels.

Before: [1440px full page](before/properties-1440.png), [390px full page](before/properties-390.png). After: [1440px desktop](after/properties-1440.png), [1920px desktop](after/properties-1920.png), [768px tablet](after/properties-768.png), [390px mobile](after/properties-full-390.png). Client preference workflow: [desktop](after/properties-client-1440.png), [mobile](after/properties-client-390.png). [Machine-readable browser results](browser-results.json). Images use isolated fixtures, not subscriber records.

The same-width full-page 1440px fixture capture reduced from 1864px before to approximately 1116px after, keeping the real follow-up/quick-client tools accessible in disclosures rather than deleting them.

## Changed files

- Property Finder page and components: `components/pages/stitch/PropertyFinderPage.tsx`, `components/property-finder/property-finder-hero.tsx`, `property-finder-action-cards.tsx`, `property-finder-client-bar.tsx`, `property-finder-saved-searches.tsx`, `property-finder-recent-contacts.tsx`, new `property-search-workspace.tsx` and `property-preferences-editor.tsx`.
- Presentation/brand: `app/property-finder-premium.css`, `app/globals.css`, `public/brand/heroes/property-dining-room.png`, `lib/property-finder/assets.ts`, `lib/property-finder/home-ui.ts`, Property Finder-only launcher conditions in the existing dashboard shell/header.
- Workflow/data: `lib/property-finder/criteria.ts`, `lib/property-finder/preferences.ts`, optional API/types in `lib/contacts/schemas.ts`, `lib/hooks/use-contacts.ts`, `app/api/contacts/[id]/route.ts`, and optional task-change notification in `components/crm/contact-tasks-panel.tsx`.
- Migration: the nullable-column SQL above; not executed.
- QA: `scripts/property-finder.test.ts`, `scripts/property-finder-browser.test.cjs`, test fixtures in `scripts/property-finder-browser/`, additional actual-route regression cases in `scripts/contacts-routes.test.cjs`, `package.json` test commands and this report/screenshots.
