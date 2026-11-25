# White-Glove Setup UX

This focused UX branch is stacked on the current Concierge branch at 3ef35c07870409575b8235a007e808f78ae49780. It does not resolve or replace PR #52's outstanding authenticated manager/security acceptance and must not be merged to Production ahead of that dependency.

## Experience

- White-Glove Setup sits directly beneath Dashboard for server-authorized eligible accounts. Staff Command Center remains a separate role-gated entry.
- Eligible accounts without an existing case receive an optional native-dialog welcome. Begin saves acknowledgement then opens the actual first incomplete journey step. Explore, Close and Escape leave the regular dashboard available. Returning accounts with a case are not interrupted.
- A dismissible dashboard card shows actual milestones and the next action. Complete requires both the real checklist and current independent manager signoff; checklist readiness alone is not approval. Completion confirmation is dismissible separately.
- The subscriber journey reuses the approved 1536×1024 architectural hero, editorial serif text, ivory surfaces, emerald accents and bronze details. All six sections, curated template selection, import review, walkthroughs, integration evidence and launch checklist remain functional. Campaign editing stays in the existing Campaigns editor; saving remains explicit and draft-only.
- The Command Center inherits the same colors, type and card treatment; its controls and authorization code are unchanged.

## Persistence and security

No database migration is needed. Read-only staging catalog checks confirmed audit_logs has text action/entity_type, JSONB metadata and no new action/type constraints. /api/concierge/welcome uses the existing server eligibility/origin/auth wrapper. Owner is derived from the authenticated session, never input. Only four fixed preference intents are accepted; requests append owner-scoped audit preferences. They never change the case version, manager signoff, settings, branding, billing or milestone values. Reads expose only safe progress, fixed resume destinations and UI preferences, not case notes or staff details.

Close remains available while a request is pending; failed saves are disclosed and can be retried. Server persistence is authoritative across sessions/devices; there is no shared browser-local identity cache. Disabling Concierge removes eligibility; no subscriber-wide activation was introduced.

## Validation

- TypeScript, repository lint (seven existing warnings; no errors), security audit, full unit suite and optimized build passed.
- Four new welcome/API tests cover persistence, owner separation, forged requests, origin denial, existing/completed account behavior, signoff validity and resume destinations. Existing 21 Concierge tests pass.
- Existing PostgreSQL tests pass in disposable PGlite, including case replay/versioning, owner denial, atomic imports, consent Unknown, suppressed sending, cancellation and duplicate handling. No Supabase migration or fixture write was performed for this UX feature.
- Chromium browser tests at 1440, 768 and 390 pixels exercise welcome, keyboard focus, Explore and Begin, reload persistence, dismissible card, mobile navigation, all six sections, CSV downloads/review/cancel, explicit draft approval and no-send assertions. Screenshots show actual components with synthetic HTTP fixtures, not authenticated hosted acceptance.
- Reused architectural image remains sharp at its rendered dimensions. Original public homepage and authenticated CRM feature implementations were not redesigned.

## Files

app/(dashboard)/dashboard/page.tsx; app/api/concierge/welcome/route.ts; components/concierge/{welcome,workspace,entry}.tsx; components/concierge/concierge.css; components/layout/dashboard-sidebar.tsx; lib/concierge/journey.ts; scripts/concierge-welcome.test.cjs; scripts/concierge-browser.test.cjs; scripts/concierge-browser/{entry,billing-stub}.jsx; package.json (test command only); vercel.json (disable automatic UX branch deployments).

## Screenshots

Local artifacts in docs/concierge/previews/: welcome-{1440,768,390}.png, dashboard-card-{1440,768,390}.png, navigation-{768,390}.png, journey-{your-business,contact-migration,campaign-concierge,connections,walkthroughs,launch-review}-{1440,768,390}.png, staff-1440.png.

## Release gates and rollback

Production is NO-GO until PR #52 authenticated security acceptance passes, this UI receives owner review, and authenticated hosted UX persistence is verified. Safari/device-specific verification remains outstanding. No Production flags, credentials, data, migrations, sending, billing or retention changes are authorized by this PR. Preview remains restricted to the previously approved Development cohort.

Roll back only the UX commit(s) or disable Concierge through a separately authorized release. Existing preference audit events can remain; no data deletion, SQL rollback, backup restoration, token changes or signoff resets are needed.
