# MyARI premium Assistant workspace

> Current refinement and release status: see [LUXURY-REFINEMENT.md](LUXURY-REFINEMENT.md). The original audit below records the first implementation and earlier configuration blockers; it is historical where superseded.

Implementation branch: `feat/premium-assistant-workspace`. Base main revision: `aabbf1aa25e679e70b251b4c8ed9af9cb6740982`. This work is separate from authentication draft PR #49. Production is unchanged.

## Existing architecture audit

- Production metadata inspected: Vercel `voice-reach-crm`, team `magnificent-soless-projects`, Ready deployment `dpl_7oyVsu1sXk1raF9pgCAcfmwuAGZf`, main revision aabbf1a. This is a read-only observation, not an assertion of live owner activation.
- AiAssistantProvider is in DashboardShell. The former OperatingAssistant held its own conversation, composer and proposals and returned a Modal. AssistantVersion replaced it with the legacy component when Claude was chosen, unmounting the session. The return control was outside the legacy Modal. That combination caused state loss and unreliable navigation.
- `/dashboard/assistant` formerly rendered a separate CommandCenter work list. The old `<a>` navigation to it caused document navigation rather than a shared conversation workspace.
- Existing authenticated `/api/assistant/config`, chat, history, work, proposals, approve, transcription, flyer and document APIs remain the backend. No second AI backend, model switch, database table or campaign system was added.
- Clerk owner IDs are used by the existing requireUserId and X-MyARI-Owner consistency checks. The owner is not a Clerk organization ID. Tools reauthorize all record references; browser context is untrusted.
- Server configuration still controls owner allowlists, global entitlement gates, reasoning provider, usage limits and messaging authorization. No flags or credentials were changed.
- Server chat uses bounded Responses/provider requests and returns complete JSON results; it does not currently stream tokens. This UI does not simulate streaming.
- Conversation messages and proposal IDs persist through the existing owner-scoped audit store/history APIs and retention policy. Existing history reads are bounded (recent 50 message rows, up to 40 turns for resume). No promise of unlimited/search-all-time history is made.
- Existing proposal revisions use revisionOf and root state; approval checks exact digest, expiry, owner, claims and replay state. Creating campaign drafts remains distinct from enrollment, activation and sending.
- The legacy draft endpoint may use Claude or a template fallback. Its returned provider is now shown, rather than presenting every output as a Claude result. Legacy drafts remain separate draft generation, not a second CRM conversation/approval system.
- Voice Studio already manages authorized voice profiles. Sapphire is not guaranteed available; this change does not synthesize audio or select a substitute voice. Text scripts show a speaking-duration estimate and link to Voice Studio.
- Concierge/Workspace stay on their existing owner-scoped setup routes. Assistant links to existing onboarding and settings; it does not duplicate provisioning or introduce team switching.

## Delivered experience

The dedicated AI Assistant navigation entry opens `/dashboard/assistant`. One owner-keyed OperatingAssistant stays mounted under DashboardShell across Full Workspace, Compact Drawer, Expanded Overlay and embedded Claude tools. Mode changes use the Next router, not document reloads. Browser back/forward preserves the resident session. The originating CRM page is retained for drawer return; direct visits return to Dashboard.

Three-panel desktop workspace: searchable recent history and useful links; architectural welcome/actions, conversation and composer; collapsible action workspace with exact structured previews. Tablet adapts to two panels and mobile to a focused single-column view with History disclosure. Drawer, overlay and workspace share command text, conversation, draft editor state and proposal approval state. Closing preserves work. Claude has an in-panel return control and retains its separate brief/output while switching.

Only an owner-specific opaque conversation UUID is stored locally. No CRM content, messages, credentials or transcripts are put in local/session storage. Refresh resumes that conversation through the authorized history API. Account changes remount the entire Assistant context and owner session, clearing prior-account display state. Tabs do not automatically replace each other's active conversation; the server's turn claims remain authoritative. Focus refreshes history without a polling loop.

