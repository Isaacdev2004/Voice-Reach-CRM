# Property Finder refinement and workflow audit — 2026-10-23

## Scope and data sources

The existing `/dashboard/properties` page, dining-room hero, exact approved copy, logo, navigation and authentication are preserved. Work is based on main after PR #27; the separate AI CRM assistant PR #26 is not included.

- Contacts and saved criteria: the complete owner-validated `useContacts` snapshot from `/api/contacts`; preferences persist through the existing owner-authorized `/api/contacts/[id]` PATCH. Each contact remains one saved search, with no parallel search records or invented criteria.
- Supported external search: `lib/property-finder/zillow.ts`, using existing Zillow **for-sale path links** with location and maximum price. There is no live search inside MyARI.
- Optional preferences: property type, desired square footage, bedrooms, bathrooms, garage spaces and lot square footage. These are optional client fields, including genuine zero beds/baths/garage; they are not claimed as applied Zillow URL filters.
- Follow-ups: existing contact task services. Showing proposals open the existing Calendar event editor with contact ID. Financing uses the existing calculator's contact context. Campaigns use the existing builder and explicit assignment modal; unsupported client parameters are not added to campaign routes.
- History: existing `audit_logs`, filtered by authenticated `owner_id` and `PROPERTY_SEARCH_ACTION`. The panel shows the latest 50 recorded actions; existing contact-update audit events record preference changes. No database migration is required for history.

## Confirmed repairs and refinements

1. Four navigation cards now place distinct, stable bundled architectural photographs at the top, with icons, titles, descriptions and arrows below on solid ivory. Illustrations remain explicitly distinguished from real listings. Heights align within rows, with two columns on tablet/mobile and four on desktop; focus and reduced-motion behavior are retained.
2. Saved-search text is more readable. Missing area/budget values remain unspecified; **Complete Preferences** opens the actual client's editing workspace. These prompts do not make optional fields mandatory.
3. Save confirmation/error results are tied to the draft version. Switching clients or editing while a request is pending cannot label a different client's draft as saved. Clipboard confirmations use the same protection.
4. Save Search is disabled in general Find Properties mode; an implicitly remembered client cannot be overwritten from a workspace without a visible client selection.
5. Invalid or unsupported numeric budgets are rejected rather than producing broken exponential/zero-price paths. Location input follows the existing 200-character server limit. Generated history links must match canonical HTTPS Zillow paths, without credentials, query parameters, fragments or lookalike hosts.
6. Selected-client workflow links open profile, showing editor, task editor, financing estimate and client activity. The existing profile timeline now has the corresponding activity anchor. Task property context is included only when the actual contact has a saved property address. Existing campaign assignment retains its explicit user interaction.
7. Search guidance describes missing information and the external-link limitation. An explicit Ask MyARI action opens the existing assistant with selected client ID and entered criteria, requesting clarification and next steps rather than fabricated listings or match scores. Opening/closing it preserves draft criteria. Provider output still requires agent review.
8. New authenticated history records search requests, successful clipboard copies and explicit email/SMS composer openings. It never asserts messages were sent/delivered or clients viewed properties. Event IDs derive from owner plus client event UUID; the existing database primary key prevents duplicate retries, and reused event IDs cannot overwrite history. Foreign client IDs fail before insertion. History failures do not block search/sharing and show a safe warning.
9. Property-search history is represented in the existing Activity Log and unified contact timeline.

## Integration limitations and remaining work

- Inspection found **no active IDX, MLS, RESO or other authorized live listing adapter** in application code. No listing provider was connected, purchased, scraped or activated. Production provider credentials and subscriber records were not queried to infer additional access.
- Live property favorites/collections, the Shortlisted/Touring/Interested/Not Interested workflow, stable provider property identifiers and listing-based matching are **not enabled**: the page has no authorized listing records to operate on. The honest listing empty state remains. A future authorized adapter and persisted collection model are prerequisites; current decorative images are not saved or matched as properties.
- Minimum price, listing-status switching and additional listing filters are not presented as working external filters: there is no verified adapter support. Additional client preferences are applied manually on Zillow. This avoids undocumented URL parameters and false MLS functionality.
- Zillow path generation is regression-tested locally. External Zillow rendering/filter retention was not independently verified in this environment; Zillow controls its destination behavior.
- Calendar/task/financing/campaign handoffs are existing workflows. Synthetic tests check context URLs and existing service regression suites; no production showing, task, enrollment, message or contact was created during QA.
- AI guidance was tested with a mocked response. No live Anthropic request or claim of live property matching was made. Existing assistant provider configuration/fallback behavior is unchanged.
- Optional contact preference fields still require the pre-existing database migration. Existing missing-schema handling remains explicit and reports no save; this task does not apply production migrations.
- Authenticated production smoke testing remains unverified. Direct `myari.io` access is blocked by this environment's network policy. Deployment status is checked separately through GitHub/Vercel.

## Validation

- Lint: passes with seven existing warnings in unrelated layout/auth/campaign files; no new warnings.
- TypeScript: passes.
- Full `npm run test:unit`: passes, including contacts, campaigns/delivery, calendar, tasks, financing, notes, voice, settings and dashboard.
- Production build: passes.
- Property Finder unit/route tests: canonical paths, actual optional preferences, numeric validation, owner-scoped restored selection, foreign-contact rejection, cross-account history isolation, duplicate retries, immutable events, safe malformed/failure responses and unauthenticated requests.
- Actual-component browser tests use synthetic contacts and mocked APIs only, at **1440, 1536 (reference width), 1920, 768 and 390px**. They cover photo/text composition, exact header, no fake listing grid, client search by name/email/phone, preferences save/reload, API/schema failures, clipboard failure, profile return, contact tasks, campaign modal, CRM links, history, stale-save race, AI guidance and incomplete preferences. No horizontal page overflow or browser errors in the completed run.
- Before/after captures are in `docs/qa/property-finder/`; all names and values in screenshots are synthetic test fixtures. The hero photograph is intentionally preserved.

## Release and rollback

The user explicitly authorized automatic deployment for this task. Open a ready-for-review PR, verify CI and preview status for its exact head, merge only that PR, then verify the resulting main commit's Vercel production status. Do not include unmerged PR #26. Rollback uses the previous successful Vercel deployment or a revert of this PR; there is no new schema migration to reverse.

### Review captures

| Viewport | Before | After |
| --- | --- | --- |
| Desktop, 1536px | [Before](qa/property-finder/before-desktop-1536.png) | [After](qa/property-finder/after-desktop-1536.png) |
| Mobile, 390px | [Before](qa/property-finder/before-mobile-390.png) | [After](qa/property-finder/after-mobile-390.png) |

[Browser assertions by viewport](qa/property-finder/browser-results.json)
