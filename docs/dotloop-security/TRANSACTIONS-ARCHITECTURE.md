# Option B — native Transactions architecture (design only)

## Boundaries

Proposed /dashboard/transactions uses existing MyARI ivory/champagne panels, bronze controls, serif headings and responsive list/detail views. No dashboard features or navigation changed in this security PR. Dotloop remains optional. Existing Assistant, Contacts, Tasks, Calendar, Concierge, campaigns, branding and mortgage services keep their current gates.

Native transaction records support buyer/seller kind; owner/workspace; verified contact associations and party roles; property address; purchase price/currency; expected escrow amounts/holder/due dates; closing date/timezone; agent-confirmed deadlines; checklist links; lifecycle and optimistic revision. Expected escrow is not proof funds were received. Legal deadlines are not inferred from generic checklist offsets.

Reuse contact_tasks and approved checklist services, but Production task_transactions is absent per read-only audit. Reconcile its existing migration/dependencies before proposing additive schema; do not blindly replay it or claim that infrastructure works in Production. Keep a native transaction aggregate separate from historical checklist assignment payloads, with explicit linkage to avoid duplicate tasks.

## Proposed entities

- transactions: native ownership, type, fields, revision, lifecycle.
- transaction_parties: owner-bound contact/party associations, no cross-owner foreign references.
- transaction_deadlines and transaction_task_links: confirmed due dates and links to existing task records.
- transaction_external_links: connection/profile/loop identifiers, verified HTTPS deep link, provider revision and source timestamps; uniqueness includes owner and provider profile.
- transaction_sync_jobs/checkpoints/conflicts: read-only import cursor, retry state, error category, idempotency and change provenance.
- document_templates/template_versions, field_mapping_versions, transaction_document_versions, document_approvals: private library foundation; no forms bundled or customer document downloads in the read-only sync phase.

Every new relation requires reviewed RLS/grants, ownership constraints and two-account tests. Clerk server identity is authoritative; client-supplied owner/workspace IDs cannot grant access. Separate staff membership/roles require explicit authorization; do not inherit Concierge staff privileges. Do not make a Dotloop account/profile identifier a substitute for a MyARI workspace boundary.

## Read-only integration

After API permission verification, a server adapter lists authorized individual profiles and loop summaries/details; agents select the intended profile. First import requires explicit contact association; no email-only automatic merges. Persist minimal approved metadata, not complete unbounded provider payloads. Use actual provider granted scopes. No customer-document contents, signatures or write-back.

Store field provenance: Dotloop is authoritative for imported loop status; MyARI is authoritative for native intake/tasks; agent-confirmed contractual dates override suggestions. Conflicts are visible and reviewed, never last-write-wins silently. Mark stale data/last successful sync accurately.

Pagination and checkpointing follow the provider response, with overlap for late updates. Rate-limit per authorized user/app, honor response limits, apply jittered backoff for safe reads and bounded retries; 401 triggers serialized refresh, 403 pauses unauthorized access, 429 defers. Merged-loop redirects require an allowlisted provider host/path and mapping reconciliation; never forward bearer credentials to arbitrary redirected URLs. Loop deep links require HTTPS and a verified Dotloop hostname; do not copy documentation's misspelled sample domain.

Initial sync is explicit refresh plus approved bounded polling, not a new enabled scheduler. Webhooks require provider approval; when added, verify documented raw-body signature and timestamp, map subscription to an authorized owner/profile, deduplicate event IDs, acknowledge quickly and process asynchronously. Reconciliation remains necessary. No signature-complete label based on an activity string or document timestamp.

## Document Library foundation

Private workspace folders, immutable licensed originals, form edition/source/usage authorization and SHA-256. Fillable PDFs or reviewed overlays are native future capabilities, not implied Dotloop API support. One intake supplies confirmed contact/Brand Kit/transaction values; missing or conflicting data stays visible. AI can propose preparation using owner-scoped intake and existing explicit approvals. No legal elections, signatures or invented terms. Any edits invalidate the exact-version approval. Reject unsupported/malicious/oversized files, preserve original language and block unreadable overflow. Private authenticated previews/downloads, audit events, retention and recovery cover both DB metadata and storage objects.

No proprietary form population, PDF upload to Dotloop, customer-document retrieval, signature automation, external sharing or provider write-back until separate permission/licensing and release approval.

## Phases and estimates

1. Security PR: reviewed SQL, encryption, connection lifecycle, local tests; staging and provider acceptance before release.
2. Native workspace/contact/task foundation: 2–3 engineer-weeks after reviewed additive schema and roles.
3. Read-only Dotloop compatibility and sync: 2–3 weeks after approved application/profile/scopes; test paging, expiry, merge, denial, restart and deep links.
4. Operational hardening and owner pilot: 1–2 weeks; queue limits, monitoring, recovery, privacy and responsive accessibility tests.
5. Licensed native Document Center: separate 6–10+ weeks depending on approved template count and PDF formats. Provider writes/signatures are not part of this estimate/scope.

One senior engineer with part-time QA/security support; provider/legal approval waits excluded. Costs: provider access/account terms (quote required), storage/egress/version counts, bounded sync compute, queue/observability, mapping/form-edition maintenance and optional AI usage within existing limits. No subscription, billing or paid provisioning change is included.
