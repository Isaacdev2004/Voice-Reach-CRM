# Contacts metric audit and correction

Local branch: `fix/contacts-metric-accuracy`, based on `ui/contacts-luxury-review`. Not pushed, merged or deployed. No production records were modified.

## Verification of 234 / 232 / 2 / 0

**Not independently verified.** Those displayed values are not treated as authoritative. No authenticated subscriber test session was available. A read-only request to the local authenticated `/api/contacts` endpoint timed out after 12 seconds without a response. No database connector is available in this session, and no service-role query across all owners was performed to infer the intended subscriber. An authorized, owner-scoped live/staging session is still needed to certify those four numbers.

All tests below use controlled fixtures, not the subscriber's database. They establish implementation behavior, not production account totals.

## Actual source and definitions

The source is Supabase/PostgreSQL **`public.contacts`**, selected through the server's existing Supabase client. The owner comes only from Clerk's authenticated `requireUserId()`. A caller's owner query parameter is ignored. Every page of the database read has `owner_id = authenticatedUserId`.

| Metric | Calculation over current owner records |
| --- | --- |
| Total Contacts | Count distinct `contacts.id`. |
| Cold Leads | Count distinct IDs whose existing `contactSegment(contact.type)` returns `cold-lead`. |
| Active Leads | Count distinct IDs whose existing `contactSegment(contact.type)` returns `active-lead`. |
| Past Clients | Count distinct IDs whose existing `contactSegment(contact.type)` returns `past-client`. |

`lib/contacts/lifecycle.ts` is unchanged. Past/closed/previous-client types map to Past Clients; active/warm/hot-lead types map to Active Leads; the existing default maps remaining types, including imported/unclassified records, to Cold Leads. The helper's precise matching rules are reused, not reimplemented with new classifications.

Distinct means database primary key, not unique name, email or phone. Two records with the same phone remain two contacts. Consent child records do not multiply contacts. DNC, missing consent, market/category and sending eligibility do not remove contacts from their lifecycle totals.

Existing deletion uses physical `DELETE` on owner-filtered contact IDs; the schema has no soft-delete flag. Deleted rows are absent from subsequent snapshots. No invented `deleted_at` or status rule was introduced.

## Findings and corrections

1. **Unpaged database response:** the prior GET computed counts from one Supabase select, which can be truncated by the configured PostgREST row limit. The new reader pages by stable primary key in requests of at most 500 rows and advances by the actual returned length, handling lower server caps too. It requests an exact parent-row count, deduplicates by ID and fails if the complete distinct set cannot be obtained, a page fails, count changes between pages, or an unexpected owner appears. Partial reads never become totals.
2. **Filters and global counts disagreed:** the Contacts page previously displayed global count badges while extra filters hid matching records. It now loads the complete owner cohort once per refresh. Global summary cards are explicitly labeled as workspace totals. Clicking a summary card clears all other filters (including URL search/category), selects the requested lifecycle and opens exactly that complete cohort. Stage tabs show contextual counts from the same filtered dataset as the table, excluding only the selected stage. The server and browser use the same lifecycle/category/query helpers. A visible row count describes the current view.
3. **Stale and cross-session responses:** the hook keys displayed data by authenticated user and query, cancels earlier requests and ignores superseded results. It validates completeness, distinctness, count sums, full-list counts and returned owner IDs before exposing records or totals. A tenant switch immediately hides the previous dataset. Failed, malformed, incomplete or timed-out reads show unavailable values and Retry, not zeros. A successful empty snapshot shows four real zeros and the empty state.
4. **Stage-edit refresh:** confirmed successful create/edit/import, bulk stage/category/consent/delete and single-delete operations signal a refresh. The signal carries no contact data. Open tabs reload their own authenticated endpoint on that signal/storage event; focus, page-show and visibility return also refresh. Existing mutation routes and production records are unchanged by the audit.
5. **Unsupported history:** Contacts summary cards have no fabricated percentages or sparklines. The home dashboard no longer treats current creation dates as historical total-growth snapshots or infers recent stage changes from contact creation dates. Its contact/opportunity/budget displays hide unavailable values; Opportunities links to the existing active-lead filter.

## Scope and consistency

The four summary cards are **global workspace totals**. Local search/category/type/source/compliance/activity/Pulse filters intentionally narrow the list and its contextual stage tabs; they do not redefine the global workspace total. Metric clicks clear that narrower scope to guarantee an exact cohort match. This distinction is stated in the UI.

Counts and rows always come from the same completed fetched dataset. Multi-page reads are not a new transactional database snapshot: concurrent inserts/deletes can cause the read to fail and require retry; no claim of continuously live/serializable production totals is made. Returning to the tab or completing an application edit refreshes the data. External database edits are reflected on the next refresh/focus.

The API keeps its existing top-level response fields and query filters, with an additive `complete` marker. No schema, new lifecycle values, contact records, credentials, eligibility rules or publishing configuration changed.

## Tests and results

- `scripts/contacts-metrics.test.ts`: eight regression groups, integrated into `npm run test:unit` via `test:contacts-metrics`.
- Tests cover 1,207 owner records under a simulated 137-row server cap, owner filtering on every page, second-tenant exclusion, duplicate IDs, shared phone numbers, existing lifecycle aliases, count/filter agreement, stage changes, hard deletion, empty records, failed pages, changing counts, incomplete totals, unexpected tenant records, caller-supplied owner parameters, unauthenticated requests and invalid stages.
- Browser fixtures at 1448 and 390px: metric clicks show exact cohorts, metric clicks clear view filters, contextual tab counts match visible rows, stage-change signals refresh, failed reads hide values, Retry recovers, account switches suppress stale responses, foreign-owner payloads are rejected and empty snapshots show real zero counts. Desktop also executes the real bulk-stage editor against an isolated in-memory API fixture. No database writes occur in these tests.
- [Browser results](browser-results.json).
- `npm run lint`: passed with eight pre-existing warnings, no errors.
- `npm run test:unit`: passed, including all eight new contact-metric regression groups.
- `npm run test:security`: passed.
- `npm run build` and `npx tsc --noEmit --pretty false`: passed.

## Changed files

- `app/api/contacts/route.ts`, new `lib/contacts/read-snapshot.ts` and `list-handler.ts`: authenticated complete read and testable API boundary.
- New `lib/contacts/metrics.ts`, `validate-snapshot.ts`: shared distinct lifecycle counts and client validation.
- `lib/hooks/use-contacts.ts`: identity-scoped refresh, cancellation, unavailable states and freshness events.
- New `lib/contacts/change-events.ts`; Add/Edit/Import modals and Contacts bulk handlers: confirmed-write refresh signals.
- Contacts page/CSS: truthful metric scope, clickable cohorts, contextual tabs, Retry and view count.
- Home dashboard: verified contact metrics, accurate error states and removal of unsupported history indicators.
- `scripts/contacts-metrics.test.ts`, `package.json`: regression coverage included in the standard unit command.
