# Calendar functionality repair

## Root causes and fixes

The view controls waited for a successful preference PUT before updating the rendered view. Failed saves therefore prevented switching, while the saving guard discarded rapid clicks. Local state now updates immediately; serialized saves retain the newest local choice and revision. Old responses cannot replace the selected view. Failed reads/saves leave local controls usable, and conflicts require reload before another cloud write. Saving, synced and unsynced states reflect actual server responses. Refresh persistence is asserted only after server confirmation.

The previous preference endpoint depended on `save_calendar_preferences`. Its missing-function error codes produced the reported database-update message. Production database inspection was unavailable, so the actual installed function is unverified. The repaired API uses the existing `audit_logs` table, a deterministic owner-specific private preference document and atomic revision matching. Legacy preference history remains readable. Server scheduling reads the same preferences as the UI. No new production database migration is required by the current API. Existing service-role access to this table remains an operational prerequisite.

An optional compatibility repair, `20261028010000_calendar_preference_repair.sql`, restores the older RPC against the same document format. It was installed twice and tested in isolated PGlite PostgreSQL, including competing writes and denied browser-role execution. It has NOT been applied to production. It contains no appointment changes.

Agenda now calculates its own chronological reporting range. Invalid date query parameters fall back safely. Day/week/month navigation retains existing timezone/DST rules. Month supports moving editable timed events between dates while preserving local time and duration. Day/week dragging and pointer resizing retain ownership, version and overlap checks. Saves are guarded against duplicate concurrent moves, time out, and restore the original local position if confirmation fails. A timeout can leave server status uncertain: refresh before retrying, as the UI explains. All-day/read-only/task entries retain their existing supported edit workflow; mobile users can use Edit instead of native desktop dragging.

## Google Calendar audit

Existing OAuth routes, owner-bound callback state, encrypted token storage and provider event APIs were retained. A blank redirect override now falls back to APP_BASE_URL instead of producing an empty callback. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_BASE_URL and calendar token encryption configuration still require valid deployment settings. Production credentials, grants, connection records and synchronization were not accessed or verified. No credentials or webhooks were changed. Internal Calendar remains usable while Google is disconnected.

## Verification

- Calendar route/time/authorization tests: 26 passed. Includes tenant isolation, stale revisions, save outages, timezone consistency, recurrence and existing event API validation.
- Isolated PostgreSQL compatibility tests passed: idempotency, owner-separated records, competing writes, API/RPC revision interoperability and browser-role denial.
- Full existing unit suite, security checks and regression checks passed.
- Browser checks passed at 1440, 1920, 768 and 390px: four views, rapid switching, failed preference reads/writes, confirmed refresh persistence, date navigation, synthetic creation/details/editing, failed-move rollback, pointer resize, month drag, deletion confirmation and account separation. No page overflow or browser errors reported.
- Lint: zero errors, seven existing warnings in unrelated files. Type check passed. Production build passed.
- Screenshots and logs: [calendar-repair](calendar-repair/). Premium hero, typography and page layout were preserved.

## Scope and readiness

Changed: Calendar page, preference API/store/server loader, date helper, Google redirect fallback, private activity filtering, Calendar test harnesses, optional SQL and release documentation. No authentication changes, production appointment edits, provider calls, live notifications or SQL deployment were performed during testing. Code is ready for deployment once the production build and exact-commit CI checks pass. Live Google synchronization and production storage permissions remain unverified operational checks; do not claim those were tested with real subscriber records.
