# Twilio ISV pilot engineering handoff

This branch incorporates PR #58 (`1a5280e83f86a1740aa7620e93d61ef3196e4238`) onto main `ce416dd3ef1a8b7c0585bbd5348ab8f605bcb4bd`. It extends the existing Settings → Messaging questionnaire, API, save/resume, subscription checks, and final delivery authorization. It does not introduce a competing onboarding workflow. Current main's Notes and public SMS-consent files are unchanged.

## Implemented

- Sending-business records separate the agent/team/brokerage legally responsible for messages from MyARI as software provider.
- Dedicated, owner-scoped assignments bind business, account, brand, campaign, Messaging Service, number, and provider-verification evidence. One active assignment per workspace; active numbers cannot be shared. This initial pilot deliberately does not share a brokerage's account across unrelated workspaces.
- AES-256-GCM envelopes bind owner, account SID, and key ID as authenticated data. Server-only resolution never falls back to global credentials. Insert-only private credential installation and revision-based rotation preserve old bindings on conflict. Credential audits contain identifiers/revisions, never plaintext or envelopes.
- Private read-only provider verification checks official BrandRegistration, Usa2p and Services/PhoneNumbers resources. Correct account/profile/service/number binding and APPROVED/VERIFIED states are required. It cannot submit registrations, purchase resources, or enable messaging. Provider errors disable the assignment; successful verification also leaves sending disabled.
- Append-only sender/purpose/campaign-specific consent is required. CSV existence or questionnaire acknowledgment does not create consent evidence. Revoked/unknown/missing evidence blocks dispatch.
- Durable STOP suppression, receipts, CRM inbox/history association, queued campaign cancellation, and audit recording are committed together. Ambiguous contacts remain unassociated. START never silently clears suppression.
- Account-specific signature verification precedes every mutation. Payload limits, duplicate parameter rejection, canonical callback URL, owner mapping, and durable MessageSid receipts protect inbound callbacks. Duplicate STOP cannot create duplicate audit events. Conflicting replay fails closed.
- HELP is recorded; application-generated outbound replies remain disabled. Configure and independently verify Twilio Advanced Opt-Out STOP/HELP responses for the actual sending business before the pilot.
- The only SMS POST transport resolves an encrypted subaccount credential, uses the assigned number/service, and obtains a fresh database dispatch authorization. The existing global outbound, subscription, contact, campaign/recipient, quiet-hours, and Assistant approval gates remain. Unknown provider outcomes cannot automatically retry the same operation.
- Registration Center adds responsible-business type, brokerage affiliation/authority, opt-in URL, representative samples, dedicated number and server-derived registration states. Subscriber POST cannot set a brand, sender, approval or credential. Submission is for MyARI review, not a claim of submission to Twilio.
- Managed delivery callbacks record audit and existing delivery evidence. Managed reconciliation uses the original owner-scoped dispatch assignment/account, not a global Twilio credential.

## Entry-point coverage

Manual/campaign sends use `lib/providers/dispatch-message.ts` → `registry.ts` → `twilio.ts`. Scheduled campaign work in `lib/campaigns/engine.ts`, automations, and Assistant-approved delivery converge on that transport. Direct adapter use also checks `authorizeLiveOutbound` and the database claim. Repository inspection found one Messages.json submission implementation, in `lib/providers/twilio.ts`.

Assistant-approved SMS additionally rejects any mismatch between the approved sender identity and the resolved ISV assignment. The existing platform-sender Assistant preview is not silently converted to a different subscriber sender. Assistant sending remains disabled; any future sender-preview change needs separate acceptance.

## STOP ordering and limits

`isv_claim_sms` and `isv_receive_sms` acquire the same transaction advisory lock for `(workspace, business, normalized recipient)`. A send waiting behind a committed STOP re-reads suppression and fails. Parallel copies of one operation have one unique dispatch row and at most one authorization. A failed/unknown/dispatching operation cannot be automatically reclaimed; reconciliation/manual review is required.

Authorization commits state `dispatching` immediately before provider I/O. STOP committed after that boundary cannot recall an in-flight provider request, including the short interval between database commit and HTTP submission. Twilio's own Advanced Opt-Out suppression is required as an additional boundary. Do not advertise an atomic transaction across PostgreSQL and Twilio. Retain webhook receipts indefinitely pending a separately reviewed retention policy; Twilio's standard signature has no timestamp-based replay expiry.

## Migration and recovery

Migration: `supabase/migrations/20261113201305_isv_sms_infrastructure.sql`, generated with Supabase CLI then populated and tested locally. SHA-256 is recorded in `VERIFICATION.json`.