Quick actions stage meaningful editable prompts for existing supported tools; they never send or approve on click. Campaign, CRM search, briefing, notes, day planning, pipeline and saved-property flyer workflows retain server data requirements. Missing records must be requested, not invented. A past-client referral/review starter asks for each subscriber's own verified destination. The owner's Zillow URL is not hardcoded globally. Existing Brand Kit zillowReviewUrl validation and subscriber settings are reused. Existing Saved work, campaign drafts, Concierge, Brand Kit and Voice Studio are real destinations.

Unsaved campaign proposals support conversational server revisions and direct step-day/channel/title/message editing through the existing revision API. Audience, objective, duration and sequence previews are visible. Editing already-saved campaigns via AI remains unsupported; use the campaign builder. Approval is explicit; the checkbox, digest and server confirmation flow remain intact. Sending controls are suppressed and locally rejected in this workspace even if a server proposal is executable. Server sending gates remain unchanged.

Source results and additional previews use readable data fields instead of raw tool JSON. IDs/owner/token/secret metadata are omitted from the read-only source presentation. React escapes content; no model HTML is evaluated. Advanced proposal field editing remains an explicit existing power-user control, not the main campaign editor.

Cancellation stops the local wait only; the server may finish. The UI explains this and offers history reload before retrying. Failures retain the user's command; no automatic action replay. New conversation/history switching warns when composer text is present. Recording blocks UI close/mode changes, and a recording keeps the panel visible if browser navigation leaves the full route. Dictation only appends editable text; it never submits or approves.

## Test results and evidence

- Full `test:unit` command passed: 399 Node tests across existing suites, plus standalone assertions. This exercises mocked database/provider behavior; it is not a new hosted execution claim.
- Added `test:assistant-workspace` for opaque pointer validation/owner separation, recent grouping, functional starter definitions, non-global review links, server revision/digest contract.
- Focused local browser suite: **87 checks**, actual Assistant/legacy/preview components, mocked Clerk/provider/CRM APIs, 1440, 1280, 1024, 768 and 390px widths. See `browser-results.json`.
- Mode transitions, browser back/forward, keyboard/Escape recovery, consented synthetic dictation without auto-submit, typed composer preservation, Claude return/brief preservation, unsaved campaign step edits across modes, history reload, saved-result UI, rejection, error/limit recovery, account switch clearing, denied-account gating, no send/enroll/billing requests all passed in that fixture.
- TypeScript and production build passed. Lint: no errors; existing repository warnings remain. Security regression script passed.
- Axe WCAG A/AA at desktop and mobile: zero detected violations in the fixture. Primary hover/disabled contrast was corrected during testing. Reduced-motion is respected, keyboard focus indicators and overlay focus trapping exist. Native controls have labels; the overlay closes on Escape and restores focus.
- Screenshots under `previews/` use actual components with synthetic API data and fixture dashboard chrome. They are not captures of an authenticated hosted deployment. The reused dashboard interior image is an existing MyARI brand asset, delivered through Next Image.
- Source integrity evidence: `security-preservation.json` verifies unchanged authentication, assistant API/orchestrator/tools/store/proposal and messaging-gate files against main. No database migration, Production API mutation, communication or billing operation was executed.
- Secondary Saved work is lazy-loaded. Message lists are bounded by existing API history limits, scroll follows new messages only while near the end, new-conversation scroll resets to the welcome header. No token-streaming or Core Web Vitals performance result is claimed from the local fixture.

## Feature-by-feature acceptance status

