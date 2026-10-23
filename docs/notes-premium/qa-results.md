# Notes workspace QA

All data used in automated checks is synthetic. No production database/provider writes, real recording, messages, invitations, or campaign enrollment were used.

- `npm run lint`: no errors; 8 pre-existing warnings (fonts, OAuth images, campaign hook dependencies, Settings hook dependency).
- `npx tsc --noEmit`: passed.
- `npm run test:unit`: existing suites plus 14 Notes regression tests passed.
- `npm run build`: passed.
- `npm run test:security` and `npm run test:regressions`: passed.
- `PGLITE_MODULE=/tmp/myari-notes-tools/node_modules/@electric-sql/pglite npm run test:notes-db`: passed. Runs the actual proposed migration twice and actual functions in isolated embedded PostgreSQL; verifies idempotent creation, stale-client revision checks, archived originals, restoration, anonymous execution denial, owner/link isolation, unique task retries, and deletion retention.
- `CONTACTS_ICON_FONT=/workspace/work/contacts-metrics/ui-review/material-icons.ttf npm run test:notes-browser`: passed at 1440, 1920, 768, and 390 px. No horizontal page overflow or JavaScript page errors. Exercises library/editor/context panels, autosave, microphone permission denial, simulated recognition, transcript original preservation, task approval, AI suggestion approval gate, combined search empty states, formatting preview, contact mentions, combined category/tag/contact/text filtering, history restoration, built-in/custom templates, pinning, deletion, daily/weekly/monthly planner navigation, failed save/recovery, conflict/server review, second isolated browser session, and account switching.

PGlite and browser tooling are test-only packages installed in a temporary tools directory; no production dependency was added. The optional `test:notes-db` command requires `@electric-sql/pglite` installed separately or `PGLITE_MODULE` pointing to its installed directory. Browser checks use the existing Playwright/esbuild environment and Chromium. `REVIEW_FONTS_DIR` optionally provides the same font faces locally for offline screenshots after main’s font-loading update.

Real recording accuracy, external AI/transcription authorization/quality, staging Supabase migration, concurrent hosted database connections, and real cross-device subscriber persistence remain pending. The two browser sessions share a synthetic local fixture server; they are not live subscriber sessions. Embedded PostgreSQL serializes queries; its stale-write test does not claim independent hosted-session concurrency coverage.
