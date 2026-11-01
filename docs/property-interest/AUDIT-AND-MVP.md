# Property Finder buyer-interest audit and MVP specification

Status: repository audit/design complete; application implementation and execution tests BLOCKED by unavailable execution environment. This document is not a working MVP, approved migration, or hosted-acceptance claim. No production changes or outbound actions are authorized.

Audited revision: 8e64dc4c7db7c26da8724d66ac2953cbbfe08b48 (main, mortgage PDF release). Evidence below refers to that revision.

## Capability audit

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Contact-specific property sharing | PARTIAL | Property Finder selects an owned contact and saves criteria. It copies a tailored Zillow SEARCH URL or opens native email/SMS composers. It does not create an individual-property share record or prove delivery. |
| Unique tracked property links | MISSING | The shared Zillow search URL contains area/budget, not an opaque per-recipient MyARI link. |
| Buyer identification and visit tracking | MISSING | contactId identifies the contact selected by the agent. It does not authenticate a buyer or record a buyer browser session. |
| Property views/link activity | PARTIAL | PROPERTY_SEARCH_ACTION records agent search/copy/composer actions. Generic engagement events exist, but are not evidence of a particular buyer visiting a property or activity inside Zillow. |
| Repeated-property visit trigger | MISSING | Generic rules support contact/message/engagement events. There is no property-view trigger, rolling three-visit aggregation, reload/bot qualification, or atomic property-trigger deduplication. |
| Campaign drafts/enrollment | PARTIAL | Manual builder action=template saves drafts. Generic start_campaign can enroll eligible contacts in an existing campaign, without scheduling step runs itself. Neither is wired to property visits; automatic property-interest draft creation is absent. |

### Source evidence

- components/pages/stitch/PropertyFinderPage.tsx: recordAction, copyLink, smsHref/emailHref, client share controls and workflow links.
- lib/property-finder/history.ts: only search_requested, link_copied, email_composer_opened, sms_composer_opened.
- app/api/property-finder/history/route.ts: owner-scoped audit insert and idempotent agent-event IDs; URL validation accepts supported Zillow search paths.
- lib/property-finder/zillow.ts: outbound Zillow search URL construction/validation; no listing fetch.
- lib/activity/read-model.ts: PROPERTY_SEARCH_ACTION explicitly labels agent activity; sending, delivery and client views are not inferred.
- lib/activity/map-audit.ts and app/api/activity/route.ts: existing CRM activity/alert/read-state infrastructure.
- app/api/automations/rules/route.ts and lib/automations/engine.ts: generic triggers/actions; property aggregation absent.
- app/api/campaigns/builder/route.ts: separate template/activate paths. Draft save spans multiple writes and must not be treated as an atomic idempotent event consumer.
- lib/campaigns/enroll.ts: owned contact/campaign lookup and existing consent eligibility.
- app/layout.tsx, proxy.ts: global marketing scripts/auth wrapper need an explicitly isolated public tracking-page boundary. Do not add a public route without testing those interactions.

## MVP product contract

Agent selects an owned contact, manually adds a permitted Zillow individual-property outbound URL and agent-provided label, chooses a rolling window (default seven days, configurable one to thirty), and explicitly creates a share. No scraping, IDX claims, live listing availability/price claims, third-party property-image copying, or automatic communication. Existing search sharing remains intact.

The buyer opens a MyARI-controlled property introduction. Before application tracking: show a short disclosure, a choice to continue with interest tracking, a view-without-tracking action, and privacy/stop-tracking controls. Explain that Zillow opens separately and MyARI cannot observe activity there. Untracked viewing must remain usable.

Track qualifying MyARI PAGE visits separately from outbound Zillow clicks. A Zillow click is not a Zillow property view and does not count twice. On the third qualifying visit, create an internal agent alert and an ordinary editable campaign DRAFT. Do not enroll contacts, schedule campaign step runs, call a sender, or incur AI/billing usage. Use deterministic reviewable draft copy and the existing campaign editor; no LLM key is necessary for this MVP.

### Attribution limitation — must remain visible

An opaque contact-specific link binds activity to the intended recipient's CRM record. It does NOT prove the person opening a forwarded link is that buyer. A confirmation checkbox is not verified identity. Label the CRM evidence as activity on the contact's assigned link, with identity assurance recipient_link_only. Never display it as independently verified buyer identity.

Stronger verified-buyer attribution would require a separately designed authentication flow, such as verified mailbox access. No automatic OTP email/SMS is authorized here. Do not route buyers through subscriber signup/trial billing or invent verification.

## Reuse and proposed implementation

