# Concierge read-only Production schema review

Reviewed November 10, 2026 for PR #52. Target: `qlochlyyimulyzzrzyac` only.
No Production SQL changes, environment changes, deployments, or customer-data writes were performed.

## Reviewed source

`supabase/migrations/20261027121246_concierge_onboarding.sql`

SHA-256: `d15568198a68831e4732bd02538b85096043d977aedcf1c04a4fa81eb6e7eab6`

The migration file is unchanged. Production migration history records
`20261102011355_concierge_onboarding_production`; the different installation
timestamp does not justify rerunning the original migration.

## Independently verified catalog results

- All three tables exist: `concierge_cases`, `concierge_events`, `concierge_imports`.
- Columns, nullability, defaults, primary/foreign keys, stage/state/version checks,
  owner/fingerprint uniqueness, and both explicit secondary indexes match the reviewed SQL.
- RLS is enabled on all three tables. There are no browser policies, consistent
  with server-only access. `anon` and `authenticated` have no table privileges.
- Both RPCs are `SECURITY INVOKER`, with `search_path=public` and only
  `postgres`/`service_role` execution grants. Browser roles cannot execute them.
- Function bodies match the migration byte-for-byte (MD5 used only as a comparison fingerprint):
  `mutate_concierge_case(text,text,uuid,integer,jsonb,text)`:
  `58e17b51de1936db6540e4fb1bcf0351`;
  `execute_concierge_import(text,uuid,integer)`:
  `a9c05998cfe4cc797b0a6df6f97cf015`.
- Functions were inspected, not invoked. No Production fixtures were created.

## Permission mismatch — activation blocker

Production currently grants `service_role` ALL table privileges on all three
tables, including DELETE/TRUNCATE and UPDATE on audit events. The intended
reviewed access is SELECT/INSERT/UPDATE on cases/imports and SELECT/INSERT only
on events. A GRANT of narrower permissions does not remove existing/default
broader grants, which can explain this difference.

The tables and RPCs are installed; do not rerun their CREATE statements.
If separately approved, the following permission-only transaction would align
the service grants without changing rows, functions, RLS, or other tables:

```sql
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE
  public.concierge_cases, public.concierge_events, public.concierge_imports
  FROM service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.concierge_cases, public.concierge_imports TO service_role;
GRANT SELECT, INSERT ON TABLE public.concierge_events TO service_role;
COMMIT;
```

**Proposal only. Not executed.** Recheck current grants immediately before any
approved application, apply atomically, and independently verify each role's
privileges afterward. No DROP, DELETE, TRUNCATE, or data UPDATE is proposed.
Retain the pre-change ACL evidence for recovery; do not restore a database backup
or delete records to undo a permission change.

## Branch and identity boundaries

The six commits from `05319114cae621cec6ba1d29497c99d9257b5990` were rebased
onto main `258f6a669736369d756979c65a35878d0c0dbcc3`. The only conflict was the
automatic-deployment exclusion list in `vercel.json`; both main's exclusions and
the Concierge branch exclusion were retained. Live Assistant, Settings/Brand Kit,
Mortgage PDF, billing, and sending implementation files remain unchanged from main.

PR #52 remains draft. No merge or deployment is authorized. No Production feature
flags or allowlists were edited; keep Concierge and retention disabled and retain
the current owner-only Assistant pilot configuration. Billing, pricing, AI
entitlements/public rollout, and live outbound must not be activated by this work.

The manager has not been named or verified. They must be a distinct Clerk user
from the case owner; the staff review route explicitly rejects `actor === owner`.
Do not add an owner to the manager allowlist or treat an unnamed reviewer as verified.
Owner activation remains blocked by the permission mismatch, manager verification,
and the applicable authenticated subscriber/staff acceptance requirements.

## Rebased validation

Local security, TypeScript, lint (zero errors/seven existing warnings), and the
optimized build passed. The regression chain passed through the Concierge
application tests, including staff self-review rejection. Five private-auth
guard tests were unable to spawn Node in this execution sandbox (`EPERM`), so
the complete local unit command is not reported as passing. Keep those tests
unchanged and use exact-head GitHub CI to establish their result in its runner.
GitHub independently reports the rebased PR as mergeable; it remains draft.
