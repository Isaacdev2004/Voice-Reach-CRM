# Premium Tasks workspace — review

Development branch: `feature/tasks-premium-workspace`. Built on pending Financing/Property Finder PR #23. No merge, production deployment, configured-database migration, live communication, live calendar mutation, or campaign execution was performed.

## Completed changes

- Replaced the original Tasks layout with a dedicated, unique sunlit home-office hero; preserved the exact approved `TASKS`, `The details drive the deal.`, and `Stay focused on what matters and keep every opportunity moving.` wording. Existing logo, tagline, sidebar tabs and routes remain. The existing general AI launcher moves into the Tasks toolbar so it cannot cover task content.
- Compact KPI cards, filter toolbar and grouped task rows; linked contact/property, stored category/priority, actual assignee, due date/time and actions. Responsive List, Board, Focus and Grid views, By Contact/By Property sections and Calendar navigation. Board transitions use the editor/row actions, rather than drag-and-drop.
- Working search, lifecycle/priority/contact/property/assignee/date filters, sorting, scope chips, clear filters and error/retry/empty/loading states. Focus lists up to five actionable, unblocked tasks and supports remembered ordering. Goals use actual saved goal notes and linked task completion; no numeric goal targets are invented.
- Server-stored view, section, filter, sort, panel and focus preferences through the existing authenticated audit/settings pattern. Pending preferences flush when leaving the page; an expected-owner header rejects stale account requests after account changes. Latest-request protection prevents stale refreshes replacing newer task state.
- Complete editor for creation/editing, completion/reopening, contact/property linking, priority, active workspace member designation, category, dates, recurrence and dependencies. Personal tasks preserve the app's existing backing-contact behavior. Task titles are validated after trimming. Updates use optimistic concurrency, including null-safe checks for legacy records without an update timestamp; deletion confirms and checks ownership/existence. Missing prerequisites can be explicitly removed; dependencies are never automatically completed.
- Eight editable workflow templates: buyer transaction, listing transaction, buyer nurture, seller nurture, open house, price reduction, past-client follow-up and listing launch. Preview/edit offsets, descriptions, priorities and prerequisites, choose owned client/property/agent and user-entered anchor/closing dates, then explicitly approve assignment. Custom versions use owner-scoped settings logs. Assignment is atomic and deduplicated. Proposed dates are starting points, not legal/contractual deadlines; each must be checked by the agent.
- Buyer/listing/checklist trackers reference the SAME task IDs as My Tasks. Progress, missing milestones, next stage and overdue values derive from those actual task records. Multiple trackers can be filtered by type, agent, progress, client and expected closing date. Each milestone is editable with the task editor; transaction name/agent/expected closing date are editable separately. Changing closing date does not silently move milestone deadlines. Deleted milestones do not falsely produce 100% completion.
- Structured, grounded AI proposals and browser dictation. Create, summarize, prioritize, break down, follow-up, saved-note and transaction-summary instructions are supported. Notes and transaction context come from owned records. Suggestions require review and approval, have editable contacts/dates/priority/text, and use an atomic idempotent batch. No text causes automatic task creation or sending. Quotes must match source text; foreign contact IDs and malformed outputs are rejected. Network/provider errors preserve the draft and hide internal details.
- Contact preview, property client selection, campaign drawer and local calendar event links prepopulate task context. Source notes remain linked. Contact activity uses canonical task rows plus recorded checklist updates. Calendar reads the same due/reminder records; completed task mirrors stay hidden. Related contact task panels refresh after changes.

## Metrics and sources

`GET /api/tasks/workspace` reads **all** `contact_tasks` pages using `owner_id = requireUserId()`, rejects incomplete/failed snapshots, and returns distinct IDs. Existing hard-deletion rules apply. Full snapshots are also used by legacy task/contact-task list routes, removing the previous 200-task/global response-cap truncation.

The subscriber's saved profile timezone is used, with existing Calendar timezone as fallback; Calendar's Monday/Sunday week preference supplies the week boundary. These are **calendar-week** counts, not a rolling seven-day window.

| Metric | Calculation |
| --- | --- |
| Open Tasks | `completed = false` |
| Completed This Week | `completed = true` and recorded `completed_at` local date falls inside the current calendar week; missing completion timestamps are not invented |
| Due This Week | Open task with `due_at` local date inside the current calendar week |
| Overdue | Open task with `due_at` local date before today, preserving the existing date-based overdue definition |
| Completion ring | Completed tasks due in this calendar week / all tasks due in this week; the denominator is explicitly labeled and is separate from completed-this-week count |

Cards share search, contact, property, priority, assignee and due-date filters, then apply their own lifecycle definition. Clicking a card applies that definition to the list. Scope chips apply their own scope to the same base set. The hero's today summary uses the full subscriber task snapshot. No historical growth rates or unsupported trend graphics are shown. Legacy priority inference from title hashes/due dates was removed; missing priority is explicitly unspecified.

## Database and reminder behavior

Migration: `supabase/migrations/20261025000000_tasks_workspace.sql` — **included but not applied to the configured database**.

Adds task workspace metadata, property linkage, priority/source-note compatibility columns, server-only transaction storage, dependency/ownership/concurrency guards and atomic checklist/proposal functions. Completion timestamps are preserved on repeated completion, cleared on reopening. Completed task reminders are cleared. A prerequisite with completed dependent tasks must be reviewed before it can be reopened. Completing a recurring task creates one next occurrence, without duplicate creation on retries/reopening. Weekly/daily local time follows DST; monthly recurrence skips nonexistent day-of-month dates, matching the existing calendar rule. Reminder lead time is preserved only when a reminder was recorded.

