# Notes writing studio final refinements

Continues draft PR62, preserving its editor-first behavior, independent per-account drawers, reversible Focus Mode, note APIs, permissions, template compatibility and approval workflows. No backend/schema/configuration change.

Matches the existing Campaigns ivory/champagne/bronze palette and adds the approved 1536×1024 Notes architectural image through Next/Image at configured quality75. Desktop hero is190px, responsive mobile200px, and reduced to a quiet heading in Focus Mode.

Replaces the single-line title control with a content-sized, wrapping textarea in its own normal-flow row. Explicit sizing, spacing and a narrowly scoped base-layer focus rule prevent the enlarged title/focus treatment from colliding with contact/property controls. The global layered textarea reset previously suppressed the intended local focus style. The 200-character limit remains. No existing titles or note contents are rewritten by the layout change.

Groups New Note, Save, Choose Template, Focus Mode, Dictate and AI Assist into one writing toolbar, with formatting in its own compact group. History, pinning, duplication, metadata and note-to-task actions remain supported. Templates now show a text excerpt and retain the existing unsaved-change protection.

Planner is400px on sufficiently wide desktop layouts, with less nesting and padding, readable Daily/Weekly/Monthly controls, separate confirmed records and AI review actions, and the existing expanded in-page planning view. Narrower screens keep overlay behavior and editor continuity. Left drawer260px; editor remains the largest column.

Verification covers190px hero/image decode, empty/populated/long focused titles, title/link geometry, both-drawer geometry, expanded planner, Focus Mode, warm computed colors, persistence, selection/scroll continuity and existing note/template/AI/task regressions at1920/1440/768/390. TypeScript, lint, security, full unit suite, disposable database regression and optimized build are run separately. Screenshots use actual components with synthetic HTTP fixtures; they are not hosted authenticated acceptance. Safari and actual authorized hosted/provider acceptance remain release gates.

Changed refinement files: components/pages/stitch/NotesStrategyPage.tsx; components/notes/notes-workspace.css; scripts/notes-browser.test.cjs. No unrelated Concierge, Campaigns, Calendar, Contacts, Assistant, Brand Kit, Mortgage PDF or Production changes.
