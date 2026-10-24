# Premium campaigns, reviews and referrals — implementation and audit

Audit date: 2026-10-24 UTC. Authorized subscriber supplied by user: kikzenyc@gmail.com. No live subscriber records were read or changed. Production service access is unavailable under the configured network policy. Environment-variable readiness does not establish database/provider connectivity. Live campaign count, enrollment counts, provider metrics, recordings, and account-specific voice availability remain **unverified**, not zero.

## Delivered

- 11 bundled templates retained unchanged; 11 separate premium revisions plus a new 28-day commercial draft and 90-day Relationships Worth Sharing draft: **13 editable drafts, 67 steps**. The additional default campaign is documented as a fixture, never actual customer activity.
- Campaign-by-campaign original/revised copy, timing, resource requirements, voice drafts and discrete readiness checks: [CAMPAIGNS.md](CAMPAIGNS.md), [inventory.json](inventory.json), [premium-drafts.json](premium-drafts.json), [voice-drafts.json](voice-drafts.json).
- Seven two-page original planning PDFs, served only through an authenticated allowlisted endpoint. Files are under `private/campaign-materials`; preview under `material-previews`. Shared drafts contain blank branding/disclosure fields and require agent review before attaching. No client data or listings are invented.
- Contact profile and preview Reviews & Referrals panels; authenticated `/dashboard/reviews` workspace. Manual client confirmations are distinct from independent verification, which is unsupported. Sent/scheduled statuses require actual records, not manual assertions.
- Immutable owner-scoped review/referral history, deterministic IDs, optimistic concurrency and idempotency. Referral pipeline supports seven stages, existing contact associations, editable notes, owned follow-up tasks and transactions. No contacts are created automatically.
- Subscriber Brand Kit Zillow link, independent review-invitation preference and authorized voice-profile preference use the existing versioned settings infrastructure. The supplied owner's URL is not hardcoded or applied to another account. No remote settings were changed.
- Explicitly tagged review request/reminder steps are additionally restricted by current review preference and terminal contact statuses. Consent, opt-out, campaign state, quiet hours, outbound kill switch and existing claims remain enforced. A failed review check defers instead of sending.
- Actual delivery/inbound records are projected read-only for review history. Provider submission or link clicks never prove transmission/review completion. Rules-based reply hints require agent review; they never verify a review.
- Manual relationship events join the unified contact timeline. Ask MyARI receives server-authorized minimal facts and record links on explicit user request, with preparation-only instructions and untrusted-content boundaries.
- New draft creation no longer silently attaches an unrelated latest approved recording. Sapphire is opt-in and requires an actual authorized voice identity/name match; missing/unavailable preferences fail rather than substitute. No paid synthesis or recording replacement occurred.
- Attachment signing/download fails closed if any selected file is unavailable. PDFs are not offered as SMS MMS; email aggregate size and channel limits are enforced.
- Read-only authenticated inventory export covers all campaign statuses and complete paginated owner records. It was tested locally; no production export was executed.

## Phase 20 workflow

Open an actual contact profile or its Reviews & Referrals preview tab. Confirm/decline a review or select Do Not Ask Again and explicitly save. Prepare a review campaign through the existing draft builder; delivery remains a separate authorized operation. Select an existing referred contact, optionally link an existing owned task/transaction, and record the referral. Update its stage and notes manually. Follow-up and calendar actions open existing editors with the contact context. Ask MyARI fetches authorized relationship facts before opening the existing assistant; nothing sends or creates records automatically.

## Data and security

Every new API requires Clerk authentication and server-derived owner ID. Contact, task and transaction associations are verified server-side. Audit streams filter owner and entity, use immutable sequence snapshots and unique predecessor-derived primary keys to reject conflicting saves. Idempotency keys suppress retries. Provider history filters owner; shared-number ambiguity remains quarantined by existing communication handling. Secrets, storage paths and credentials are excluded from inventory output. No unrestricted AI database access or new provider is introduced.

