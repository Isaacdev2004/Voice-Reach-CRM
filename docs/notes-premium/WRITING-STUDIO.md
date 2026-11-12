# Notes & Strategy writing studio

Focused UI change on main 258f6a6. Reuses current note APIs, permissions, planner, dictation, AI review, task approval and history. Reuses the prior feat/notes-strategy-2 panel preferences and template compatibility approach without importing its unrelated APIs.

First visit opens an empty writing surface with both drawers closed. Opening the page never creates a note. Recent notes and templates require explicit selection. Owner-scoped browser preferences restore each drawer; Focus Mode temporarily closes both. At available workspace widths below 1250px, drawers overlay the editor. The textarea stays mounted, preserving content, selection and scroll. Wide desktop supports both drawers inline. Planner can expand in place.

No database, API, authorization, billing, sending or feature-flag changes. Automatic deployments disabled for the feature branch. Existing basic-schema restrictions remain; templates map to supported categories rather than requiring a migration. No invented folders or AI insights.

Changed runtime files: NotesStrategyPage.tsx, notes-workspace.css, realtor-planner.tsx, use-studio-layout.ts, studio-layout.ts and template-draft.ts. Tests: notes-browser.test.cjs, notes-studio.test.cjs; package test wiring and deployment guard.

Validation: TypeScript, repository lint (existing warnings only), security audit, full unit suite, Notes database regression, optimized Next build, synthetic Chromium browser regressions at 1920, 1440, 768 and 390px. Browser tests cover explicit opening, save/retrieve, legacy schema templates, links, task approval, AI review, failures, history, independent drawers, preferences and editor selection/scroll continuity. Synthetic screenshots: studio-empty/default/library/planner/focus-{width}.png and studio-both-1920.png.

Screenshots are actual rendered components using synthetic HTTP fixtures, not authenticated hosted acceptance. Safari, actual microphone permissions, live AI provider and hosted logout/login need authorized hosted acceptance. Production release remains gated by that acceptance and separate approval. No Production changes authorized here.