1. Extend existing Property Finder client controls with a separate interest-sharing panel; preserve Zillow search history.
2. New owner-authenticated shares/settings/revoke endpoints use requireUserId and owner filters on every query. Reject foreign/missing contacts and suppression flags before issuing links.
3. New narrow public introduction/resolve/consent/event/stop endpoints accept only an opaque capability. Resolve owner/contact/property server-side; never trust client ownerId/contactId/propertyId for attribution. Return only agent-provided property content, not contact email/name, CRM notes, token hashes or rule internals.
4. Isolate this public page from MarketingScripts, third-party analytics and auth handshakes that might expose its capability. Keep dashboard/API protections intact. Use no-store, noindex, no-referrer and a restrictive CSP. Validate allowed Zillow origin/path; never fetch Zillow or accept arbitrary redirects.
5. Store cryptographically random 256-bit capability/session hashes, expiry and revocation. Prefer fragment-based share capability with POST resolution to avoid putting it in HTTP URLs/referrers/access logs; test analytics/log behavior before release. HttpOnly Secure SameSite cookies only after tracking choice; do not fingerprint or retain raw IP addresses.
6. A qualifying visit requires disclosed opt-in, explicit buyer interaction, visible-page dwell (proposed fifteen seconds), a server-issued nonexpired session, and server time. GET requests, previews, prefetch/HEAD, known crawler/scanner user agents, retries and reloads never count automatically. GPC/denied/revoked tracking does not qualify.
7. Deduplicate event IDs and one qualifying view per session. Apply a minimum thirty-minute separation across all links for the same owner/contact/property, using a canonical property key. Use a rolling server-time window, never browser-supplied timestamps.
8. These heuristics reduce common automated traffic; they cannot prove a determined client is human. Do not claim perfect bot detection.
9. At threshold, use a single service-only transaction/RPC with tuple-scoped locking and a unique trigger ledger. Insert the qualifying visit, trigger record, draft campaign/steps and audit alert atomically. A failed draft insert must not leave a permanent claimed trigger; retries must not create duplicates.
10. Default to one trigger per owner/contact/property for the MVP, even if the link is reissued. Any future rearm/cooldown workflow must be explicit and tested; do not silently trigger again after a campaign is deleted.
11. Reuse audit_logs mapping/contact timelines and Activity notifications. Show qualified visits, excluded/reload status where appropriate, time window, trigger state, draft link, tracking scope and attribution caveat.
12. Never call the generic automation evaluator from this new event path: it permits sending/enrollment actions. Reuse existing draft/step data structures and authoring UI through a dedicated draft-only transaction, rather than weakening existing activation/consent guards.

## Proposed additive database migration — NOT executable or approved yet

Proposed objects:
- property_interest_shares: owner/contact/property key, canonical Zillow URL, label, window, threshold=3, capability hash, expiry/revocation and timestamps.
- property_interest_sessions: share-bound opaque session hash, consent/disclosure version, server start/expiry/revocation.
- property_interest_events: share/session-bound event ID/type/time and qualification result; no raw capability, IP or email.
- property_interest_triggers: unique(owner_id, contact_id, property_key), trigger state and generated draft campaign ID.

Indexes: unique capability/session hashes; owner/contact/property/time visit lookup; unique session view and request-event keys; unique trigger tuple; expiry/revocation lookups. Foreign keys must preserve owner/contact/share consistency. No broad alteration of existing CRM tables or existing-row backfill.

RPCs: create/revoke share and accept/qualify a visit with atomic draft/notification creation. Fixed search_path, SECURITY INVOKER, explicit input/owner binding. RLS on all new public tables; no direct anon/authenticated table or RPC grants. Service-role access stays server-only behind narrow authenticated/capability APIs. Clerk text owner IDs are not Supabase auth.uid UUIDs or Clerk organization IDs.

Exact executable SQL must be generated with the Supabase migration CLI, reviewed against actual schema/defaults/constraints, and tested in disposable PostgreSQL before approval. Do not invent an approved migration timestamp or apply a draft to hosted staging/Production. Installation should be transactional, additive and free of DROP/TRUNCATE/DELETE/unrestricted UPDATE. Function-body writes must be listed separately in the approval review.

Recovery: disable this feature and revoke new links; retain existing contacts, campaigns and audit history. No contact/consent/subscription mutation is needed. A failed install rolls back its transaction; after successful install, prefer retaining additive objects with access disabled. Do not delete generated drafts or restore a backup automatically. Any destructive cleanup requires scoped evidence and separate approval.

## Acceptance matrix to execute

- Three real qualifying sessions inside window -> one alert and one reviewable draft, zero recipients/step runs/provider/billing calls.
- Reloads, duplicated requests, parallel third visits, multiple shares to same property and process restarts -> no double count/trigger.
- Expired window/session/link; revoked/denied/GPC tracking; bot/scanner/prefetch; too-short dwell/gap -> no qualifying count.
- Foreign owner/contact IDs, swapped share/session IDs, invalid/tampered capabilities, open redirects, guessed URLs -> denied with nonrevealing errors.
- A forwarded-link visit never gains a verified identity label.
- DNC/opt-out after link creation and immediately before trigger -> suppression respected; tracking choice never grants channel consent.
- Draft/step/audit fault injection -> no orphaned permanent trigger or partial campaign; safe replay.
- Public route carries no contact PII or tokens to analytics/referrers/logs; dashboard protection unchanged.
- Owner-visible interest timeline and internal alert; draft opens in existing campaign editor, edits/reloads correctly, explicit approval remains mandatory.
- Desktop/tablet/mobile and keyboard/no-tracking flows; screenshots from actual rendering, not design mockups.
- Existing Property Finder/campaign/compliance regressions; hosted synthetic fixture cleanup with baseline preservation.
- Disposable schema tests: RLS/RPC browser denial, trusted service scope, constraints, atomic concurrency, rollback and existing-record preservation.

## Preview readiness and genuine blockers

No implementation, SQL execution, browser tests, screenshots or working Preview is claimed by this audit.

The attached execution environment currently has no usable executor (offline, observed pending); shell/browser/database-runner actions cannot execute. Repository/API read checks worked. Runtime credential observations are unknown, not ready.

A separate isolated feature Preview must be prepared; do not repurpose the Concierge/Assistant branches or inherit Production providers. Automatic Git deployment for feat/property-interest-mvp is disabled in this branch's vercel.json. Use Clerk Development and test Supabase jojgdfpmaxvbhobjrsbm, blank sending/billing/scheduler providers, and a fail-closed effective-configuration check before deployment. Reuse verified nonsecret configuration; do not retrieve/copy write-only secrets. Determine secure credential provisioning only after a usable runner exists.

Remaining implementation requires a usable execution environment, schema approval as applicable, independently verified Preview isolation, and authorized synthetic authenticated sessions for hosted acceptance. The current sole verified Development identity does not by itself establish two-account hosted isolation. No Production approval is requested at this stage.
