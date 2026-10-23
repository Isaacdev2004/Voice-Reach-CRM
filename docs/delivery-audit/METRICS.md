# Metric definitions and classifications

All production observations below remain **UNVERIFIABLE** without authorized database/provider access. **FIXED AND TESTED** describes code behavior under isolated synthetic tests, not provider-level verification.

## Authoritative model

- `outbound_messages`: new durable attempts, final authorized request text (SMS/email), provider/channel, subscriber/contact/campaign/step, logical idempotency key, provider reference, submission result and recording time. Voicemail audio text is not inferred from a script. Existing `campaign_recipients.delivery_status` is only a legacy rollup.
- `outbound_delivery_events`: append-only submission, authenticated webhook or explicit provider GET observations. Unique `(provider,event_key)` prevents duplicate callbacks. Composite message/owner/provider FK prevents foreign-owner event association.
- `provider_sync_runs`: real attempted and successful channel reconciliation timestamps/errors, never page refreshes. A message's last sync derives from its own reconciliation events, not a channel-wide success.
- Provider receipts resolve an exact stored provider reference, never caller-supplied owner or campaign tags. Missing/unmatched IDs do not confirm delivery. Early uncorrelated callbacks return retryable failure; unmatched historical references need authorized review.
- No browser access policies exist for these tables. Service-role APIs require `requireUserId()` and owner filters. The list does not return message text; the detail endpoint separately verifies owner.

## Denominators and dates

Attempt = one recorded dispatch invocation. Logical message = unique `(owner, channel, logical_key)` among selected attempts. Retries sharing the explicit idempotency key belong to one message. Calls without a logical key cannot be assumed to be retries; their attempt UUID is a distinct logical identity. Contacts = distinct non-null owned contact references, not message count.

The Delivery Audit Log uses an inclusive UTC start and exclusive UTC end against attempt creation. UI Through-date is inclusive and translated to the following UTC midnight. Analytics uses the same model with UTC calendar-day windows including today, ending at the observation time. Webhook/event times do not move an original attempt into a later submission cohort. Preview/Details use all-time campaign evidence; Dashboard Marketing Pulse/recent table use 30 days and Dashboard Campaigns Sent uses all-time evidence. Different ranges intentionally need not have equal totals.

Provider status events observed after submission update the cohort's outcome. Rate = distinct logical messages with at least one currently confirmed-delivered attempt ÷ all distinct logical messages in the selected attempt cohort × 100. Failed attempts never count as delivered. A failed retry does not erase an earlier independently confirmed delivery of that logical message. There is no denominator when there are no messages, so rate is unavailable, including channel and outcome charts. Provider distribution separately counts dispatch attempts by provider with an attempt denominator, rather than labeling those counts delivered messages. Daily distinct trends may not add to range-wide distinct totals when attempts sharing a logical key occur on different days.

Queued/current pending counts and cumulative observed status counts are distinct; status-event columns are not a partition that should be summed. A recorded delivered event does not fabricate missing earlier sent events or timestamps. Observed sent can be lower than delivered when intermediate callbacks were absent.

## Channel metrics

| Metric | Calculation / authoritative source | Code classification |
| --- | --- | --- |
| SMS Queued | Distinct messages with a currently queued attempt, actual Twilio response/callback/GET state | FIXED AND TESTED |
| SMS Sent | Distinct logical messages with an explicit `sent` observation; not queued/accepted/mock | FIXED AND TESTED |
| SMS Delivered | Confirmed `delivered` state from signed callback or explicit owned-reference GET | FIXED AND TESTED |
| SMS Failed / Undelivered | Actual failed/undelivered events; failed-only logical groups exclude pending/successful retry outcomes | FIXED AND TESTED |
| SMS Replies | Only explicit message-correlated reply events; current contact-only inbound SMS cannot supply reliable attribution | NEEDS REVIEW |
| Email Queued | Recorded queued/delayed provider state, never delivery | FIXED AND TESTED |
| Email Sent | Explicit Resend `email.sent` / equivalent status read | FIXED AND TESTED |
| Email Accepted | Successful Resend submission with returned provider reference | FIXED AND TESTED |
| Email Delivered | Native authenticated `email.delivered` or explicit status GET | FIXED AND TESTED |
| Email Bounced / Failed | Explicit corresponding lifecycle event; never successful delivery | FIXED AND TESTED |
| Email Opened / Clicked | Distinct logical messages with authenticated corresponding events; repeated opens/clicks do not inflate messages | FIXED AND TESTED; human intent NEEDS REVIEW |
| Email Replied | Correlated inbound reply is required; ingestion not implemented | NEEDS REVIEW |
| RVM Queued / Submitted / Accepted | Only explicit submission/recognized callback state; gateway acceptance is not completed delivery | FIXED AND TESTED |
| RVM Delivered / Completed | Only recognized explicit delivered disposition counts. Ambiguous `completed`, numeric, unknown/listened-only callbacks do not imply delivery | NEEDS REVIEW: actual callback contract unverified |
| RVM Failed / Rejected | Corresponding recognized callback state, no invented numeric mappings | FIXED AND TESTED; provider contract NEEDS REVIEW |
| Attempts / unique messages / recipients | Separate owner-scoped identifiers; mock attempts excluded | FIXED AND TESTED |
| Delivery rate | Shared confirmed-delivered logical-message numerator and attempted logical-message denominator | FIXED AND TESTED |
| Campaigns Sent on Dashboard | Distinct campaign IDs with explicit provider-confirmed sent event, not mutable campaign status | FIXED AND TESTED |
| Executed sequences | Each current step has a processed worker run; explicitly not confirmation of delivery | FIXED AND TESTED |
| Provider latency, ROI, inferred conversions, channel-specific legal consent | No provider/time/cost/conversion evidence supplied; not fabricated | UNVERIFIABLE |

## Ordering and provenance

Queued/sent/opened events arriving late do not regress a terminal disposition. Reliable provider occurrence times order delivered/failure transitions. When conflicting terminal events have no reliable ordering, state is unknown and excluded from confirmed-success counts pending review. Timeline preserves the individual real observations.

`occurred_at` is null when the provider does not supply a reliable event timestamp; receipt arrival is separately `received_at`. A confirmed status can have an unknown sent/delivery time. No current time is substituted into those fields. Resend signatures carry replay-safe receipt IDs; Twilio/Slybroadcast dedup keys combine provider reference and recognized disposition. Repeated same-state callbacks without unique event IDs cannot reconstruct distinct delivery attempts and are not counted as separate messages.

## Surfaces

| Surface | Source and scope |
| --- | --- |
| Dashboard Marketing Pulse / recent campaigns | Shared `/api/analytics?range=30d`; unique-message delivery rate; contact count is distinct contacts |
| Dashboard Campaigns Sent | Shared all-time evidence; distinct campaigns with explicit sent observation |
| Campaigns library | Existing owned campaign/enrollment counts; status is campaign lifecycle, not delivery confirmation; link to Delivery Audit Log |
| Campaign Details | Shared all-time campaign message evidence; separate recipient eligibility and worker execution progress |
| Campaign Preview Drawer | Shared all-time campaign evidence; unavailable if evidence missing; worker execution explicitly separate |
| Analytics / exports | Shared UTC calendar-day evidence; no recipient-rollup or seed delivery assumptions |
| Contacts Activity | Verified delivery observations separated from historical/manual unverified activity; no raw provider errors |
| Activity Logs | Real audit rows + delivery evidence where available; unverified legacy rollups otherwise; no sample injection |
| Delivery Audit Log / message details | Owner-scoped attempt list, shared filtered counts, independent owner-checked actual content and timeline |
