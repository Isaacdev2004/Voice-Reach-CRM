# Dashboard typography and layout refinement

Focused refinement of the existing premium `/dashboard`, on `ui/dashboard-typography-refinement`, based on current `main`. The separate, unmerged AI assistant PR #26 is not included. The user's latest instruction authorizes automatic deployment of this dashboard change after checks.

## Changes

- Preserved the exact DASHBOARD eyebrow, “Your business. Beautifully in motion.” headline, “Your priorities, progress, and opportunities—all in one clear view.” description, MyARI logo/tagline, hero photograph, hero action routes, navigation and existing section arrangement.
- Hero: desktop headline 38–42px with 1.12 line height; supporting description 16px (15px mobile); desktop hero approximately 300px instead of 340px, an approximately 12% reduction. Same image asset/crop alignment; no new photograph or overlay.
- KPIs: 32px desktop/30px mobile numbers, 13px labels and clearer contrast. All four cards now navigate: Total Contacts → explicit all-contact view, Campaigns Sent → all-time analytics, Opportunities / Active Lead Budgets → active-lead Contacts. Explicit query state overrides remembered filters using existing Contacts behavior.
- Marketing Pulse: retained the composition, content, photography, Last 30 days destination and measured analytics. Headings are 19–20px, descriptions 13–14px, with three supporting lines available on the educational card instead of two. More even padding/alignment. No new statistics, trends, or claims.
- Recommendations: 14px titles, aligned 60px thumbnails, 12px metadata and more legible badges. Existing template actions remain. Added a safe retryable error message and prevented concurrent duplicate clicks while the original request is pending. QA blocks all writes.
- Recent Campaigns: clearer compact rows/badges, tabular numbers, two-line titles and correct row-click destinations. Existing owned campaign-library data supplies actual step and unique enrollment counts; delivery recipients are no longer mislabeled as enrollments. Unknown reply rates remain a dash. Empty/error states are compact and distinct, with retry on failures.
- Daily priorities: compact dashboard-only presentation and useful Tasks/Calendar/Activity links. Existing verified priority API and timezone handling remain. A data attribute identifies the evidence source for future Morning Briefing integration; no nonfunctional AI control was added. Calendar's use of the shared component retains its existing presentation.

## Data accuracy and sources

| Display | Existing source / definition |
|---|---|
| Total Contacts | Complete owner-validated `useContacts` snapshot, `meta.total` |
| Opportunities | Same snapshot's existing `counts.activeLead` lifecycle definition |
| Active Lead Budgets | Existing `sumActiveLeadBudgets` over that snapshot; only valid positive budgets on active-lead contacts; not projected deal value |
| Campaigns Sent | Existing `/api/analytics?range=all`, `confirmedSentCampaigns`, with nonnegative integer validation |
| Active campaign detail | Existing `/api/campaigns/library` and existing `countActiveCampaigns` status definitions |
| Recent campaign steps | Owned campaign library `stepCount`, not invented progress |
| Recent campaign contacts | Owned campaign library `enrollmentCount`, not the smaller delivery-recipient cohort |
| Recent delivery rate | Existing last-30-days analytics, only when successful/live and a valid measured volume/rate exists; measured 0% is retained |
| Reply rate | Unavailable in the existing feed; shown as a dash |
| Daily priorities | Existing `/api/activity/priorities`: actual owner-scoped due/overdue tasks, upcoming contact appointments and recorded showing reviews, using the subscriber calendar timezone |

No conversation-awaiting-reply count is invented: this summary does not have verified reply correlation. It explicitly offers **Review conversations** and labels reply status as not tracked here. No historical growth or trend graphic is added. Failed campaign reads no longer become false “No campaigns” results or “No campaigns in progress” details. Frontend requests are abortable and account-scoped page instances still reset on subscriber changes.

No backend business logic, API contract, database schema, authentication, provider credential, permission, subscriber record, campaign automation, consent, sending or scheduling change was made.

## Before and after

| Width | Hero before → after | Headline before → after | Description after | KPI after |
|---|---|---|---|---|
| 1440px | 340 → 300px | 48.96 → 38px | 16px | 32px |
| 1920px | 340 → 300.66px | 56 → 42px | 16px | 32px |
| 768px | 340 → 300px | 40 → 38px | 16px | 32px |
| 390px | 528.16 → 522.38px | 35 → 31.2px | 15px | 30px |

The mobile image stays intact and the controls wrap naturally. The primary reduction is intentionally on desktop. Existing colors, layout and brand identity are preserved.

[Comparison gallery](index.html)

- [1440 before](before/dashboard-1440.png) · [1440 after](after/dashboard-1440.png)
- [1920 before](before/dashboard-1920.png) · [1920 after](after/dashboard-1920.png)
- [Tablet before](before/dashboard-768.png) · [Tablet after](after/dashboard-768.png)
- [Mobile before](before/dashboard-390.png) · [Mobile after](after/dashboard-390.png)
- [Empty state](after/empty-1440.png) · [Error state](after/error-1440.png)
- [Measured browser results](after/checks.json)

These are actual components with isolated synthetic subscribers and mocked API responses, not production account screenshots. Synthetic values are confined to the browser test, never application components. All write requests are blocked. The mock deliberately uses seven enrollments versus three delivered-to recipients to verify the distinction.

## QA results

- Production build: passed.
- TypeScript: passed after regenerating Next route types for the current main-based branch.
- ESLint: zero errors, seven existing unrelated warnings.
- Full unit suite: passed, including three new dashboard data-presentation regression cases (enrollment/step counts, valid zero/unavailable metrics and recent ordering).
- Security and regression scripts: passed.
- Actual-component Chromium: passed at 1440, 1920, 768 and 390px; no document overflow or page errors.
- Exact wording, unchanged hero action destinations, KPI links, correct recent campaign row navigation, existing recommendation request/error handling, real zero/empty/unavailable states, and subscriber-switch cleanup verified.
- Before/after desktop and mobile images inspected directly. No clipped hero controls or overlapping data cards found.

## Remaining limitations and release

Production subscriber records have not been queried or independently reconciled. Authenticated live browser QA is not available in this session; the screenshots/tests are synthetic. Existing legal consent and outbound workflows were not exercised with live providers. Reply rates/unanswered conversation counts remain unavailable, explicitly labeled rather than fabricated.

Per `docs/RELEASE.md`, production deployment is triggered by a reviewed CI-green PR merge to `main`. The user's latest instruction authorizes proceeding automatically for this focused dashboard change. No migrations or unrelated assistant work are required/included. Check the Vercel status on the exact main merge commit, and report hosting completion only when verified. Runtime credentials and live-outbound settings must not be changed as part of this visual release.

## Principal changed files

`app/dashboard-luxury.css`; `components/pages/stitch/OperationalDashboardPage.tsx`; `components/crm/dashboard-recent-campaigns-table.tsx`; `components/crm/dashboard-recommended-for-you.tsx`; dashboard presentation in `components/activity/daily-priorities.tsx`; `lib/dashboard/campaign-display.ts`; QA scripts, package test commands, review artifacts and release/staging/security/demo documentation.
