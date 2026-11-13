# MyARI-managed trial messaging

Product decision: subscribers never need Twilio, Resend or Slybroadcast accounts, API keys or provider dashboards. MyARI is the provider customer/ISV. Each workspace needs its own authorized sender identity and server-side delivery permissions.

Baseline: main 5ef2717567b2abd2c37e7283e8b1b87980f76078. Existing open PRs and trial/messaging branch searches were reviewed; no separate current trial-messaging implementation branch was found. This focused branch does not merge Assistant, Concierge, Property Interest or unrelated product work.

## What exists and can be reused

| Capability | Evidence / status |
| --- | --- |
| Server-held platform credentials | Twilio, Resend and Slybroadcast adapters already read host environment credentials. No subscriber BYO credentials are needed. |
| Sending/authorization | registry.dispatch -> authorizeLiveOutbound: owner/contact/campaign/enrollment authorization, consent, suppression, reply stopping, quiet hours, platform outbound gate. Assistant has additional independent gates. |
| Dedicated inbound SMS/call mapping | communications/webhook validates Twilio signature and account, resolves verified subscriber_phone_numbers by account_sid + receiving phone, then searches contacts only within that owner. |
| Ambiguous replies | Shared receiving numbers and missing/ambiguous mappings are quarantined; no most-recent-sender heuristic. |
| Opt-outs | SMS classification, communication_suppressions, ingest_inbound_communication RPC and automation stopping already exist. |
| Delivery reporting | Delivery evidence has authenticated Twilio/Svix/voice callback checks, provider-message correlation, duplicate protection and explicit distinction between acceptance and delivery. |
| Usage | Plan/trial gates and owner-scoped usage exist. Existing trial caps are 25 SMS, 50 emails, 5 voicemail drops. The new 100-email proposal is NOT activated. |
| Trial creation | Cardless Stripe subscription trial, existing 14-day default, owner-mapped customer, idempotency and pause-at-expiry behavior. No subscription-writing behavior is changed in this branch. |
| Sender provisioning | MISSING: dedicated number purchase, customer subaccounts, Trust Hub registration, provider registration states and durable credential references. |
| Managed outbound SMS | PARTIAL: adapter supports environment-wide credentials/From. It does not resolve a subscriber's dedicated registered sender. |
| Managed inbound for subaccounts | PARTIAL: current webhook authenticates using one environment token/account; it must resolve the correct subaccount key securely before accepting subaccount traffic. |
| Managed email replies/unsubscribe | MISSING: unique reply routing, inbound receiving handler, verified per-workspace aliases and functional RFC 8058 unsubscribe flow for campaign email. Existing Resend adapter has no workspace Reply-To/unsubscribe headers. |
| Managed voicemail | PARTIAL adapter; one environment caller ID. Reseller/multi-tenant authorization, independent caller verification and approved callback routing remain unverified. |
| Spend control | MISSING: atomic per-trial segment reservations, sender rental/registration ledger, inbound/callback costs, uncertain-send reconciliation and lifecycle stop/release workflows. Current monthly engagement counts are not a race-safe provider-cost ledger and may count multiple status events. |

## Implemented safely in this branch

- /dashboard/settings/messaging: compact MyARI-branded business questionnaire with save/resume, validation, channel choices, clear Pending Verification / Action Required status, loading/error/retry handling and no provider key fields.
- /api/messaging/setup: authenticated, owner-filtered reads/writes using existing audit_logs; strict payload rejects owner IDs, credentials and forged provider approval fields. Feature access is off by default and requires an explicit server-side test allowlist.
- Questionnaire self-attestation never grants sender approval. This phase deliberately reports provisioningEnabled=false and sendingEnabled=false. Ready is not fabricated from key presence or a completed form.
- Readiness policy independently requires correct owner/channel, sender verification, approved registration, credential isolation, inbound/delivery checks, quota enforcement, current setup version, eligible subscription and explicit launch approval. Suspension/expiry/ownership mismatch fail closed.
- GSM-7/extension and UTF-16 segment estimation and proposed allowance calculations; these are preparatory functions, NOT an activated concurrent-send quota implementation.
- Read-only trial-recognition fix: sending eligibility now reads the owner-authorized Stripe subscription snapshot rather than trusting a stale saved settings status. Trial eligibility requires Stripe's actual future trial_end. The final live-provider authorization boundary rechecks this service and channel allowance so legacy/manual/automation dispatch cannot skip expiry checks. No signup-based fabricated deadline, Stripe mutation, billing activation or price/cap change.
- Existing integration copy now explicitly says MyARI manages messaging and that provider configuration does not prove sender approval.
- Automatic Git deployment disabled for this branch in vercel.json.

