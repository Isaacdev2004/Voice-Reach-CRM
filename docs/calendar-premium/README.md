# Calendar scheduling workspace and Phase 18 review

Branch: `feature/calendar-premium-scheduling`. Review-branch implementation; no production deployment or live test-calendar verification. No production records were modified and no messages, reminders, or invitations were sent during QA.

## Delivered composition

The Calendar now uses a compact home-office hero, left calendar/color controls, a central scheduling grid, and a right integration/mini-month/agenda/action column. The exact approved Calendar headline and description, existing MyARI logo, tagline, navigation, and routes remain. The photograph is a new generated asset, not a reused dashboard/property image. Mobile uses a single-day default for new subscribers, with separate panel drawers; desktop defaults to Week. Existing saved views take precedence.

Month, Week, Day, and Agenda are functional, with date navigation, search, visibility, color choices, empty-slot creation, appointment details, drag moves, duration resize, and keyboard-accessible editing. Saves use existing owner-scoped Calendar and task endpoints. Moves optimistically update and roll back on failure. Short/overlapping events retain separate identities; truncated labels use ellipses and details show the full title. Tasks are due-time markers, not fabricated-duration appointments. All-day events retain exclusive date boundaries. Repeated DST times require a first/second occurrence selection and display exact GMT offsets in details. The grid uses wall-clock rows, so repeated fall-back times share a position in separate lanes rather than adding a 25th hour row.

Removed the old hardcoded callback trend, decorative unmeasured sparkline, stacked two-month layout, and automatic reminder activation. In-app due reminders are opt-in and run only while Calendar is open. No new sending integration or consent rule was added.

## Phase 18 integration and real data

The Contacts profile and selected-contact Activity panel share `ContactActivityTimeline` and an authenticated aggregation endpoint. No duplicate activity table or rewritten historical activity is introduced.

| Activity | Authoritative source and attribution |
|---|---|
| Appointments, callbacks, reminders | `calendar_events.owner_id` and explicit `contact_id`; stable appointment UUID. Authorized external copies are checked with Google when possible; failed verification is labeled. |
| Tasks | `contact_tasks.owner_id/contact_id`, actual due/completed fields and `completed_at` where present. Mirrored calendar records are excluded. |
| Notes | `contact_notes.owner_id/contact_id`, actual saved body and saved timestamps; current contents are not presented as an invented revision history. |
| Contact/property preference changes | Owned `audit_logs`, `entity_type=contact`, exact `entity_id`, recorded `CONTACT_UPDATED` fields. No untimestamped search or viewing activity is invented. |
| Campaign enrollment | Owned `campaign_recipients` joined to owned campaigns through actual IDs. Enrollment is distinct from execution and delivery. |
| Sequence activity | Owned `campaign_step_runs` joined through owned enrollment and campaign IDs. Real scheduled/executed timestamps and statuses. |
| SMS, email, ringless voicemail | Existing owned engagement events; when delivery evidence is enabled, owned `outbound_messages` and `outbound_delivery_events`. Historical events remain labeled unverified delivery evidence. |
| Manually logged calls | Authenticated `CALL_LOGGED` audit entry, validated contact ownership, explicit subscriber-entered outcome; never places a call. |

Timeline pages contain 25 records, with deterministic timestamp/ID cursors and deduplication. Underlying deleted records are re-read rather than copied into another activity store. Contact-specific reads use owner/contact filters and sequence reads use owned enrollment IDs. Core sources fail closed on incomplete reads; optional provider evidence reports its limitations.

Follow-up suggestions require explicitly recorded completed/missed outcomes, or actual execution records for every existing campaign step. A past scheduled time does not establish attendance. Showing → feedback/follow-up task; buyer consultation → saved preferences; listing appointment → follow-up task; missed appointment → reschedule; fully executed sequence → review engagement. Recurring creation cannot automatically mark all future occurrences completed.

Actions open existing task, Calendar, note, campaign, AI draft, and Property Finder workflows. Contact IDs are carried explicitly and revalidated by the backend. Property Finder receives the existing subscriber-scoped client selection memory. Campaign links only open campaigns; they never enroll anyone. Message actions only open the existing drafting interface; sending remains subject to existing consent and authorization.

