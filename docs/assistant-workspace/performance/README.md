# Assistant interaction profiling and design verification

## Reported Preview and design mismatch

The supplied URL voice-reach-i0zwuayoa-magnificent-soless-projects.vercel.app resolves to Ready Preview dpl_4uVVFcpdh7QUg8RhiHVaoav9zT2v / a85106cbc08fcf891645bd4453ce7a02a066544c. It predates the wide active coastal conversation and inline proposal work at c567a841dc662dd71aea9bb7ea5539a7eaa6b8a4. An immutable deployment URL cannot update via browser refresh. The current performance repair builds on c567, retaining its approved design, not the older URL's design.

## Confirmed blocking path, with limits on attribution

Source inspection of the reported revision confirms three synchronous window.confirm calls: newConversation, remove, and the recent-history item's onClick before resume. Each suspends the invoking event handler while the user decides. Sending uses asynchronous fetch; network waiting is not a synchronous event-handler busy loop.

The original 9,723.1ms warning has no supplied trace or interaction name, so this report does NOT claim exact attribution or reproduction of that field value. Local profiling of the actual current UI demonstrates a specific matching class of block. Production React, Chromium with 4x CPU slowdown, same fixture and a controlled1,000ms confirmation decision wait were used before and after. All APIs/auth/CRM/provider responses were synthetic.

Trace evidence on desktop: before EventDispatch(click)1009.1ms and FunctionCall1006.65ms, CPU profile frames newConversation and confirm. After, no EventDispatch/FunctionCall over100ms in that capture. Network responses were independently delayed250ms; UI response did not synchronously wait for them. Native dialogs may be excluded from Event Timing calculations, so report the measured click-to-next-frame and main-thread block rather than lab timing as field INP.

| Viewport | New Chat click to frame, before | After |
| --- | ---: | ---: |
| 1440 |1021.1ms|22.4ms|
|768|1023.8ms|20.4ms|
|390|1021.7ms|27.8ms|

See summary.json for all metrics, including typing automation timing, Event Timing, long tasks and campaign opening/scrolling. Automation elapsed times include driver overhead; startup long tasks are included in maxLongTaskMs. No claim of guaranteed field INP or zero long tasks is made. Raw CDP traces/CPU profiles remain local in this directory as before-*, after-* and after-campaign-* artifacts. They contain synthetic fixture data only and are intentionally excluded from the published tree to avoid large trace payloads.

## Changes

- Replace all three synchronous prompts with an accessible non-blocking HTML dialog. Explicit Cancel/Continue, Escape cancellation, focus return and native modal inert behavior preserve destructive/unsaved-work confirmation. No API mutation occurs merely on opening it. Existing overlay keyboard trapping defers to the open dialog.
- Cache message/proposal association in one pass when messages/proposals change, instead of rescanning history on composer keystrokes.
- Memoize ActionPreview, use a stable history callback and lazy JSON draft initialization, and cache draft parsing. Proposal edits, confirmations, digest/revision fields, outcome recovery and server approvals retain existing behavior.
- No backend, authorization, usage-limit, billing, sending, Concierge, database or credential changes. All13 recorded security-sensitive files retain their checksums.

## Verification

282 actual-component browser checks at1920/1600/1440/1280/1024/768/390 pass: full workspace default; no Compact Drawer; persistent approved interior/coastal scene; first-message welcome removal and no restoration flash; wide active reply; inline structured campaign proposals; review/revise/approve/reject; history; Claude navigation; error/replay recovery; denied-account clearing; composer within viewport and no outer horizontal overflow. Desktop/mobile axe checks report no detected A/AA violations. New confirmation cancellation preserves the current proposal; acceptance starts a new conversation without losing unsent composer text.

Separate production-React profiling at1440/768/390 exercises typing, asynchronous send, eight-step campaign summary expansion, typing with the proposal mounted and conversation scrolling. Composer stays within viewport; outer window scroll remains0. No real contact, provider, message or billing request occurred.

Types, optimized local build, Node regression suite and security check pass; affected lint is clean. Browser fixtures are not authenticated hosted acceptance. A deployment-only private isolation check is required before the fresh Assistant Preview build; it verifies exact project/branch/commit, the existing approved Development owner's hashed identity, test Supabase service, matching Clerk Development pair and unchanged disabled sending/global/billing/Concierge gates. It makes no OpenAI request, exports no credentials and creates no endpoint. Project/Concierge settings must not be changed to bypass a failing guard.

Rollback: keep the prior Ready Assistant Preview at c567 available; revert this UI-only commit on the Assistant branch with approval if needed. No data rollback or database restore is involved. No Production merge/deployment is authorized.