Basic task creation/editing remains available without the workspace migration. Advanced board status, associations, dependencies, checklist assignment and approved AI batches clearly require that update. The migration does not infer priorities, historical completion dates, assignments or legal deadlines for old records.

In-app reminders display only open, unblocked tasks with a due reminder and the subscriber's existing Calendar `inAppReminders` preference enabled. They refresh while the page is open. **There is no existing background task notification dispatcher; this change does not claim email/SMS/push delivery while the app is closed.** External Google calendar creation remains an explicit opt-in. Existing provider-series edits, provider reminder settings and provider recurrence reconciliation require Calendar/provider review. This work does not claim completed tasks are deleted from an already-created external series; they are suppressed from MyARI's task/calendar view.

## Verification

- TypeScript: passed.
- ESLint: passed with zero errors and eight existing unrelated warnings.
- Full `npm run test:unit`: passed, including Tasks model and isolated route tests; security and regression checks also passed.
- Production `npm run build`: passed locally.
- Isolated PostgreSQL/PGlite migration/functions: passed ownership, denied browser-role access, dependency blocking/cycles, preserved completion timestamps, DST/monthly recurrence, retry deduplication, atomic rollback and reviewed AI batch checks.
- Actual-component Chromium tests at **1440, 1536, 1920, 768 and 390px**: passed exercised search/combined filters/empty states, view switching, completion/reopen, creation, templates/dependencies, AI approval, saved preferences, failed snapshots, account switching, no horizontal page overflow and no JavaScript page errors. No real records or outbound/provider integrations were used.
- Desktop/mobile screenshots below are isolated synthetic review records, never subscriber data or hardcoded application metrics. The original component was rendered from the parent commit for the baseline layout; the shared review shell/assets are local.

| Viewport | Before | After |
| --- | --- | --- |
| Desktop reference width 1536 | [Before](before-1536.png) | [After](tasks-1536.png) |
| Desktop 1440 | [Before](before-1440.png) | [After](tasks-1440.png) |
| Desktop 1920 | [Before](before-1920.png) | [After](tasks-1920.png) |
| Tablet 768 | [Before](before-768.png) | [After](tasks-768.png) |
| Mobile 390 | [Before](before-390.png) | [After](tasks-390.png) |

[Browser results](browser-results.json). Re-run with `npm run test:tasks`, `npm run test:tasks-browser` (requires local build CSS, Playwright and Chromium), and `PGLITE_MODULE=/path/to/@electric-sql/pglite npm run test:tasks-db` (optional isolated QA dependency, not an application dependency).

## Changed file groups

- `components/tasks/`: workspace, dedicated hero, editor, task row, template assignment and scoped responsive CSS.
- `lib/tasks/`: validated model, filters/metrics, templates, API client/service, AI validation/provider adapter and legacy insert/display fixes.
- `app/api/tasks/{workspace,preferences,templates,checklists,transactions,ai,proposals}/route.ts`: authenticated workspace operations. Existing task and contact-task routes retain their public contracts.
- `lib/calendar/read-model.ts`, `lib/activity/read-model.ts`, `lib/hooks/use-contact-tasks.ts`: canonical cross-view state and context links.
- Existing shell, Contacts preview, Property Finder client bar, campaign drawer, calendar editor and standalone task modal: small integration changes; no route or sending changes.
- Dedicated hero asset, Tasks regression/browser/database scripts, package test commands, screenshots and required release/staging/security/demo documentation.

## Review and remaining release gates

Ready for design/code review, **not yet cleared for production deployment**. No authenticated non-production staging session or staging database was identified for this task. Available configured backend credentials were not used to inspect subscriber records or apply schema changes; production counts are not verified. A live Anthropic key was not present, so actual provider generation and provider timeouts require staging verification; malformed/empty/failed cases were tested at isolated boundaries. Browser dictation requires a supported browser, permission and a real microphone; unsupported/denied handling and transcript-to-review wiring were exercised with isolated browser stubs, not a real microphone or speech provider.

1. Review the screenshots and PR. Merge/reconcile the preceding Notes compatibility and Financing/Property Finder work before releasing this stacked branch.
2. On a confirmed **non-production** database, apply prior required migrations and the Tasks migration with a backup/review. Keep outbound disabled and providers mocked. Never use production records for QA.
3. Sign in as two staging subscribers; exercise lifecycle/filters/recurrence and contact/note/calendar/property/campaign context. Verify counts against those subscribers' actual records and denied cross-owner access.
4. Configure staging AI if authorized and test generated proposals/clarification/approval. Check microphone permissions on supported desktop/mobile browsers.
5. With isolated test calendars only, verify Google opt-in, existing-series edits/reminder settings, completion mirrors and recurrence. Background delivery remains a separate dispatcher requirement.
6. Obtain deployment approval. Nothing in this task merges or deploys automatically.

Rollback: first disable new workspace writes and revert the application commit; preserve task/transaction/audit data. Do not drop the new columns/tables while tasks or approved batches reference them. Remove triggers/functions only through a reviewed migration with a backup; do not reverse database changes blindly.