Dashboard and Calendar daily priorities use actual open task deadlines, upcoming associated appointments, and explicitly completed recent showings. No fabricated urgency, engagement score, or inferred unanswered-conversation queue was added. Focus/refresh and successful activity changes re-read the source data.

## Defects repaired

- Incomplete fixed-size Calendar event/task reads and events spanning range boundaries.
- All-day provider events previously converted into noon appointments.
- Host-timezone recurrence drift, DST gaps/folds, and invalid monthly rollover.
- Missing positive-duration validation and explicit owned-contact validation.
- Non-idempotent local appointment creation on client retries.
- Unsafe stale local updates; Calendar writes now require expected versions.
- Google updates/deletions without ETag protection; failed provider deletion no longer deletes the local record.
- Plaintext newly stored OAuth tokens, repeated refresh against a stale token snapshot, and dropped refresh tokens when Google omitted a new one.
- Authorization-record presence and token-update timestamps presented as successful sync. Calendar now reports actual read attempts/successes; Settings distinguishes saved authorization from verified sync.
- Potential duplicate local/provider mirrors after a successful external create but failed local association save.
- Task/calendar association updates missing their `owner_id` predicate.
- Existing campaign callback/task sync created unstable provider IDs and ignored local save failures. Stable source IDs, owner/source validation, verified existing events, and checked local saves now prevent retry duplicates and false success without changing execution eligibility.
- Settings imported server calendar code into a client module; server status composition is now separated from client list utilities.
- Shared dialogs lacked focus trapping/return and unique accessible heading IDs. Nested dialogs now handle Escape only on the top dialog.

## Preferences and scheduling infrastructure

Preferences reuse `audit_logs` subscriber settings storage. They are fetched on entry and saved only after intentional actions; loading never overwrites saved preferences. Version checks reject stale cross-device saves. Settings include view, visibility/colors, timezone, week start, 12/24-hour time, duration, working hours/days, separate desktop/mobile panels, manual buffers/travel allowance, notice, and opt-in in-app reminders. Reset requires an explicit save.

Review and apply **only in an isolated staging database first**:

`supabase/migrations/20261023020000_calendar_workspace.sql`

The migration adds a service-role-only preference CAS function, hashed-token sharing links, booking requests, owner-serialized slot guards, a reservation function, and explicit confirmation function. Anonymous/authenticated database roles cannot query these tables or execute the service functions. Phase 18 itself adds no activity-history migration.

`CALENDAR_LINKS_ENABLED` defaults to false. Enable only after applying and testing the migration. Private feed/booking tokens are 256-bit random values stored only as hashes. Tokens can be revoked. Feed titles are always **Busy**, with no contact details, attendee lists, or reminder commands.

Booking links use actual working hours, duration, manual buffers, minimum notice, local busy records and authorized external reads. External verification failure closes availability. Pending requests reserve local slots under a database owner lock. Agents explicitly confirm or decline requests; confirmation creates a local appointment transactionally. Optional contact association is validated at link creation and confirmation; guests do not become contacts automatically. Clients can save a private management URL (management secret in URL fragment), check actual status, and reschedule/cancel pending requests. Changes after agent confirmation go through the agent. No automatic invitations or notifications.

**Database locks were not executed against PostgreSQL in this workspace.** Application checks and mocked service calls passed; concurrent SQL reservation/confirmation and cross-device persistence require staging verification. External calendars cannot participate in the local database transaction: availability is rechecked before reservation/confirmation, but another external writer can race. Booking confirmation is intentionally an agent review step. Configure hosting-level abuse protection/rate limits before sharing public booking links broadly.

## External integration status

| Integration | Classification in this workspace | Verification boundary |
|---|---|---|
| Google Calendar | **NEEDS CONFIGURATION** | OAuth/read/write implementation is present; Google OAuth credentials and encryption key are not configured here. No authorized live Calendar account was tested. |
| Apple/iCloud subscription | **READ ONLY — NEEDS CONFIGURATION** | Private outbound iCalendar subscription implementation exists; sharing flag is off and migration unapplied. No Apple account is connected or verified. |
| Apple/iCloud CalDAV | **NOT SUPPORTED** | No authorized CalDAV adapter exists. Never requests an Apple primary password. |
| Public booking links | **NEEDS CONFIGURATION** | Disabled until migration and staging checks. Pending requests and explicit local confirmation are implemented. |