Dependencies: existing `contacts`, `audit_logs`, `inbound_communications`, `communication_suppressions`, `engagement_events`, `campaign_recipients`, `campaign_step_runs`, `outbound_messages`, `outbound_delivery_events`, and existing service-role grants. In particular the reviewed inbound-communications and delivery-evidence migrations must already be installed. No existing tables/functions/policies are replaced. New objects intentionally fail if already installed rather than silently accepting an incompatible partial schema.

Nine new RLS-enabled tables; no client policies; PUBLIC/anon/authenticated have no table/function privileges. service_role gets SELECT/INSERT, with UPDATE limited to business, credential, assignment and dispatch tables. Consent, suppression, receipt, inbound and audit records are append-only for the application role. Ownership FKs, contact-owner triggers, unique keys and server-filtered APIs provide layered isolation. RPCs use SECURITY INVOKER and a fixed search_path.

No hosted migration was applied. Before a separately approved hosted migration: inspect dependency definitions/permissions and existing object absence, verify a completed backup/recovery point, review the exact checksum, then run this transaction once on isolated staging. Record staging migration and authenticated acceptance before requesting Production approval.

Rollback is non-destructive: keep all release flags off, roll application code back if required, retain new data/columns/functions and old decryption keys. Do not drop tables, erase STOP history, restore customer backups, or restore unsafe grants. Provider-uncertain operations require investigation rather than replay. A schema correction should be a reviewed forward migration.

## Configuration (not applied)

- `MANAGED_MESSAGING_SETUP_ENABLED` / existing owner list: preserve PR #58 access controls.
- `MANAGED_SMS_REGISTRATION_ENABLED=true`: requests internal business review on questionnaire save. Default off pending schema installation.
- `MANAGED_SMS_PILOT_ENABLED=false`, `ALLOW_LIVE_OUTBOUND=false`: remain off throughout development.
- `MANAGED_SMS_WEBHOOKS_ENABLED`: independent inbound gate. Once an authorized pilot exists, keep inbound STOP processing available even when outbound is paused.
- `TWILIO_ISV_TOKEN_KEYRING`: server-only Secret containing `{keyId: base64(32 cryptographically random bytes)}`. Never put it in NEXT_PUBLIC configuration, Git or artifacts. Use separate staging and Production keys.
- `TWILIO_ISV_TOKEN_ACTIVE_KEY_ID`: matching non-secret active key ID. Rotate by adding a new private key, switching active ID, running the private revision-checked re-encryption operation, verifying all envelopes, then retiring old keys only after recovery retention requirements are satisfied.
- `APP_BASE_URL`: exact protected Preview origin for canonical signature checks. Callback paths are `/api/webhooks/twilio/sms` and `/api/messaging/isv/delivery`.
- Preserve billing, public launch, paid provisioning, schedulers, Assistant sends and all unrelated release gates as disabled. This branch does not configure them or call paid provisioning APIs.

Private maintenance functions are library-only, with no subscriber HTTP endpoint: `installCredential`, `rotateCredential`, `refreshSenderVerification`. Run only in an authorized server runner with owner-scoped inputs and securely injected staging credentials. A backend service key is never sent to the browser.

## Evidence and external requirements

See `VERIFICATION.json` and `screenshots/`. Browser evidence is the actual React component and actual compiled styles, with synthetic API responses, not hosted Clerk acceptance or carrier delivery.

The new branch has no branch-specific Vercel variables returned by the authorized metadata check. The local runner did not prove the required isolated Supabase host and lacks an ISV encryption keyring. No Preview was deployed; existing Secret values were not decrypted/copied. Reuse the existing PR #58 secure staging binding through an authorized server-side provisioning runner, then independently check effective inherited variables before any Preview deployment. Automatic Vercel deployment is disabled for this branch.

Remaining provider actions: an authorized developer must supply an approved pilot business's own subaccount, secondary profile, brand, approved Usa2p campaign, service and dedicated number, configure callback URLs and actual STOP/HELP disclosures, and securely bind only that account's test credential. Do not reuse Kikzeny Cartagena LLC's rejected registration for independent businesses. No new brand, campaign, number, charge, resubmission or real SMS has been created here.

Remaining hosted acceptance: apply the separately reviewed staging migration; complete isolated credential binding; verify two Development identities in the protected application; verify real provider resource reads, signed inbound/delivery callbacks, STOP/HELP, reconnect/rotation, and an expressly authorized recipient pilot. Real carrier delivery and A2P approval are not claimed. Production remains NO-GO until those gates and final CI pass, followed by separate release approval.

Official API references checked: [BrandRegistrations](https://www.twilio.com/docs/messaging/api/brand-registration-resource), [Usa2p](https://www.twilio.com/docs/messaging/api/usapptoperson-resource), [Messaging Service PhoneNumbers](https://www.twilio.com/docs/messaging/api/phonenumber-resource).