No new schema migration is required: relationship streams use existing `audit_logs`; Brand Kit fields use existing versioned settings. Existing Tasks/Settings infrastructure must already be available. No production migration was applied.

## Confirmed repairs

1. Unrelated approved audio was automatically selected for new template drafts: removed for new drafts only.
2. Partial attachment failures could omit selected material: now block that step.
3. Review-specific metadata could disappear during draft persistence/duplication: preserved through builder, blueprint and library transfer.
4. Explicit "do not contact me" wording now follows existing opt-out handling.
5. Referral retries could report duplicate instead of idempotent success: corrected; stale updates still conflict.
6. Confirmed/declined review reminders skip before message rendering, so a missing review URL does not turn a suppressed reminder into a send failure.
7. Resetting a manual review status clears its current confirmation fields; historical confirmation remains immutable.

## Validation

- `npm run lint`: pass, 0 errors; 7 pre-existing warnings.
- `npx tsc --noEmit`: pass.
- `npm run test:unit`: pass across existing suites; new premium suite added to this command.
- `node scripts/campaign-premium.test.cjs`: 15/15 pass: template separation/timing, link validation, independent consent/status suppression, idempotency/concurrency, tenant isolation, verified-status rejection, referral associations, provider evidence dedupe, fail-closed gate, PDF integrity, rendering and attachment safety, worker reminder skip and unavailable/foreign saved voice preferences. Synthetic data only.
- `npm run test:security`: pass.
- `node scripts/campaign-premium-browser.test.cjs`: pass at 1440/1280/768/390; actual panel render, explicit status save, referral selection, no horizontal overflow or browser exceptions. Mock APIs only. Captures: `reviews-{width}.png`. This is component QA, not a signed-in live end-to-end certification.
- `npm run build`: pass; final validation rerun recorded in QA logs.
- No real messages, calls, charges, AI synthesis, notifications, live enrollment changes or provider-configuration changes during tests.

## Remaining limitations / release gates

- **Live campaign audit incomplete:** email supplied, but authorized Clerk owner mapping and production Supabase access unavailable. Use the authenticated export when released; do not interpret bundled templates as all live campaigns.
- **Sapphire audio not generated:** provider voice identity/availability, account entitlement, legal consent and listening approval remain unverified. Script drafts are ready; no audio is represented as approved.
- **Branding not applied remotely:** subscriber Zillow link/voice preferences must be saved through signed-in Settings. Shared PDFs must receive approved agent/brokerage/contact/disclosure details before client use.
- **No authorized independent Zillow verification source:** verified totals are unavailable. Client-reported completion remains a distinct status.
- **Existing global stop-on-reply remains broader than review suppression:** existing inbound reply rules may stop unrelated nurturing. This work does not weaken that safety rule; separating campaign reply policies requires a reviewed transactional change.
- **Existing step replacement uses delete/insert:** active/history protections remain, but atomic draft replacement requires a separately reviewed database transaction. No speculative migration was applied.
- **SMS PDF sharing:** no permanent secure hosted client link is implemented. Existing signed links expire; email PDF attachments are supported, SMS PDF MMS is not.
- **Provider connection, actual delivery metrics, sender registrations, email authentication, consent and campaign legal readiness** require authorized production/staging verification. No readiness score fabricates these checks.
- Read-only evidence currently paginates all relevant owner events; high-volume accounts may need indexed server aggregation after measurements.
- New review statuses must be attached as explicit step metadata; old untagged live campaigns are preserved and are not retroactively reclassified.

## Release authorization

The user subsequently authorized deployment once complete. Use the existing PR/CI/main → Vercel workflow after critical checks pass. This does not authorize campaign activation, messages, live enrollment changes, credentials, migrations or approved audio replacement. Deployment result must be verified against the exact merged commit; a push alone is not proof of deployment.

Automatic approval review earlier rejected an implementation that assumed consent and a proposal to add review writes inside delivery/inbound hooks. Neither rejected implementation was applied. The accepted version uses actual compliance facts and read-only provider projections, preserving existing provider handlers.