| Capability | Status |
| --- | --- |
| Full workspace, drawer, overlay and browser navigation | Complete and locally verified; awaiting hosted acceptance |
| Claude exit and retained brief/composer/proposal state | Complete and locally verified; awaiting hosted acceptance |
| Server-backed history/resume, owner-keyed session | Complete and locally verified; cross-session hosted acceptance pending |
| Quick actions and supported CRM tools | Connected to existing backend; local behavior verified; real staged provider acceptance pending |
| Campaign creation/revision/approval/rejection | Existing backend reused, structured editor added; mocked browser and existing server regressions passed; hosted acceptance pending |
| CRM factual provenance and owner isolation | Existing server authorization unchanged and regression-tested; two authenticated staged-account acceptance pending |
| Daily limits, replay, expiry and sending/billing boundaries | Existing server regressions passed, no gate changes; limit/error UI and no-send requests checked locally |
| Premium desktop/tablet/mobile interface | Implemented against owner-supplied visual; responsive screenshots provided; owner visual review pending |
| Voice scripts and Voice Studio | Text preview/duration/link implemented; Sapphire/audio availability requires existing authorized provider profile; not newly synthesized/tested |
| Concierge/Workspace context | Existing setup links and server tool integration reused; no team or organization switching added |
| Pinned conversations, folders, saved projects | Not implemented; optional spec items, no decorative controls presented |
| Attachments, provider selector, live web search | Not introduced; no unsupported controls implied |
| Streaming | Not supported by the current JSON backend; honest loading/cancellation instead |
| Protected Preview and authenticated hosted acceptance | Blocked: missing isolated branch credentials and test-session/runtime access |
| Production release | Not approved or performed |

## Exact remaining hosted blocker

Read-only Vercel env lookup for `feat/premium-assistant-workspace` returned zero branch overrides. Automatic Git deployment is disabled for this branch in vercel.json to prevent accidental inherited Production-secret use. No protected Preview URL is claimed.

Configure secure branch-specific Preview overrides: matching Clerk Development publishable/secret pair; Supabase URL/public/service credentials exclusively for test project `jojgdfpmaxvbhobjrsbm`; staging OpenAI credential. No Production Supabase `qlochlyyimulyzzrzyac`, Clerk Live, live messaging or Production billing credential may be inherited. Keep ALLOW_LIVE_OUTBOUND, AI sending, global rollout and new billing off. If enabling the Assistant for acceptance, allow only the two verified synthetic Clerk Development accounts. Do not guess their IDs or use real subscribers. Verify effective host-injected runtime scope and deployment protection before creating the Preview.

Cloud browser policy currently excludes Vercel, Clerk and Supabase domains. Connector metadata access does not establish authenticated browser or private runtime execution access. Use the supported environment configuration workflow for required test domains and an authorized development login/session; never paste keys, cookies or tokens in chat. Network restrictions must not be bypassed.

After isolation/access is ready, deploy this exact PR commit as protected Preview only. Validate the Clerk pair/test Supabase credential privately; exercise a real bounded OpenAI call; use two authorized development test accounts for persistent conversations, factual source reads, campaign create/revise/reject/save, daily-limit and replay tests, cross-owner denial, session refresh and mobile navigation. Use synthetic records and mocked communications; clean up only the approved test records and disable temporary test access. Record host results separately from local mocks. No live sending or billing changes are authorized.

## Deployment and rollback plan

No database migration or Production environment change is required by this code. Before a later Production approval, refresh main/PR head, CI, exact deployment identity and recorded rollback target. Merging main may automatically release through Vercel, so do not merge as a staging action. Use the reviewed commit, keep existing feature allowlists/limits, global access, sending and billing settings unchanged. Verify the protected staged build, then request explicit owner approval for any Production release. Verify live routes and authorized owner behavior after an approved release without synthetic subscriber-data mutations.

Recorded baseline rollback candidate: `dpl_7oyVsu1sXk1raF9pgCAcfmwuAGZf` / `aabbf1aa25e679e70b251b4c8ed9af9cb6740982`; reconfirm before release. An authorized deployment rollback/revert restores the old UI; existing conversation/proposal data remains compatible because no schema changed. Never restore a database, delete CRM data, alter billing or disable security to fix a UI regression.

Decision: development implementation ready for isolated Preview review. **NO-GO for Production and not fully accepted until the protected hosted acceptance blockers are resolved.**
