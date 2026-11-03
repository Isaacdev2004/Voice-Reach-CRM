# Luxury Assistant workspace refinement — PR #50

This refinement follows the owner’s final written design specification and existing approved MyARI imagery. It changes presentation and navigation only; the existing backend and data model remain authoritative.

## Implemented

- One compact Assistant toolbar: New Chat, History, Concierge, Return to CRM. Display modes, Claude draft tools, saved work and secondary quick actions live in More Assistant tools.
- One permanent CRM navigation sidebar. Recent history opens on demand; no second permanent Assistant sidebar.
- Personalized two-line serif hero with exact approved headline/supporting copy, existing optimized architectural asset and readability overlay.
- Exactly four main cards and six popular prompts. Prompts prepare real requests in the composer; explicit submission is required. Market data and flyer prompts state their source/capability limitations.
- Hero/cards/prompts disappear after the first message. Messages scroll independently above the always-visible composer. Enter submits (outside IME composition); Shift+Enter adds a line.
- Action Workspace starts closed and opens for actual proposals. Closing it preserves the mounted editor and unsaved edits. History and proposals have explicit close controls and Escape dismissal.
- Existing history, owner scoping, proposal digest/expiry/replay checks, approval/rejection and usage gates preserved. New Chat/history switching warns about unsubmitted proposal edits. Unsent composer text remains resident across modes and Concierge navigation.
- Mobile/tablet adaptation, reduced-motion support, no attachment/provider/web-search controls suggesting unsupported capabilities.

## Validation evidence

162 mocked browser checks passed at 1440×800, 1280×800, 1024×1000, 768×1000 and 390×1000. Desktop welcome fits without scrolling its content area. See browser-results.json for final local fixture results and axe-1440.json / axe-390.json for detected accessibility violations. Tests use actual UI components with synthetic accounts and mocked remote APIs; they do not establish hosted Clerk or OpenAI acceptance. Screenshots labelled `luxury-*` use synthetic fixture chrome and are local design evidence.

The complete unit suite passes 399 reported Node tests plus standalone assertions. TypeScript, build and security checks pass. Lint has zero errors and seven pre-existing warnings. All 13 checksums in security-preservation.json remain unchanged, including auth, Assistant backend, history/proposal/approval routes and sending authorization. No migrations, billing, pricing, messaging adapters, credentials or Production flags change.

## Preview and release gates

Preview branch: feat/premium-assistant-workspace. Only the owner’s verified Clerk Development account is allowlisted through Preview-scoped configuration. Global subscriber gates, entitlements, pricing, plan changes, AI billing and sending remain disabled; sending allowlists remain empty. Test database: jojgdfpmaxvbhobjrsbm. The private Preview build guard pins exact branch/project/commit and verifies the account in the matching Development instance before building.

A fresh protected Preview must be built from the final commit. The existing connector cannot operate the owner’s signed-in browser session: protected requests returned authentication-required 401. Private credential/config checks are distinct from functional hosted acceptance. Do not mark conversations, history, campaigns or two-account hosted isolation as passed on that basis.

The owner has conditionally authorized this UI release. Do not merge/deploy until actual hosted visual and authenticated acceptance, protected-branch checks and rollback readiness are verified. No additional generic approval is required for the described UI if those conditions pass; credential, allowlist, database, messaging, billing and subscriber-access changes require their own authorization.

## Production deployment / rollback

Refresh main and PR head plus CI immediately before release. Production baseline observed: aabbf1aa25e679e70b251b4c8ed9af9cb6740982; rollback deployment dpl_7oyVsu1sXk1raF9pgCAcfmwuAGZf. Reconfirm this target before any merge. A normal main merge may automatically deploy through Vercel. Preserve effective Production configuration and allowlists. Verify Ready status, www.myari.io routing, health and authorized navigation after release; no synthetic Production records are authorized.

For UI regression, revert the release or use the verified prior deployment through the authorized rollback workflow. No database restoration or schema rollback is involved. Conversation/proposal data remains compatible. Preview rollback means selecting the prior protected Preview and, if test access is no longer required, disabling only the approved Preview test access followed by a fresh Preview build.

## Known limits

No conversation rename API exists; none is invented. History remains bounded by existing backend retention/query limits. The backend responds with complete JSON rather than token streaming. Already-saved campaign editing uses the existing campaign editor. Live market data, editable/downloadable flyers and voice synthesis depend on actual existing tools/provider access. This UI does not enable those capabilities or claim hosted success.

## Current local visual evidence

- [Desktop](previews/luxury-desktop.jpg)
- [Mobile](previews/luxury-mobile.jpg)
- [Tablet](previews/luxury-tablet.jpg)
- [Active conversation](previews/luxury-conversation.jpg)
- [Campaign proposal](previews/luxury-campaign.jpg)

These are synthetic local fixtures, not screenshots of a signed-in hosted session.

## Owner correction — full workspace by default

Compact Drawer is removed from the Assistant view menu. Authorized Ask MyARI entry points now route to Full Workspace by default, preserving the mounted session. Expanded Overlay remains an optional large view. The older protected deployment and historical drawer screenshots do not include this correction. Campaign editing is a separate development branch and is not yet part of PR #50.

Concierge navigation checks the existing authenticated `/api/concierge/access` endpoint. Eligible accounts navigate to Concierge; unavailable accounts receive an in-place explanation with work retained, rather than a 404. Concierge flags and allowlists are not changed.

Latest correction validation: 172 mocked browser checks passed, including default full-workspace launch, absence of Compact Drawer, authorized Concierge return and denied Concierge remaining in-place. Build, type-check and affected lint pass. Hosted signed-in acceptance remains outstanding.
