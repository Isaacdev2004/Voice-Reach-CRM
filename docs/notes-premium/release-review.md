# Combined Notes, Calendar and dependency review

## Publication scope

The branch `feature/notes-planner-workspace` now includes current `main` and is intended for a pull request **targeting `main`**. PR #19 was merged to the audit branch rather than main; merely merging that PR did not bring Calendar to the application branch. This branch carries the previously unmerged campaign-audit, delivery-evidence, and Calendar/Phase 18 dependencies, plus the new Notes workspace and Calendar reference correction. Those inherited changes are explicitly part of the review; they are not silently excluded from the diff. Existing main's stylesheet-font build fix is retained.

No remote merge, production database migration, production data edits, live recordings, messages, or deployment is authorized by publication of this review branch.

## Final functionality audit

| Area | Verified with synthetic data |
| --- | --- |
| Notes editor | Creation/editing, Markdown formatting and safe preview, checklists, stable contact mentions, property-address links, combined category/tag/contact/text filtering, sorting, pins, templates, duplicate/edit/delete, autosave and recoverable failures |
| Approval workflow | Microphone denial and synthetic speech, separate original transcript, editable summaries/evidence, explicit suggestion selection, nested task confirmation preserves AI draft, no automatic communication or enrollment |
| Data integrity | Actual migration/functions in embedded PostgreSQL: stale writes rejected, original versions archived/restored, owner/link checks, anonymous denial, unique note-action retries, deletion/history/task retention |
| Calendar | Creation/editing/resize, failed drag rollback, search, view/date navigation, preferences, delete confirmation, account switching, panel drawers; all time-to-pixel calculations follow the compact grid scale |
| Contacts integration | Existing controls/actions, combined filters, selection, profile and owner switching, note save/reload and note visibility in unified activity timeline |
| Property Finder | Client preferences/search and existing navigation remain functional; explicit Notes links select only a matching authorized client |
| Campaigns | Library/preview/creation/navigation/filters, tenant isolation, empty/error states and existing audited delivery safeguards remain covered by the existing suites |

All automated checks passed on the combined branch:

- `npm run lint`: 0 errors, 8 pre-existing warnings.
- `npx tsc --noEmit`: passed.
- `npm run test:unit`: passed, including existing audit/delivery/security-related route tests, 23 Calendar/activity tests and 14 new Notes tests.
- `npm run test:security` and `npm run test:regressions`: passed.
- `npm run build`: passed with main's existing font build fix.
- `npm run test:notes-db` with separately installed PGlite tooling: passed against actual proposed SQL in an isolated embedded database.
- Notes browser suite: 1440/1920/768/390 px passed, no page overflow or JavaScript page errors.
- Calendar browser suite: reference width 1536 plus 1440/1920/768/390 px passed, no page overflow or JavaScript page errors.
- Existing Contacts, Property Finder, and Campaign library browser suites: passed at 1440/1920/768/390 px.

Browser fixtures use actual React components and isolated synthetic service boundaries. The optional `REVIEW_FONTS_DIR` points to local copies of the same font faces for offline fixture screenshots after main's font-loading change; the application still uses main's unchanged runtime font configuration. Updating the old Contacts browser fixture to support the Phase 18 timeline revealed no application failure; its assertion now verifies the saved note in the real timeline component instead of expecting obsolete engagement-only empty copy.

## Review evidence

- [Latest Calendar at reference width](../calendar-reference/calendar-1536.png) and [correction report](../calendar-reference/README.md).
- [Notes desktop](notes-1440.png), [mobile](notes-390.png), and [full implementation report](README.md).
- [Complete PR changed files](release-changed-files.txt). The narrower feature changed-file lists remain in each feature report.

## Rollout limits

This is ready for code/design review, **not an assertion of production readiness**. `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are absent in the current execution process, so live summary/transcription quality and authorization were not checked. Browser microphone behavior is simulated for deterministic tests; no real calls were recorded. No production subscriber data or actual appointments were inspected or changed.

Review the unapplied migration sequence against an isolated staging database, including prior campaign-audit/delivery and Calendar prerequisites before Notes. Exercise real authenticated Supabase/PostgREST, two-device persistence, multiple database connections, provider authorization/retention, and task-calendar sync before rollout. Embedded PostgreSQL and two isolated browser sessions do not substitute for hosted staging verification. Calendar sharing/booking remains disabled by default. No automatic production deployment is included.
