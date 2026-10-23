# MyARI complete platform audit and refinement

Date: 2026-10-23. Branch: `audit/platform-complete`. Base: `7b728c1e735d03f32b2cf2984eaa2dc034062818` (merged PR #31).

## Outcome and release decision

All 17 phases were addressed through repository discovery, source inspection, isolated reproductions, safe repairs, image/branding refinement and the available automated checks. **This is ready for code review, not an unconditional production-readiness sign-off.** There are unresolved P0/P1 release gates below. At audit completion, nothing had been pushed or published. The subsequent explicit push request authorizes GitHub branch/PR publication for review only; production deployment, merge and migration remain unapproved. No live communications, charges, credential changes or subscriber writes were performed.

Production database grants, actual subscriber totals, Stripe records, provider consoles, Vercel settings and authenticated live sessions were unavailable for verification. Local environment readiness is not proof of production connectivity.

## 1. Discovery and route coverage

- Next.js 16.2.6, React 19, TypeScript, Tailwind 4, existing custom luxury components. Clerk authentication; server-side Supabase service-role access; Stripe, Twilio, Slybroadcast, Resend, Anthropic, ElevenLabs, Google Calendar, optional Dotloop, optional mortgage-rate sources.
- **155 route files: 42 page templates and 113 API handlers.** [Every implemented route, source and authentication boundary](ROUTES.md); machine-readable [routes.json](routes.json).
- Dynamic feature/article slugs expand to **48 concrete public content paths**, including homepage, features, pricing, resources/articles, contact, playbook, SEO landing pages and seven legal pages. [Expanded paths](public-paths.json).
- Authenticated inventory includes Dashboard, Contacts/profile, Properties, Campaigns/detail, Calendar, Mortgage/Financing, Notes, Tasks, Voice Scripts, Activity, Analytics, Delivery, Settings, Partners, Automations/rules. Ask MyARI is a shared drawer, not an invented independent route. Billing and account management are Settings/auth/provider workflows.
- Booking token pages, OAuth callbacks, signed asset URLs, authenticated subscriber screens and third-party hosted checkout/sign-in require real authorized tokens/providers for live end-to-end checks; those were source-reviewed and/or exercised with mocks, not claimed live-verified.
- An inventory row means its source/boundary was cataloged. It does **not** mean every nested dialog, permission state and production integration was exercised. The testing matrix below is the evidence of runtime coverage.

## 2. Prioritized findings and repairs

| ID | Priority | Finding / evidence | Local repair or required action |
|---|---|---|---|
| SEC-01 | P0 release gate | Legacy SQL uses `USING(true)` policies on core tables. With ordinary browser-role table grants, an anonymous role can read tenant rows. Reproduced in PGlite; live grants are **unverified**. | Prepared `20261028000000_legacy_server_table_access.sql`: revoke public/anon/authenticated table access, retain server-role access, enable RLS for the 21 named legacy tables. Tested denial of browser reads/writes. **Migration not applied; approval and production privilege review required.** |
| SEC-02 | P1 | Partner invitation/share POSTs accepted arbitrary partner/asset IDs while inserting with the caller owner. This allowed forged cross-owner relationships; no live data exposure is claimed. | Added owner-scoped partner and supported-asset lookups before writes. Foreign IDs return 404. Campaign/voice/note sharing is supported; unverified script/contact-list models fail closed. Positive owned sharing remains tested. |
| SEC-03 | P1 | Generic exception responses/logs and numerous direct DB failures exposed internal diagnostics; contact and Claude errors included provider text. | Generic subscriber-safe unexpected errors, payload-free shared logging, safe direct DB errors across 17 routes, safe email/Stripe provider errors, no Claude response-body logging. Existing intentional validation/auth codes preserved. |
| SEC-04 | P1 | `/api/health/db` was public and performed an unscoped service-role contact count; returned database hostname/diagnostics. | Requires Clerk user, scopes query by owner, returns health boolean without hostname/raw DB details. Anonymous local request confirmed rejected. |
| BILL-01 | P1 | Any non-active/trialing Stripe subscription was reported canceled, including past_due/incomplete/unpaid. | Unsupported lifecycle states now return unverified rather than a fabricated cancellation. Active/trialing/canceled checks retain provider ownership validation. Full UI modeling of past_due/unpaid remains a separate enhancement. |
| BILL-02 | P1 | A thrown Stripe error containing “idempotent” was treated as successful billing. A key collision is not a receipt. | Exceptions now remain unconfirmed, with safe diagnostics; normal successful Stripe replays remain handled by the SDK. No amounts, prices, keys, charges or subscription actions changed. |
| DATA-01 | P1 release gate | Quota counts engagement rows, not distinct provider submissions. A synthetic single submission reports 0 before a receipt, 1 with a sent event, 2 with sent+delivered. Parallel requests also have no atomic quota reservation. | Reproduced in [usage-evidence.json](usage-evidence.json), via `platform-usage-evidence.cjs`. **Not silently rewritten:** requires reviewed authoritative submission/reservation ledger, unknown-outcome treatment, historical reconciliation and agreed billable event definition. Current usage/estimated overage totals cannot be certified accurate. |
| BILL-03 | P1 business decision | Pricing advertises included-plan overage rates, but `assertCanSendChannel` blocks at included SMS/RVM caps; `billPaygUsage` skips included plans. | Documented; do not silently alter commercial promises, prices or charging rules. Decide whether published overages or hard caps are intended before implementation. |
| AI-01 | P1 cost/reliability | General AI drafting lacked a timeout, input length bounds and per-subscriber rate/usage enforcement. Briefing has separate bounded daily claims; it does not protect all AI endpoints. | Added 15s Claude timeout, bounded prompt/context fields and untrusted-notes instructions. **Platform-wide atomic AI throttling and product quota policy remain open.** No arbitrary commercial allowances introduced. |
| AI-02 | P2 | Template fallback asserted verified engagement/conversion and prior contact without evidence. | Removed those claims; fallback explicitly states that engagement history was not verified. Template provider label remains distinct from Claude. |
| UX-01 | P2 | Partner UI said “Invitation sent” although backend only saves a record; no email or recipient acceptance route was found. | Button/copy now says “Create invitation”; success says no email was sent. Delivery/acceptance/expiry implementation remains missing. |
| UX-02 | P2 | Health advertised live sending from credentials alone, ignoring outbound pause. | `liveSending` now respects `ALLOW_LIVE_OUTBOUND`; health wording distinguishes configuration from verified connectivity. |
| PERF-01 | P2 | Property Finder CSS artwork loaded a 3,081,227-byte PNG directly. | Added equivalent 1448×1086 WebP at quality 92: 537,008 bytes, **82.6% smaller**. Property presentation now uses it; original approved artwork remains available. No fabricated listings. |
| IMG-01 | P2 | Several marketing images declared 1200×900 or 1360×860 despite 1024×576 / 1024×768 source dimensions. | Corrected intrinsic metadata to the actual source sizes, improving aspect-ratio reservation. Photography and approved headlines unchanged. |
| PERF-02 | P2 | Campaign detail recreated an empty recipient array every render, invalidating memo dependencies. | Stable memoized fallback. Lint warnings reduced from seven to four. No claim of measured global bundle/load-time improvement. |
| BRAND-01 | P2 requested | Subscriber requested a deeper beige, slightly larger MyARI logo. | Sidebar logo height 106→122px, deeper beige display treatment; short windows use 108px to protect navigation. Original artwork, tagline and routes preserved. |

## 3. Premium visual review, typography and spacing

The approved ivory/champagne/bronze design is preserved. No global 10–15% shrink was forced onto already-refined screens. Existing compact toolbars, table density, cards, headers, focus styles, reduced-motion handling and responsive collapse rules were retained. Sidebar logo refinement, honest invitation/error states and corrected image geometry are the intentional visual changes.

Desktop/tablet/mobile browser fixtures cover Contacts, Property Finder, Campaigns, Delivery/Analytics, Calendar, Notes, Financing, Tasks, Voice Studio, Activity, Settings/Brand Kit and Dashboard. The final-card bottom spacing from PR #31 remains intact. No approved headline, pricing/legal copy, hero photograph or navigation label was replaced.

Screenshots are synthetic fixtures, never live subscriber records. [Dashboard before](screenshots/dashboard-before-1440.png), [dashboard after](screenshots/dashboard-after-1440.png), [mobile after](screenshots/dashboard-after-390.png). Additional representative public/property captures are in the screenshots folder. Public captures are server-rendered with JavaScript disabled to avoid external Clerk bootstrap and external font requests blocked; fallback font appearance is a capture limitation, not a claimed production typography defect. They are not proof of interactive sign-in or form operation.

## 4. Complete image audit

[images.json](images.json) inventories all bundled raster/SVG assets, dimensions, byte sizes, literal references and exact duplicate groups. It includes 50 files after adding the optimized sheet. No missing literal image paths were found after excluding a documentation wildcard. Template-based local constants are expanded when discovering references.

Seven exact duplicate asset groups exist, largely legacy hero aliases and logo duplicates. Contacts also currently uses the same approved living-room source as Dashboard; a unique approved Contacts photograph is a remaining P2 art refinement, not silently replaced during this audit. Duplication alone is not a defect; active unrelated page heroes were not replaced merely to eliminate hashes. Public screenshot mockups are reused across feature pages and may not show the latest application layout. They are marketing illustrations, not proof of live data. Updating those approved assets requires a separate content decision.

Marketing Pulse’s existing 1024×341 property photograph remains source-limited on large high-DPI displays. Several legacy voice/public mockup assets are also 1024px sources. No fake upscaling was applied. New higher-resolution approved originals would be needed for genuine extra detail. CSS cover/cropping is preserved rather than stretching images. Uploaded avatars/listing photographs and inaccessible external URLs cannot be audited without authorized records.

## 5. Functionality and workflow audit

| Area | Verified locally with synthetic/mocked boundaries | Remaining verification / limitations |
|---|---|---|
| Contacts | Combined filters, query/search/sort, pagination, selection/bulk ownership, profiles, stage/count consistency, notes and returning filter state | Actual production totals (including prior 234/232/2/0) unverified |
| Property Finder | Contact preferences, supported Zillow URL generation, save/edit/search history, navigation, empty states, ownership | No IDX/MLS integration found; optional beds/baths/area criteria may be saved without being representable in the supported external URL. No fabricated listings/matches. Zillow external behavior can change and was not scraped. |
| Campaigns | Library filters, grid/list, preview drawer, nested voice test overlay, builder/recipients, mocked delivery and isolation, duplicate claims | No activation or real sends. Provider event coverage and quota ledger remain release gates. |
| Calendar | Preferences conflicts, appointments/recurrence, callbacks, timezones, booking/token logic, mocked Google sync | Real Google grant/refresh/sync and live public booking token not verified |
| Notes | Compatibility mode, autosave/CAS, notes/contact/task associations, persistence and errors | Required production schemas/permissions remain unverified |
| Tasks | Templates/checklists, owner isolation, grouping/due dates, reviewed AI proposals, workflow handoffs | Live records and provider reminders unverified |
| Financing | Calculator inputs, scenario math, partners, reports, handoffs, mock data boundaries | Rates/provider freshness and real partner/account data unverified; estimates are not loan commitments |
| Voice Studio | Cloud draft recovery/CAS, mocked microphone/upload/audio, reviewed transcripts, recording versions/approval and campaign assignment checks | Actual browser devices, paid transcription/synthesis and provider delivery not exercised |
| Activity/Analytics | Mock evidence, filters, private-state suppression, source links and missing/empty data | Production completeness, provider receipts and shared-number attribution unverified |
| Settings | Profile/CAS, branding validation, team ownership guard, server-only API-key restriction, billing/provider status boundaries | Team roster is not a complete multi-user invitation/RBAC system. API-key issuance is not implemented. Provider/SSO/MFA flows need authorized live sessions. |
| Partners | Foreign-reference rejection, owned supported sharing, truthful invitation messaging | Email invitation delivery, recipient acceptance, expiration and full sharing ACL workflow are absent |
| Ask MyARI | Task-specific structured parsing, mocked provider failure, safe template fallback and grounded briefing | Main experience is task/draft forms plus a drawer, not an unrestricted CRM action agent. General tool calling, full durable conversational history and complete authorized cross-tab CRM tool retrieval are not implemented. |
| Auth/account | Local anonymous API gates and mocked owner switches; Clerk implementation preserved | Real signup/SSO/session recovery and team membership need provider-enabled staging |
| Public | All 48 content paths render; 4-width overflow scan on homepage/pricing/features/resources/contact; all discovered internal destination paths exist; contact provider failure mocked | Public menu/form interactive E2E, real signup, email delivery, external links, legal review and third-party hosted pages are not certified |

## 6. Data accuracy and metric sources

| Metric/status | Source and calculation | Finding |
|---|---|---|
| Total contacts | Owner-filtered paginated `contacts` snapshot, distinct IDs; existing deletion rules | Tested with fixtures, actual production count unverified |
| Cold/Active/Past clients | Same snapshot and existing lifecycle helpers used by list segments | Existing consistency/stage-change tests pass; no new classification invented |
| Opportunities | Existing active-lead classification | Relationship count, not a transaction forecast |
| Active lead budgets | Sum actual positive budgets on active leads; coverage shown | Not estimated property value or invented pipeline revenue |
| Campaigns sent | Distinct current owned campaigns with non-mock sent evidence | Not message volume; unavailable remains unavailable |
| Active campaigns | Existing sending/launch-gate rule; queued excluded | Dashboard/library filter consistency tested |
| Delivery/open/reply rates | Owner-scoped outbound message and authenticated event evidence with explicit period/channel capability | Voicemail submission is not confirmed delivery. Unknown/unsupported metrics must remain unavailable. Production coverage unverified. |
| Quotas / estimated overages | Currently engagement-event row count in `plan-limits.ts` | **Known mismatch; do not certify usage/billing accuracy until ledger repair** |
| Task priorities | Owned open status and actual due timestamps in configured timezone | Fixture tests; no invented urgency |
| Briefing replies/missed calls | Verified attributed inbound records and call-leg evidence | Shared-number ambiguity quarantined; completed call is not proof of human answer |
| Subscription display | Stripe customer owner check + real subscription list | Unknown non-active states no longer mislabeled canceled; credentials/records unverified live |
| Integration state | Configuration flags or saved authorization; separate provider verification | Existence of credentials/auth record is not operational health |

## 7. Public content contradictions and approval items

Sources: `SITE_OFFER`, `FOUNDING_100`, `PLAN_OPTIONS`, `plan-limits.ts`, Stripe checkout/claim/read-status code, feature/resource pages and public rendered pages.

- Published Starter/Growth/Pro prices are $49/$99/$199, Team from $299. These are code-defined offers, **not verified live Stripe price values**. No price was changed.
- Trial defaults to 14 days but can be overridden by `STRIPE_TRIAL_DAYS`; several metadata/article statements say 14 days unconditionally. Requires business confirmation of deployed setting before changing public/legal language.
- Founding 100 banner is enabled in code; no verified live seat-availability count was found. Eligibility and commercial promise need review; no offer was silently disabled.
- Starter promises individual sends while multi-step campaigns begin on Growth. Verify plan enforcement across all creation/run/manual flows before treating the marketing promise as a permission guarantee. Existing quota guard is not sufficient proof of every entitlement.
- Included-plan overage promises conflict with hard send caps (BILL-03). Decide contract behavior before correction.
- Google Calendar OAuth/callback implementation exists and requires credentials, application URL and token encryption. Public “built in” language must not be read as every account being connected.
- Shared Twilio replies/calls cannot be reliably assigned just from a shared number. Do not advertise universal personal-cellphone tracking or subscriber-attributed inbound handling until routing is verified.
- Ringless voicemail adapter exists; accepted submission is not confirmed delivery or listening.
- Property Finder is saved preferences + supported Zillow links, not live IDX/MLS access. No paid integration was added.
- AI drafts and briefing exist; full autonomous CRM action-agent/tool capabilities are not implemented. No public claim was expanded.
- White-glove setup timelines and provider/legal disclosures are business commitments, not facts that a local code test can establish. Pricing, legal and contractual text were left unchanged.

## 8. Integration health and required configuration review

| Integration | Implemented boundary | Live status / required review |
|---|---|---|
| Clerk | Proxy/auth, server user checks, account/session/MFA information | Production identity flows UNVERIFIED; not modified |
| Supabase | Service-role owned queries, RPCs, private storage | Production grants/schema UNVERIFIED; review SEC-01 before release |
| Twilio SMS/Voice | Signature validation, account check, normalization, dedup, shared-number quarantine/transport holds, call legs | Console webhooks/forwarding/routing UNVERIFIED; do not alter live callbacks without approval |
| Google Calendar | Owner-bound OAuth state, implemented callback, encrypted tokens, refresh/sync | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_BASE_URL`, optional `GOOGLE_OAUTH_REDIRECT_URI`, token-encryption setup UNVERIFIED in Production. Redirect override precedes APP_BASE_URL callback fallback. Blank override edge case and canonical domain require configuration review. |
| Anthropic | Server-only model/key, task schemas, bounded request timeout, briefing daily cache/claims | Credentials/live response UNVERIFIED; general drafting rate limits still needed |
| ElevenLabs/OpenAI transcription | Existing server-authorized voice/profile and transcript paths | Paid provider readiness UNVERIFIED; mocks only |
| Stripe | Ownership-bound checkout/claim/portal, signed webhook, read-only status verification | Actual price IDs, trial config, receipts, invoices and subscriptions UNVERIFIED. No charges/subscription changes tested. |
| Resend | Contact/email adapter and delivery callbacks | Credentials/delivery UNVERIFIED; contact/lead-intake endpoints need abuse controls before broad launch |
| Slybroadcast | Signed audio submission and authorized disposition ingestion | Account and callback flow UNVERIFIED; no real voicemail sent |
| Dotloop | OAuth and owned connection records | Saved authorization is not a live health check; live grant UNVERIFIED |
| Property/rates | Zillow adapter; configured rate/provider services | No IDX/MLS identified; external search/rate availability not guaranteed |

Runtime credential binding readiness seen in the managed workspace applies only to this execution environment. No production secret values were inspected or revealed. Source canonical URL is `https://www.myari.io`; Stripe’s unset-URL fallback uses non-www and Google uses APP_BASE_URL/local fallback. Actual Vercel domain aliases/settings were not verified, so no canonical production redirect assertion is made here.

## 9. Campaign safety and AI review

Existing owner checks, consent/suppression, opt-out handling, quiet hours, per-run/recipient claims, live-outbound kill switch, placeholder validation, safe voice preview and explicit approval interactions are retained. Existing isolated campaign/communications tests cover duplicates, unknown outcomes, synthetic STOP/START, forged callbacks and tenant boundaries. Testing did not activate campaigns or modify schedules.

Daily briefing has opaque validated source IDs, owner/day caching, paid-call bounds, private settings and opt-in in-app scheduling. General AI drafting has no corresponding platform-wide quota; the briefing limit must not be advertised as protecting all AI usage. Supplied client context is not the same as server-verified CRM retrieval. No new agent/tool execution was invented.

Untrusted-note instructions reduce prompt misuse, but prompt wording is not a full security boundary. Actions remain existing explicit user workflows; production outbound safety still depends on approved routing, quota accounting, provider evidence and actual consent records.

## 10. Security and reliability boundaries still needing work

- Verify and apply the reviewed legacy privilege migration only after approval; validate all deployed schema variants, browser grants and storage policies with an authorized administrator.
- Repair quota/reservation accounting before certifying messaging allowances or concurrent send safety.
- Define and implement platform-wide AI and public lead/contact abuse limits; no new paid CAPTCHA/WAF service was purchased.
- Shared-number routing needs an authorized review/release process; existing quarantine is safe refusal, not complete subscriber communication functionality.
- Partner recipient acceptance/expiry, true team membership/RBAC and API-key issuance remain incomplete. No permission-looking UI is proof of implemented server membership semantics.
- Removed submitted email from the public playbook failure warning as well as repairing core API/Claude/Stripe payload logging. Historical logs and provider-side retention were not inspected or purged.
- Unexpected malformed JSON currently receives a safe generic server failure from the shared wrapper; more precise per-route 400 handling remains a P2 follow-up. It no longer exposes parse internals.
- No real credential leak, production cross-tenant access or provider connectivity result is claimed without access.

## 11. Performance findings

Measured asset improvement: direct Property Finder artwork transfer 3,081,227→537,008 bytes at identical 1448×1086 dimensions (82.6% reduction). Existing Next image optimization remains enabled where already used. Corrected intrinsic mockup sizes reduce incorrect geometry reservation. Campaign recipient memo dependencies remain stable. General AI has a bounded 15s provider wait, and contact delivery a bounded 15s wait.

No controlled production load test, database EXPLAIN, authenticated real latency profile, bundle-regression budget or external-provider performance test was available. Build output is retained in test evidence, but no unmeasured global page-speed percentage is asserted. Several owned-read paths paginate all rows (analytics/activity/settings history); large-tenant load testing remains recommended. Do not trade tenant checks for caching speed.

## 12. Tests, screenshots and known limitations

Final executed results are recorded in `test-results.json`; logs are retained under `logs/` where appropriate. Available suites include lint, TypeScript, full unit chain, security checks, regression checks, all 11 browser scripts, all four original PGlite suites, the new legacy-privilege suite, local API smoke and public-content rendering.

Nine new regression cases cover error/log redaction, malformed JSON/auth, health tenant scope, email-provider errors/timeouts, truthful AI templates, foreign sharing references, health kill switch, unknown Stripe states and idempotency exceptions. Existing billing/campaign tests are retained.

Public pages: 48 local content routes, 200 responses; homepage/pricing/features/resources/contact at 1440/1920/768/390px with no page overflow. Public captures block external requests and disable JavaScript, so public interactive form/Clerk behavior remains explicitly unverified. Authenticated browser harnesses execute actual components with synthetic API boundaries at desktop, laptop, tablet and mobile widths; they are not real multi-user staging sessions.

A preliminary post-change browser run overlapped a production build and failed when `.next/static/css` was being regenerated. This is a test sequencing/artifact failure, not evidence of a product regression. Final browser reruns are sequential after a stable build; retain the failure history rather than hiding it. Lint has four pre-existing font/OAuth-image warnings and no errors after the memo repair. There is no claim of a full WCAG certification or every possible dialog/input state.

## 13. Approval and review instructions

1. Review this branch locally or in its review PR after the subsequently authorized push. Do not merge, deploy or apply the migration without separate approval.
2. Read SEC-01 and DATA-01 first. Review the migration against the actual production grants and data access architecture; do not apply it automatically.
3. Review the billing-status/error-classification repairs with mocked tests. No pricing, charges or active subscriptions were changed.
4. Run `npm run audit:inventory`, `npm run test:platform-audit`, the existing test commands, and PGlite via `PGLITE_MODULE=/tmp/myari-financing-qa/node_modules/@electric-sql/pglite npm run test:platform-db` (or install the test-only PGlite runner in your QA environment).
5. Use an isolated staging database, synthetic accounts and mocked providers for authenticated walkthroughs. Keep `ALLOW_LIVE_OUTBOUND` disabled. Validate OAuth, storage and provider callbacks only with authorized test credentials.
6. Approve commercial quota/overage semantics, full team/partner workflows and production rollout separately. This audit is complete as a review artifact; unresolved release gates mean the whole platform is **not yet certified production-ready**.

## 14. Phase completion map

| Requested phases | Work completed |
|---|---|
| 1 Discovery | 155-route inventory, public slug expansion, architecture and unavailable areas |
| 2–4 Premium/images/type | Preserved approved layouts; requested logo refinement, image dimensions, optimized property artwork; duplicate/source-quality inventory |
| 5–6 Function/data | Full available harnesses, new ownership/error repairs, metric source table, reproduced quota mismatch |
| 7 Content | All public content paths, link destinations, offer/provider/entitlement contradictions and approval list |
| 8 Integrations | Implementation/configuration boundary audit with explicit live UNVERIFIED statuses |
| 9–10 Campaign/AI | Existing safety coverage rerun; AI/billing reliability fixes; capability and quota gaps |
| 11–12 Responsive/performance | Desktop/tablet/mobile fixture checks, public overflow checks, measured asset reduction and memo repair |
| 13–14 Security/repair | P0 local reproduction/migration proposal, foreign-reference checks, privacy repairs and prioritized findings |
| 15–16 Tests/visual review | Available suites and before/after captures, documented limitations and preliminary harness failure |
| 17 Delivery | Report, route/image/test inventories, file manifest, review branch; no production deployment |

## 15. Files changed

See [FILES.md](FILES.md) for the complete final tracked/untracked review manifest. Historical screenshots regenerated by older harnesses are backed up locally; only intentional audit review images should remain in this branch diff.
