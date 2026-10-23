# Calendar and Phase 18 QA results

Scope: `feature/calendar-premium-scheduling`, isolated synthetic fixtures. No production writes, real outbound calls, messages, invitations, provider changes, or migrations were performed.

| Check | Result |
|---|---|
| Repository/execution | Repository attached at `/workspace/Voice-Reach-CRM`; Node commands, compilation, tests, and local Chromium server operational. Dedicated feature branch. |
| `npm run lint` | Passed: 0 errors, 8 existing warnings (fonts, image elements, campaign hooks, Settings hook). |
| `npx tsc --noEmit` | Passed. |
| `npm run test:unit` | Passed all existing suites and 23 new Calendar/activity regression tests. |
| `npm run test:security` | Passed. |
| `npm run test:regressions` | Passed. |
| `npm run build` | Passed optimized production compilation, type checking, and page generation. |
| Calendar browser QA | Passed at 1440, 1920, 768, 390: no horizontal page overflow or page JavaScript errors. |
| Browser interactions | Event create/contact selection, edit, saved preference reload, real pointer duration resize, failed drag rollback, search, Month/Week navigation, delete confirmation/cancellation, subscriber switch clearing, mobile drawers. |
| Phase 18 browser QA | Timeline at desktop/mobile, contextual Calendar href, manually logged call payload, subscriber-scoped Property Finder selection. |
| Cross-tab service consistency | Passed: Calendar and Contacts read the same updated appointment UUID, actual title/time/outcome; task mirrors excluded. |
| Tenant isolation | Passed mocked API/service and browser account-switch cases. No real subscriber records were queried for validation. |
| Google provider behavior | Mocked paging, all-day dates, private events, ETags, secure token refresh/rotation, expired grants, deletion failures; live Google authorization not available. |
| Database locks/persistence | Schema/functions prepared; not applied or exercised against PostgreSQL. RPC owner/version contracts tested with mocks. Real cross-device preference persistence and reservation races remain staging checks. |
| Apple | Read-only feed generation tested; no Apple subscription account tested. CalDAV is not implemented. |
| Booking | Actual working-hour/busy/notice/hold calculations and disabled-state handling tested with fixtures. PostgreSQL concurrency, public request lifecycle, and agent confirmation require migration-enabled staging QA. |

The service suite covers DST gaps and both repeated-time occurrences, invalid dates/intervals, monthly recurrence, all-day DST boundaries, private busy masking, overlap lanes/buffers, owner/contact validation, retry idempotency, spanning events, tasks, stale versions, safe failed reads, encrypted token integrity, iCalendar escaping/privacy, contact timeline pagination, real campaign sequence evidence, and callback sync retry safety.

Screenshots are fixture previews, not proof of authenticated production or provider behavior. Browser tests use actual components and the existing shell with API boundaries replaced. They do not replace the remaining authenticated staging pass.

Remaining release gates:

1. Review/apply the Calendar SQL in an isolated staging database; exercise concurrent reserve/confirm/cancel and preference CAS from separate sessions.
2. Configure Google OAuth and token encryption, authorize a test calendar, and verify read/write/ETag/recurrence and outage behavior there.
3. Enable private links only in staging; verify real iCalendar subscription, revocation, booking request management and explicit confirmation. Configure perimeter abuse protection before broad public use.
4. Use an approved test subscriber to verify profile/Calendar/Tasks/AI draft/campaign links with real permission and consent guards. Do not send or enroll automatically.
5. Review design/screenshots and approve publication/deployment separately.

Known boundaries: on-demand Google sync (no background watch); external all-day/full-series editing uses Google; Apple subscription is read-only; confirmed booking changes go through the agent; no inferred unanswered-conversation queue; timeline pagination aggregates current records rather than providing an immutable history snapshot; external availability cannot be locked atomically with PostgreSQL.
