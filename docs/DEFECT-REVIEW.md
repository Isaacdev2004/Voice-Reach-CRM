# MyARI defect review — 2026-10-22

The cloud environment started successfully, shell execution works, and the attached
repository remote is Isaacdev2004/Voice-Reach-CRM. The initial working tree was clean.
The previous detailed report was not present in this thread; this review traced the
six categories supplied by the user against the attached application code.

## Confirmed defects and changes

1. **Billing authorization (security):** Settings POST persisted browser-supplied
   plan, price, limits, and subscription status. It now preserves saved server billing
   and uses an unpaid baseline when no saved billing exists. Usage is server computed.
2. **Attachment ownership (security):** The builder accepted arbitrary storage paths,
   and service-role signing/download functions had no owner check. Builder writes and
   both send-time storage operations now enforce the authenticated owner's attachment
   namespace and reject traversal/encoded separators.
3. **Checkout verification (security):** Public verification equated `complete` with
   paid, and an unbound checkout could be claimed when identity email was missing.
   Verification, claims, and completion webhooks now require a completed subscription
   checkout, settled/no-payment-required payment, and active/trialing subscription.
   Unbound claims require a matching verified primary Clerk email. Public verification
   no longer returns the customer's email address.
4. **Subscription status:** Paused/past-due subscriptions could become active or
   trialing, and some status changes left previous active access intact. Webhooks and
   trial-start results now map all non-active/non-trialing statuses to the existing
   local canceled state. Sending rejects accounts without active or trialing access.
5. **Quota handling:** Failed usage queries returned zero, permitting sends during
   database errors. Missing, invalid, and failed counts now fail closed.
6. **Analytics accuracy:** Empty live accounts returned seed statistics; live reports
   invented latency, engagement, conversion, channel counts, and ROI. They now return
   real empty results and mark unsupported measurements unavailable. Provider,
   campaign, funnel, and trend counts use the requested period; trend duration follows
   the selected range. Engagement summaries follow the requested range and fail on
   query errors rather than reporting zero after a failure.

## Verification and limits

- Executed the original checkout evaluator and analytics computation from HEAD in
  scratch fixtures: a missing-email claim succeeded and an empty account showed
  invented outreach. Both behaviors are covered by corrected regression assertions.
- Other findings were verified through their actual request/storage/status/query
  code paths; no live customer, payment, storage, or messaging operations were run.
- New regression tests exercise billing preservation, verified-email claim decisions,
  checkout eligibility, subscription status mapping, attachment ownership/traversal,
  usage-count errors, empty analytics, and analytics period boundaries.
- Existing unit/security checks and new regressions pass. Typechecking passes.
  ESLint passes with nine existing warnings. The production build passes with
  network access enabled (the initial sandboxed build could not fetch Google Fonts).
- No desktop/mobile component or stylesheet changes. Browser-based desktop/mobile
  verification and authenticated end-to-end service tests remain pending.
- Existing analytics query limits (5,000 recipients and 2,000 engagement events) can
  truncate large-account reports. Quota checks still count recorded events and are
  not atomic reservations across concurrent sends; these are separate limitations.
- Existing billing stored through audit snapshots can retain historical bad data;
  previously forged entitlements need reconciliation against Stripe before release.

No changes were published or deployed. Human review is required before production.
