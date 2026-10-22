# Campaign delivery audit — review branch

Date: 2026-10-22. Branch: `audit/campaign-delivery-safety`.

## Coverage and conclusion

All **11 bundled campaign templates and all 56 sequence steps** were inventoried, rendered with synthetic contacts, and exercised through the actual worker with isolated database/provider boundaries. **7 FAIL, 4 NEEDS REVIEW, 0 PASS.** These classifications describe the original bundled definitions; prepared repairs do not certify live campaigns.

**Subscriber database campaigns were not accessible and have not been audited.** The configured Supabase host is outside this environment's network allowlist, and an authorized non-production subscriber owner ID was not provided. Database inventory is unknown, not zero. No production record, schedule, consent, enrollment, or campaign content was changed. No messages were sent and nothing was deployed or published.

- [Campaign-by-campaign findings and every original/proposed step](CAMPAIGNS.md)
- [Machine-readable inventory and synthetic render matrix](inventory.json)
- [Review-only draft copy for all 56 steps](proposed-copy.json)

Original bundled templates remain unchanged. Proposed copy is a local review artifact, not an imported or activated campaign. Unsupported automated channels are proposed as manual/internal follow-up rather than represented as working integrations.

## Technical repairs prepared

- Added one validated message renderer shared by preview and execution. Rejects raw structured output, missing bodies, unresolved variables, invalid URLs, instructional placeholder copy, malformed sender/contact values, and internal artifacts. Does not invent personal details or use a recommendation as a message.
- Added read-only personalized previews using owned contacts. Mock test runs no longer enroll contacts, fabricate consent, change campaigns, or create delivery events.
- Enforced fresh live-send checks for ownership, campaign authorization/status, current consent, destination, actual saved sender identity, quiet hours, and the outbound kill switch. Added ownership validation for contacts and voice recordings.
- Kept schedules anchored to enrollment and respected exact delays, time labels, workspace timezone, and DST. Resume preserves existing terminal runs rather than rescheduling sent steps.
- Added predecessor ordering and stop checks for replies/callbacks/opt-outs; prevented stale workers from ignoring a pause. Failed or ambiguous provider outcomes are not automatically retried.
- Corrected delivery tracking: accepted/queued/mock sends are not reported as delivered; skipped outreach is not a completed sequence. Unknown webhook events are ignored, and lifecycle events for the same provider message are distinguished.
- Preserved SMS STOP suppression and prevented START from erasing DNC or inventing consent. Escaped email HTML and passed stable idempotency keys where supported.
- Protected active/history-bearing campaign edits with a draft revision mechanism. Added activation validation and preserved wait/task types and exact delays. Unsupported video/retargeting steps are blocked instead of silently sent as email.
- Calendar-dependent callback steps without an integration are blocked rather than falsely completed. They do not yet create local CRM tasks.

## Verification

- TypeScript: passed (`npx tsc --noEmit`).
- Lint: 0 errors; 8 existing warnings about fonts/images and hook dependencies.
- Full unit suite: passed, including Contacts, Property Finder, campaign library/routes and the new campaign audit.
- New campaign audit: **28 test groups passed**. Every original template step is executed in isolation; valid output is captured at the provider boundary and unsafe/unsupported output must block. Complete, partial, missing and malformed synthetic contacts are included. All proposed copy is separately schema/render validated.
- Security and regression scripts: passed.
- Production build: passed, 91 pages generated.
- Browser checks passed at **1440, 1920, 768 and 390px**, including the new actual-contact personalized preview, existing custom builder, filters, drawer, draft operations, account switching, empty/error states and no detected horizontal overflow or page errors. Tests use actual UI components with synthetic backend fixtures, not authenticated staging. [Detailed results](browser-results.json). No live provider or database verification is implied.
- Preview screenshots: [desktop](screenshots/personalized-message-1440.png), [mobile](screenshots/personalized-message-390.png). Names and message data in screenshots are synthetic fixtures.
- [Changed files](changed-files.txt); command logs are retained alongside this report.

## Release blockers and limits

1. **Database inventory and authenticated staging:** obtain an authorized non-production URL, subscriber owner ID and permitted database access. Run the owner-scoped read-only exporter in `scripts/campaign-audit/export-owned.ts`; securely review every actual campaign, duplicates, historical runs and sender settings. Export contains campaign content and must remain private.
2. **Email lifecycle:** a complete unsubscribe and inbound reply pipeline is absent. Proposed manual opt-out wording is not an automated unsubscribe implementation. Verify domain/sender authentication, complaints, suppression, receipts, callbacks and ownership routing with provider sandboxes.
3. **Consent/legal review:** existing generic consent does not establish channel-specific legal permission, RVM permission, jurisdiction, recipient-local sending restrictions, or proof requirements. Workspace quiet hours alone are insufficient to certify compliance. Shared-number inbound SMS routing also needs ownership review.
4. **Recordings:** a personalized text preview does not alter prerecorded audio. Review every actual recording and its associated contact/campaign use before sending.
5. **Atomic replay protection:** the proposed migration `supabase/migrations/20261022010000_campaign_audit_deduplication.sql` is **unapplied**. Review existing duplicates and staging compatibility first. It deliberately refuses conflicting existing rows rather than deleting them. Read-before-insert guards alone do not prove concurrent exactly-once processing.
6. **Provider ambiguity:** application claims and Resend idempotency do not prove exactly-once delivery across all providers. Reconcile timed-out/failed sends with the provider before any manual retry. Native callback signatures, event correlation and real authentication/configuration remain unverified.
7. **Lifecycle and unsupported integrations:** no live MLS/listing/comps feed, generated personalized RVM, avatar or retargeting integration is certified. Template audience descriptions are not proof of enforced audience rules. Closing/tour dates and campaign promises need actual supporting data. Callback tasks need calendar integration; local task creation remains absent. Campaign status may remain sending after terminal runs; historical false delivery events were not rewritten.
8. **Builder follow-up:** local template history still uses a shared browser storage key; it is not an authoritative tenant-safe database history. The voice-asset loading effect can reload builder state. Review these before relying on shared-device draft persistence. The provider picker can fall back to mock without explicit configuration in some non-campaign callers; campaign execution blocks unconfigured live sends, but other automation outcomes need separate verification.

## Approval required before applying

Review the code on this branch, the complete campaign findings and the draft copy separately. Approve sender/compliance policies, per-campaign copy and actual recordings before importing or activating content. Approve the proposed uniqueness migration only after duplicate review and isolated staging verification. Any deployment changes future scheduling/sending behavior and requires explicit release approval. Existing live schedules/content must not be rewritten automatically.

## Recommended future campaigns (concepts only)

- Search-preference refresh: ask an authorized buyer to confirm area, budget and optional property preferences; no invented listings.
- Post-closing service check-in: tied to an actual closing date with useful maintenance/resource follow-up.
- Consent renewal and channel preference review: an approved, channel-aware workflow with recorded provenance.
- Appointment follow-up: anchored to a real completed appointment and stopped by replies or opt-out.
- Seller planning check-in: offer a discussion without promising unsupported valuations or market statistics.

These recommendations were not created, enrolled, scheduled, or activated.