Google uses discovered calendar access roles (including privacy-preserving free/busy-only calendars), per-calendar read evidence, paginated reads, server-side OAuth owner/state cookies, encrypted saved/refreshed tokens, secure refresh retention, private-event masking, 10-second provider timeouts, safe errors, stable creation IDs, ETags, and `sendUpdates=none`. External changes are read on refresh/focus; this is **on-demand synchronization**, not an installed background watch/webhook job. Native recurring-instance edits/deletions use provider instance IDs. Full-series editing and external all-day edits remain in Google via the provider link. Provider deletes are reflected on successful reads; local historical copies are not destructively rewritten on an outage.

Google setup:

1. In the intended **staging** Google Cloud project, enable Google Calendar API and configure the OAuth consent screen/test users.
2. Create a Web OAuth client. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the exact staging `APP_BASE_URL` in the server environment.
3. Register the exact authorized redirect URI: `<staging-origin>/api/integrations/google/callback`. If `GOOGLE_OAUTH_REDIRECT_URI` is set, register that exact value. Do not use a different `www` hostname or trailing path.
4. Requested scopes: `openid`, `email`, `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/calendar.readonly`. Recorded granted scopes come from Google's token response.
5. Generate a 32-byte base64 key privately, for example `openssl rand -base64 32`; store it as `CALENDAR_TOKEN_ENCRYPTION_KEY`. Never place it in browser variables, source control, screenshots, or chat. Keep it stable; losing it requires reauthorization.
6. Sign into the isolated test subscriber and explicitly authorize a test Google account. Existing legacy plaintext tokens remain readable for migration compatibility; reauthorization/refresh stores encrypted values. Reauthorize legacy accounts to replace their retained credentials securely.
7. Use an isolated test calendar to verify discovery, private/all-day events, paging, recurrence exceptions, refresh, edits, deletes, stale ETag rejection, and disconnected/error states. No live customer calendars or invitations.

Apple setup after staging enablement: create a private read-only subscription URL in Calendar → Calendar Integrations → Booking links & Apple subscriptions, then use Apple Calendar's **New Calendar Subscription**. Subscription refresh timing is controlled by Apple. Revoking the link stops future reads; Apple may retain previously cached entries. This is not a two-way iCloud connection.

## QA and preview

All screenshots are the actual React components and shared application shell with **synthetic subscriber fixtures**, not authenticated production screenshots:

- [Desktop 1440](calendar-1440.png), [desktop 1920](calendar-1920.png)
- [Tablet 768](calendar-768.png), [mobile 390](calendar-390.png)
- [Mobile details drawer](calendar-details-390.png)
- [Timeline desktop](timeline-1440.png), [timeline mobile](timeline-390.png)

The approved reference was compared section by section: compact hero, new office image, serif hierarchy, central grid and overlap cards, calendar controls, right rail and mobile drawers. Sparse synthetic events intentionally leave empty time slots; no sample appointments or fake connected-provider badges were added to production UI.

Commands:

```sh
npm run lint
npx tsc --noEmit
npm run test:unit
npm run test:security
npm run test:regressions
npm run build
CONTACTS_ICON_FONT=/path/to/material-icons.ttf npm run test:calendar-browser
```

The browser harness uses the existing review environment’s Playwright/esbuild tooling and requires an installed Chromium (`CHROMIUM_PATH`, defaults `/usr/bin/chromium`) and a successful build's CSS/fonts; run **after**, not concurrently with, `npm run build`. It replaces network responses with isolated synthetic fixtures and never accesses live services. The icon font is optional for assertions, recommended for visual screenshots.

Results: see [QA results](qa-results.md) and [changed files](changed-files.txt). Local preview: run `npm run dev`, sign in using an authorized isolated test account, and open `/dashboard/calendar`; Contacts → profile/Activity opens Phase 18. A PR preview is a temporary non-production site built from a review branch; the screenshots in this report use isolated fixtures, and no hosted staging verification is claimed.

## Review and production readiness

Ready for code/design review; **not yet verified for production rollout**. The environment can build and execute tests. Database and authentication configuration are present, but no authenticated staging session or approved live test calendar was used. No subscriber totals, production appointments, or cross-device database persistence are claimed verified. Google credentials/key, migration staging execution, provider authorization, concurrency testing, and deployment approval remain required. GitHub review-branch publication does not authorize a merge, production migration, or deployment.