Flags for a future isolated Preview (not Production):
MANAGED_MESSAGING_SETUP_ENABLED=true
MANAGED_MESSAGING_SETUP_OWNER_IDS=<verified Development test owners only>
ALLOW_LIVE_OUTBOUND=false
ASSISTANT_APPROVED_SENDS_ENABLED=false
MYARI_AI_BILLING_ENABLED=false
Keep provider/Stripe/scheduler credentials neutralized. A real Stripe test connection is separately required to prove hosted trial recognition. No live providers are needed to save the questionnaire.

## Architecture recommendation

Use a MyARI-owned parent Twilio account with one MyARI-managed subaccount per workspace/customer, a dedicated number, and a Messaging Service per registered use case. Register the actual subscriber business through the supported ISV Customer Profile/Brand/Campaign process. Agents do not authenticate to Twilio.

This follows Twilio's preferred type-1 ISV architecture. Centralized accounts with separate per-customer Messaging Services are supported but have a larger shared account/reputation/suspension blast radius and harder cost attribution. They do not eliminate per-business registration fees. Never use one unrestricted sender across unrelated agents.

Reference: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv

Parent operations credentials belong only in a restricted provisioning worker. Sending workers should receive least-privilege subaccount credentials through an approved secret manager; database rows contain credential references, not plaintext keys. Subscribers cannot choose a From, AccountSid, MessagingServiceSid, credential reference or registration status. Validate all sender resources server-side against owner + channel + provider account.

Inbound: select only a known subaccount credential reference from the untrusted AccountSid, verify Twilio's signature against the canonical external URL, then validate number/service ownership and resolve the workspace. Unknown accounts or mismatched/ambiguous resources are quarantined. Preserve existing STOP lists when migrating from account-level opt-outs. Calls must validate ParentCallSid lineage and owner; provisioning a number does not automatically configure forwarding.

Email: MyARI controls approved authenticated sending domains/subdomains and unique workspace sender/reply aliases. Verify agent business identity separately. SPF/DKIM/DMARC, reputation warming, complaint/bounce suppression, unsubscribe links + one-click headers, signed Resend webhooks and an owner-bound inbound alias registry are required. Keep transactional account/security emails separate from campaign traffic. A display name or arbitrary agent email is not verified From-domain ownership.

Resend receiving supports signed received-email events and verified receiving domains; implementing its workspace routing and safe attachment processing remains required. Never route inbound messages solely by a global sender-email match.
References:
https://resend.com/docs/dashboard/receiving/introduction
https://resend.com/docs/llms.txt
https://resend.com/pricing

Voicemail: keep disabled pending written provider confirmation of MyARI's multi-tenant/reseller model, caller-ID verification, approved audio, per-tenant audit/cost attribution, callback authentication/routing and consent requirements. Twilio calling is not ringless voicemail. Do not enable Slybroadcast follow-up SMS implicitly. API availability and customer testimonials do not establish contractual permission to resell.
References:
https://www.slybroadcast.com/
https://www.slybroadcast.com/faq
https://docs.fcc.gov/public/attachments/FCC-22-85A1.pdf

## Required next implementation: durable controls before provider activation

A separately reviewed additive migration is required for:
1. managed_sender_assignments: owner_id (Clerk text ID), channel, provider, provider account/resource IDs, dedicated number/address, opaque credential_ref, registration status, setup fingerprint, verification timestamps/expiry and suspension. Unique active assignment per owner/channel; unique provider account + receiving identity; immutable ownership history.
2. messaging_trial_periods: provider-authoritative trial/subscription ID and start/end, fixed per-trial limits and provider spending budget. No month-boundary reset or second-trial grant.
3. messaging_reservations: owner + trial + channel + unique logical operation, reserved units and micro-USD, pending/submitted/unknown/settled states, provider message ID. Atomic reserve under database locks; reject changed payload on idempotent replay.
4. messaging_cost_events: immutable number rental, registration, segments, inbound, calls, email and voicemail cost events; provider-account/resource correlation and reconciliation.

