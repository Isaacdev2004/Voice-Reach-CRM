# Luxury active conversation — current PR #50 refinement

This guide supersedes earlier drawer/three-panel design descriptions. The approved active-conversation screenshot and latest owner instructions are the visual target.

## Implemented

- Full Workspace is the default authorized Assistant entry point. Compact Drawer is removed from state and the view menu; Expanded Overlay remains the optional large view.
- A single compact Assistant toolbar covers the generic CRM top bar on this route. Existing CRM navigation remains available; no second permanent sidebar.
- The optimized existing approved architectural image is a persistent workspace background, with a subtle ivory overlay and translucent content surfaces. It remains visible after the first message.
- Empty conversations show a time-of-day greeting from the signed-in user's first name, introductory text, four actions and six prompts. On first submission all welcome content is removed completely. Existing-history restoration has a loading state and never flashes an empty welcome screen.
- Conversation width is responsive up to 1240 CSS pixels, using available width beside the CRM sidebar. Body paragraphs retain comfortable line lengths without narrowing structured campaign content. Verified at 1440, 1600 and 1920 desktop widths.
- User messages are differentiated in champagne with a first-name initial; MyARI uses the existing brand logo. No fabricated historical timestamps, provider choices or model claims.
- Campaign proposals appear inside the Assistant reply that produced them, rather than a narrow nested side panel. They show the actual title, description, audience, duration, step count, channel set and expandable sequence. Voicemail remains labelled text script. No timing values absent from the proposal are invented.
- Unsaved proposals are explicitly labelled; there is no fake campaign link. A real saved-result link appears only through the existing authorized outcome. Full saved-campaign editing is a separate PR #51, not implicitly included in this Preview.
- Existing revisionOf/digest/expiry/replay, confirmation checkbox and approval/rejection logic remain authoritative. No automatic save, sending, enrollment, publishing or billing. Review sections remain mounted when hidden, preserving unsaved proposal edits across modes.
- Composer remains visible at the bottom with supported dictation only; no fake attachment control. Enter/Shift+Enter and IME composition behavior are retained.
- Concierge uses the existing authenticated access endpoint. Eligible users navigate; disabled/unallowlisted accounts see an in-place explanation, not a 404. Concierge flags/allowlists remain unchanged.

## Verification

268 actual-component mocked browser checks pass across 1920/1600/1440/1280/1024/768/390 widths. Tests cover wide layout, persistent imagery, welcome removal, restored-history flash prevention, proposal ownership in the response, modes, default entry, Claude return, campaign revisions/approval/rejection, safe recovery, account clearing and unauthorized denial. No live credentials, database writes, communications or billing were used in these fixtures.

The full 399 reported Node unit tests plus standalone assertions pass. Build, TypeScript and security checks pass; affected-file lint is clean, full lint has zero errors/seven existing warnings. All 13 backend/auth/sending preservation checksums remain unchanged. Automated axe A/AA reports are empty at desktop/mobile checkpoints. These are not claims of hosted authenticated acceptance or measured Production Core Web Vitals.

## Hosted gate and release

Preview remains isolated to Clerk Development and test Supabase jojgdfpmaxvbhobjrsbm, with only the previously verified Development account allowlisted. Sending/global rollout/entitlements/pricing/plan changes/AI billing remain disabled and sending allowlists empty. Private exact-commit build checks verify the Development pair/account and test service access without exporting keys.

No Production merge/deployment is allowed until authenticated hosted visual/workflow acceptance, CI/protected-branch requirements and safe rollback readiness pass. The connected fetch cannot use the owner's signed-in session and returns authentication-required 401. Do not claim hosted success from build probes or local screenshots.

Rollback reference: Production dpl_7oyVsu1sXk1raF9pgCAcfmwuAGZf / aabbf1aa25e679e70b251b4c8ed9af9cb6740982; refresh before any release. Revert/roll back UI code through the authorized release process, never restore the database for this presentation change.

## Known limitations

Saved-campaign editing awaits the separate Campaign Workspace release. Existing history remains bounded by backend retention/query limits. Rename/folders/provider selectors are not introduced. Responses remain complete JSON, not streaming. Concierge is not enabled by this UI fix. Hosted acceptance remains outstanding.
