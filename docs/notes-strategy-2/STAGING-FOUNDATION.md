# Approved staging foundation migration

Applied successfully through the authorized Supabase migration API on 2026-10-30, following explicit owner approval.

- Target: `jojgdfpmaxvbhobjrsbm` only.
- File: `supabase/migrations/20261023030000_notes_workspace.sql`
- SHA-256: `3e5ddcc5b371140a4d2c92c9b7388a18560a860b4225e1b042da89ddc54d56d5`
- Prior request expired without execution. Read-only inspection confirmed the schema and baseline unchanged before resubmitting the same SQL after approval.
- API returned `success: true`.
- Independent read-only inspection verified all three Notes columns, note_versions, the version trigger and both RPCs.
- RLS enabled on contact_notes and note_versions. Anonymous SELECT and authenticated UPDATE on contact_notes denied. Both RPCs are security invoker; anon/authenticated EXECUTE denied; service_role EXECUTE granted.

## Preservation verification

| Table | Before | After |
| --- | ---: | ---: |
| contacts | 236 | 236 |
| campaigns | 31 | 31 |
| campaign_steps | 160 | 160 |
| calendar_events | 71 | 71 |
| audit_logs | 17,119 | 17,119 |
| contact_notes | 4 | 4 |
| contact_tasks | 8 | 8 |

Existing-row fingerprints matched for contacts, campaigns, calendar_events, and the pre-existing columns of notes/tasks. New version history is empty (0 rows); no functional test writes were performed during this approval step.

Production was not queried or modified by this execution. No deployment, flags, billing, or sending changes were performed. The separate `20261030163255_notes_strategy_2.sql` extension remains unapplied and is not covered by this foundation-only approval.