All tables require RLS, no anon/authenticated write grants, server-only functions with fixed search_path and explicit execute permissions. Clerk IDs are not Supabase auth UUIDs. Every subscriber-facing query remains owner-filtered. No migration is applied or falsely represented as installed.

At the final provider boundary: verify subscription/fraud/sender state; atomically reserve segment units and estimated cost; bind the server-selected dedicated sender; retain existing consent, opt-out, quiet-hour, enrollment and Assistant controls; submit once; reconcile accepted/unknown/failed results. Never release reservations on an ambiguous timeout and blindly retry. Deduct one logical send once, independent of repeated delivered/opened callbacks. Incoming STOP must still be processed when outbound allowances are exhausted.

## Trial journey

1. Existing 14-day MyARI trial starts unchanged; provider verification does not restart or extend it.
2. Agent completes the MyARI questionnaire. Do not collect SSNs, provider credentials or unencrypted tax identifiers here.
3. MyARI checks business identity, intended traffic, consent evidence and abuse risk. Required legal registration data must use an approved protected collection mechanism within MyARI.
4. Authorized provisioning performs the actual subscriber registration and number assignment only after owner-approved provider spend; remain Pending Verification until provider and routing checks pass. Rejections show actionable review requirements.
5. Agent drafts a campaign while pending. Sender readiness does not enroll contacts or activate campaigns.
6. After approval, send a separately approved bounded test to an authorized opted-in recipient. No arbitrary unrestricted trial recipients, international SMS, MMS or automated voicemail tests.
7. Replies go to the assigned workspace; delivery results come from authenticated callbacks, with unmatched events quarantined.
8. Agent sees remaining allowances, verification status and trial deadline.
9. Trial expiry, suspension, abuse or quota exhaustion blocks new provider submissions immediately at dispatch. Retain reply/STOP handling and audit; number release/reassignment follows an approved retention policy, not immediate recycling.

## Trial limits and cost model (USD; public rates reviewed 2026-11-04)

These are estimates, not verified MyARI invoices or negotiated provider quotes.

Recommended proposal: 25 outbound SMS SEGMENTS; 100 outbound emails only after provider approval; up to 5 approved voicemail drops only after channel approval; 5 AI interactions/day with provider-call/token/spend caps. Keep the existing 50-email limit until an explicit entitlement change is approved.

Example first-trial budget:
- One US local number: $1.15 for a billable month; do not assume 14-day proration.
- Low-volume Brand: $4.50 one-time; campaign vetting $15; campaign recurring fee depends on approved use case. Budget $1.50-$10/month provisionally and confirm any upfront minimums/review fees. Standard vetting can cost more.
- 25 outbound segments: $0.2075 Twilio base plus about $0.0875-$0.125 carrier fees = $0.295-$0.3325.
- 50 inbound SMS segments: $0.415 base plus applicable carrier fees; reserve up to $0.665 conservatively. Replies cannot be assumed free.
- 100 API emails: $0.09 at published $0.90/1,000 overage; plus account plan allocation and inbound email usage. A $20/50,000 shared plan is a fixed platform expense, not a free per-agent allowance. Confirm campaign/marketing traffic contract and pricing.
- 5 voicemail drops: $0.60 at the smallest $12/100 pay-as-you-go rate; prepaid minimum/account and callback-number fees are extra. No reseller quote verified.
- 70 AI interactions over 14 days: $0.28 if each totals 8,000 uncached input + 1,000 output tokens at gpt-5-mini rates of $0.25/$2 per million. Multiple tool rounds or longer context cost more; an interaction count is not a dollar ceiling.
- Example total: roughly $24-$33 before support, tax, callback voice minutes, domain extras, minimum billing periods, registration retries and fraud losses. At 5-15 minutes of support at $30/hour, add $2.50-$7.50. Registration/support dominate the marginal message spend.

