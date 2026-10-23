# Notes loading and association compatibility fix

## Reproduced problem

The new workspace explicitly projected `metadata`, `revision`, and `client_key`, and the planner projected source-note/priority fields. Those reads fail on the existing schema before the Notes migration is applied. The UI then incorrectly showed an empty library and a Saved status. A failed workspace request also left the contact/property pickers without records. The screenshot is consistent with this reproduced failure; no production database schema or subscriber records were queried to assert its exact live cause.

## Correction

- Owner-scoped schema probes distinguish the full workspace, original schema, and partial upgrade. Only recognized missing-column responses enable basic compatibility. Network, permission, or database errors never trigger a write fallback.
- Existing Notes/Tasks are read without requiring optional new columns. Contacts are read under the authenticated owner and only the required picker fields are returned, so optional preference columns cannot break the contact picker.
- Basic note creation uses the note's client UUID as the primary key, making retries idempotent. Edits compare the exact prior `updated_at`, reject stale/different writes, and advance the timestamp. No RPC, metadata column, or database migration is required for basic note editing.
- Basic contact selection persists to existing `contact_id`. A contact's saved property address is derived from that same owned contact record, not invented. Choosing an existing property in basic mode links its contact too, with confirmation before replacing/removing an existing link. Contact/property searches and association retention across reloads are covered by browser checks.
- The original schema cannot represent independent property associations or multiple contacts. Those features, tags/pins, version history, original-transcript storage, reusable templates and note-linked task creation remain gated until the full migration is available. Unsupported submitted metadata is rejected, not discarded. Full migrated-schema behavior is preserved.
- Partial upgrades remain read-only rather than risking data loss. Records lacking a usable legacy edit timestamp require a new copy/review rather than an unguarded overwrite.
- A read failure shows Notes unavailable, not zero notes or a new empty library. A blank draft starts Not saved yet. Saved is shown for actual loaded or successfully saved content. Subscriber-facing errors no longer assume a database migration is the cause.
- Planner tasks and appointments load independently. A failed Calendar request does not hide successfully fetched tasks or pretend no appointments exist.

## Validation

The complete unit suite includes 20 Notes tests, including old-schema loading, tenant isolation, guarded legacy updates, retries, unsupported metadata preservation, actual primary-contact property association, and schema outage handling. Existing Contacts route tests cover the compatible edit path.

The Notes browser suite exercises the normal upgraded workflow plus basic-schema contact search/selection, property selection, persistence through reload, two consecutive edits, desktop/mobile overflow, independent Calendar failure, and failed-read messaging. All fixtures are synthetic. See `browser-results.json` and the new `compatibility-1440.png` / `compatibility-390.png` captures.

No production data was changed, no migration was applied, and no deployment was performed. Review and deploy the code fix through the normal process. The full Notes migration still needs a separate reviewed rollout to enable independent/multiple associations and other advanced features.