Cost formula: rental + brand/vetting/campaign fees + outbound segments*(base+carrier) + inbound segments*(base+carrier) + email/inbound email allocation + successful voicemail units + callback voice minutes + AI tokens + verification/support. Persist actual provider prices/currency and reconcile to invoices rather than billing agents from estimates.

Protect margins with an eligibility gate before any paid provisioning, one verified business/workspace/number, registration deduplication, abuse limits, a platform-wide onboarding budget and alerting, a trial variable-spend ceiling, atomic unit reservations and no automatic replenishment. Do not fund paid sender registration for every anonymous signup. Publicly describe verification delays; never promise an approved number on signup or guarantee approval during the 14-day trial.

Cost sources:
https://www.twilio.com/en-us/sms/pricing/us
https://help.twilio.com/articles/1260803965530-What-pricing-and-fees-are-associated-with-the-A2P-10DLC-service
https://www.twilio.com/docs/trust-hub/registrations/a2p-10dlc-brand
https://resend.com/pricing?volume=50000
https://www.slybroadcast.com/
https://developers.openai.com/api/docs/models/gpt-5-mini

## Compliance and approvals

Recipient consent must be channel/use-case-specific and auditable; an agent's questionnaire checkbox is not recipient consent. Preserve STOP/opt-out, DNC/suppression, applicable quiet hours and reply stopping. Account for recipient timezone or hold uncertain cases conservatively. Marketing/prerecorded voice and state telemarketing rules need qualified review; ringless voicemail is covered by FCC robocalling rules and is not a consent exemption. Maintain compliant business identification, mailing address and unsubscribe handling for marketing email. No bought/scraped lists.

Manual provider approvals still needed:
- Twilio ISV architecture/account limits, permitted customer types/use cases, customer profile/Brand/Campaign approvals, dedicated number ownership, credentials strategy, fees and authorized testing.
- Resend permission for managed multi-tenant campaign traffic, verified DNS, sender/reply domain, unsubscribe/complaint policy and platform allocation.
- Slybroadcast written multi-tenant/reseller approval, caller ownership, callback authentication, consent/use-case restrictions and costs.
- Legal/compliance signoff for actual jurisdictions/use cases; no regulatory approval is inferred from successful API authentication.

## Testing and rollout

This branch's tests use synthetic data and in-memory service boundaries. They do not demonstrate provider onboarding, live delivery, real inbound webhooks or hosted Clerk/Supabase acceptance. Twilio legacy test credentials do not exercise A2P onboarding or trigger SMS/call status callbacks; other resource calls are unsupported. Test provider-supported simulations first, then separately approved real integration tests to authorized recipients.
Reference: https://www.twilio.com/docs/iam/test-credentials

No deployments are authorized by the current instruction. Protected Preview requires separate approval plus verified branch-only Clerk Development/test Supabase isolation; never inherit Production credentials. No real provider test credentials are currently bound. No database or provider mutations, purchases, registrations or billing changes occurred.

Production rollout: approve additive schema and isolated rehearsal; finish provisioning worker, secure credential resolver, per-tenant dispatch/webhook routing, atomic trial/spend ledger and email unsubscribe/inbound; complete hosted two-account and provider-supported acceptance; owner-supervised limited pilot; explicit owner approval before any Production migration/deployment/sender purchase/sending activation. Rollback disables the managed feature, pauses provisioning/submissions, preserves STOP/replies and queued/uncertain reconciliation, and retains audit/number ownership history. Do not silently fall back to a shared sender.

## Reproducing the safe tests

Run npm ci, npm run test:managed-messaging, npm run test:security, npm run test:unit, npm run lint, npx tsc --noEmit and npm run build. These commands do not require real provider credentials.
For actual-component screenshots, install isolated pinned browser tooling (Playwright 1.56.1 and esbuild), set MYARI_BROWSER_TOOLS to that node_modules directory and optionally PLAYWRIGHT_CHROMIUM_EXECUTABLE to its installed Chromium, then run node scripts/managed-messaging-browser.cjs after build. The screenshot fixture uses synthetic API responses and must never be described as hosted provider acceptance.

Screenshot: screenshots/setup-1440.webp is an actual component capture with synthetic service responses. Browser checks also covered 768px tablet and 390px mobile; this image is not evidence of provider or hosted authentication readiness.
