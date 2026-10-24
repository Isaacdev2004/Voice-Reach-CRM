# MyARI Assistant 2.0 — implementation, audit and acceptance report

> Pricing correction: the earlier $20 AI Pro add-on is retired. AI Plus is included in one $65/$115/$215 base subscription; CRM Only remains $49/$99/$199. [Current pricing report](../ai-pricing-launch/README.md) supersedes earlier billing/add-on references below. No production rollout was performed.

Status: **isolated development branch; not deployed, not enabled for subscribers**. Branch `feat/ai-operating-assistant`. Includes the subsequent universal/contextual/voice requirements and the staged AI-inclusive pricing work. No production subscriber, campaign, appointment, recording, Stripe product, subscription or provider configuration was modified. No live communications, paid synthesis or production AI calls were made.

## 1. Existing Claude architecture and confirmed repairs

`lib/ai/generate.ts` calls Anthropic Messages with `ANTHROPIC_API_KEY`, model `ANTHROPIC_MODEL` (default `claude-sonnet-4-5`), task-specific prompts, JSON extraction/normalization, and deterministic fallback drafts. `/api/ai/generate` requires Clerk; the legacy modal supplies task/context/brief. Other existing Claude consumers include Notes, Tasks, Voice Studio writing, Brand Kit assistance, activity insights and cached Dashboard briefing.

Confirmed before implementation: no CRM tool loop; no durable general conversation history; browser-supplied names/notes were trusted; fallback email claimed a recent conversation and follow-up fallback claimed engagement/conversion performance without evidence; provider error bodies were logged; no timeout on the generic Claude fetch. These were repaired with owner-authorized server context, input bounds, safe fallback wording, status-only provider error logging, timeout, usage guards and tests. Claude remains intact and is still the default existing UI when V2 is off. Unsaved browser text is user-supplied material, never authoritative CRM evidence.

## 2. OpenAI integration and provider-independent orchestration

`lib/assistant/provider.ts` defines a canonical reasoning-provider contract, tool definitions/messages, and separate Claude Messages / OpenAI Responses adapters. OpenAI uses `/v1/responses`, `store:false`, native function calls/results, bounded output, timeout, one bounded retry for 429/503 only, actual returned token counts and configurable `OPENAI_ASSISTANT_MODEL` (conservative default `gpt-5-mini`). Actual account model access is **unverified**. Credentials remain server-side. OpenAI API credits are separate from a ChatGPT subscription.

`ASSISTANT_REASONING_PROVIDER=openai|claude` selects explicitly. There is no automatic provider switch, including during approval/execution. Reasoning never executes CRM writes. An API/model response is not subscriber approval. Execution does not invoke an LLM.

## 3. Secure CRM tools

The exact current registry is in [TOOLS.json](TOOLS.json). Read tools cover contact search/details/activity, existing lifecycle opportunities, campaigns/steps/enrollments, tasks, calendar coverage/events, notes, saved property addresses/buyer criteria, transaction milestones, approved Brand Kit, authorized preferred partners, voice script drafts/asset metadata, setup status, actual attributed replies, existing Daily Briefing sources, planning-resource catalog and stored assistant work/proposals.

Prepare tools cover notes, tasks/reminders, SMS/email, separate campaign drafts, internal appointments, voice script text, calculator-backed financing, branded flyers, follow-up recommendations, existing transaction checklists and buyer property preferences. No unrestricted SQL, arbitrary URL fetching, credentials, activation, enrollment, bulk delivery, billing, permissions or record-deletion tool exists. Billing controls are separate authenticated subscriber UI actions, never model tools.

Every call uses the authenticated server owner. Associated contacts/records are checked again. Search results and context are bounded; limited coverage is reported rather than presented as complete. Dashboard Opportunities uses the existing active-lead lifecycle classifier, not invented intent or revenue. CRM property addresses are subscriber-maintained records, not independently verified MLS data.

## 4. Durable conversations and multi-step work

MyARI's existing private `audit_logs` stores owner-scoped messages, proposals, turn locks, usage reservations, provider health, approvals, claims and outcomes. Unique deterministic primary keys provide durable duplicate rejection. Conversation history can be resumed; server-stored proposal IDs make revisions/recovery possible. Command Center recovers proposals even if the provider fails after preparing them. This is synchronous bounded orchestration: up to four reasoning rounds and twelve tool calls, **not a claimed background-job system**.

Conversation deletion removes that owner's message rows and tombstones the conversation ID. Approved CRM records, saved document drafts and minimal execution/usage audits are retained separately. Subscriber settings control a 7/30/90-day **recall window**; this is not a claim that all historic audit payloads are physically purged. A legal/operational retention and scheduled-purge policy remains a rollout gate.

## 5. Universal assistant and contextual awareness

The existing authenticated app-wide launcher opens the opt-in right drawer. The current Claude draft modal remains available. The compact drawer is non-modal so other page controls remain usable; expansion provides a focused modal workspace. Closing preserves the command, proposals and underlying page. Stable route/query IDs are used; contact preview and Voice Studio publish in-memory selected record IDs, never inferred visible text. IDs are retrieved and authorized server-side. Unsaved editor content is preserved but is not misrepresented as persisted backend data.

Contextual suggestions cover Dashboard, Contacts, Campaigns, Calendar, Tasks, Notes, Property Finder, Financing, Voice Studio, Activity and Settings. Missing names, dates, timezones, record selection or permissions require clarification. Contactless AI reminders currently require choosing an actual CRM association rather than inventing a person. Existing manual personal-task functionality is unchanged.

## 6. Approval and execution

A prepared action has an immutable canonical payload, exact target/content preview, digest and 30-minute expiry. Confirmations use a separate authenticated endpoint. Before execution the server revalidates ownership and current context; a changed preview requires fresh review. One durable claim permits at most one execution. Replays return the saved outcome; uncertain failures become **Needs Attention**, never an automatic second mutation.

Supported confirmed saves use existing MyARI services: notes, tasks, internal Calendar events, checklist assignment, property preference patching, new Voice Studio text drafts and separate campaign drafts. Private flyer/financing document saves are recorded in Command Center. Live templates, approved audio and enrollments are not overwritten. Editing a completed proposal is refused; use the existing CRM record editor rather than presenting a new create as a reschedule/update.

For SMS/email, exact recipient and resolved content are displayed. External delivery is separately disabled by default. If explicitly enabled, it requires **CONFIRM_SEND**, existing launched campaign/enrollment IDs, existing channel allowance checks, consent/suppression/quiet-hour/shared-number guards, configured provider and the outbound kill switch. `CONFIRM_SAVE` cannot authorize a send. Twilio/Resend reuse the existing dispatch path with a stable idempotency key. Provider acceptance is distinguished from delivered status. Outside-campaign sending, bulk communications, voicemail delivery, invitations and campaign activation are unsupported through this assistant.

## 7. Campaigns, calendar and tasks

Campaign proposals include complete channel copy, day offsets, duration and audience criteria; saving calls the existing builder in `template` mode with no enrollments and mock delivery configuration. Existing templates remain intact. Approved recordings and reviewed attachments must be selected separately in the existing builder. The planning-resource tool points to authenticated existing guides; it does not pretend to attach or personalize them automatically.

Calendar reads use the existing internal/Google read model and disclose disconnected or incomplete coverage. Appointments require explicit offset/timezone, display conflicts, and save through the existing conflict-checking service with external sync/invitations disabled. No external event creation is claimed. Tasks/reminders and checklist deadlines reuse actual services; checklist deadlines require contract/agent review. Existing workspace schema dependencies remain relevant.

## 8. Voice commands and Sapphire

The microphone requires explicit permission and start/stop actions. Recording is limited to 60 seconds, stops on cleanup, and cannot silently authorize actions. The client converts recorded audio to PCM WAV; server duration is validated from audio frames, never a browser duration header. Existing authenticated OpenAI Whisper transcription is reused. Returned text is editable and never auto-submitted. The drawer prevents accidental closing while recording/transcription is in progress; browser/account cleanup releases the microphone.

Voice-script generation means a **text draft**, not approved audio. Existing Sapphire name/owner validation is retained. New AI-inclusive Sapphire generation is held closed pending verified generated-audio duration accounting/provider acceptance; no substitute voice, clone, paid generation or recording replacement was performed.

## 9. Flyer and financing production

Flyers use a real owned saved address and approved Brand Kit. Logos/headshots are downloaded only from validated owner branding paths, decoded/re-encoded with pixel/size limits, and embedded into self-contained output. Editable headline/description/price, source JSON/SVG, layout/accent controls and deterministic PNG/PDF exports are supported. Text, pricing and disclosures are deterministic and escaped; layout limits reject overflow instead of silently clipping it. Prices require explicit subscriber-entered provenance. Partner details require actual owned authorized branding records. No invented listing images, fake match scores, endorsements or assumed asking prices.

Financing calls existing validated calculators and deterministic report exporters; figures are not model arithmetic. Outputs are preliminary estimates based on declared assumptions. Sharing is not automatic. OpenAI image generation is **not enabled**: recommend it only for clearly illustrative non-listing assets after a separate media budget/approval workflow. Authorized property-photo ingestion/replacement and provider-specific creative-media acceptance remain unfinished integrations, not advertised as operational listing photography.

## 10. AI Command Center and preferences

`/dashboard/assistant` provides In Progress, Awaiting Approval, Completed, Needs Attention and Cancelled states, search/filter, exact previews, approval, dismissal, stored-result recovery and created-record links. Completed appears only after confirmed backend results; message submission does not claim delivery. Inline editing and natural-language proposal revisions create separate reviewed versions. A result check is safe; ambiguous writes are not blindly retried.

Existing versioned subscriber Brand Kit settings now carry tone/style, recall window, preferred authorized lender/title references, optional notification preference and low-risk preparation preference. Voice/branding/timezone use existing settings. All writes/sends retain mandatory confirmation regardless of preference. No new automatic notification delivery is claimed; existing Dashboard briefing preferences remain authoritative.

## 11. Twilio audit and daily briefing

Existing SMS/call webhook routes validate Twilio signatures, preserve provider SID/status dedupe and forwarding-leg evidence, and use existing suppression/reply-stopping infrastructure. The shared platform number is deliberately quarantined when subscriber attribution is ambiguous. This implementation does not guess ownership or change live Twilio Console/webhooks. Only actual owner-attributed inbound records are used. Personal mobile calls are not claimed as tracked. Response candidates disclose incomplete coverage and other-channel limitations.

The assistant reads existing Dashboard priorities/cached briefing sources without generating a paid summary on every refresh. Existing scheduled briefing infrastructure/preferences remain intact. Actual replies, missed-call evidence, tasks, appointments, deadlines and failures are sourced through those services; unavailable sources remain unavailable. No new background notification scheduler is claimed.

## 12. Security, usage and costs

Clerk/authentication is unchanged. Owner filters and associated-record authorization are mandatory. Retrieved text is untrusted data, never instructions; model tool calls cannot reach execution. Inputs, sizes, IDs, timestamps, tool names and action types are validated. Secrets/provider error bodies are excluded from logs/results. OpenAI provider state is not the conversation authority.

Safety limits: five interactions/minute; default thirty/day; forty reasoning calls/day; bounded context/output/tool rounds. These are explicit operational rate protections, configurable before rollout. Observed tokens and configured-rate estimates are recorded separately from subscriber allowance counts. Without verified rates, dollar costs remain unavailable. Actual invoice reconciliation, cached-token pricing, legacy-provider token coverage and media billing are not fabricated. Cost hard stops require an additional approved policy flag; operational AI Plus $5 / AI Pro $12 thresholds are not subscriber billing limits.

The subsequent staged pricing implementation and atomic monthly usage ledger are documented in [AI pricing launch report](../ai-pricing-launch/README.md).

## 13. Validation and screenshots

Synthetic subscribers and mocked providers only. New assistant tests cover registry boundaries, spoofed context/IDs, tenant isolation, proposal integrity/expiry, explicit save/send approvals, duplicate prevention, failed services, task/calendar/campaign saves, Responses encoding, tool loops, prompt injection, outages, durable history/deletion, voice scripts, document rendering and body limits. Pricing tests cover catalog consistency, cohorts/dates, Stripe item identities, billing states, resets, caps, upgrades, admin scope and audio duration. PostgreSQL transactions were tested in an isolated local container with concurrency and RLS checks.

Browser captures at 1440, 1280, 768 and 390 pixels are in this directory: `assistant-{width}.png` and `command-center-{width}.png`. They are synthetic component QA, not live authenticated production certification. Tests verify preserved unsaved work, explicit mocked dictation, editable transcript, no auto-submit/send, exact approval, confirmed result links, expansion and no horizontal overflow. See final QA results below after verification completes.

## 14. Migration, rollback and readiness

- V2 is **off by default**. Internal access requires server allowlisting; later paid launch access additionally requires verified AI entitlement and explicit rollout gates.
- Claude is preserved. Select Claude explicitly or disable V2 to restore the existing UI. No silent provider fallback.
- Monthly paid usage requires the reviewed `20261030000000_ai_usage_meter.sql` migration. It was applied only to isolated synthetic PostgreSQL; never production.
- No branch push/PR deployment was triggered because this repository auto-builds Vercel previews on pushes. The local branch is ready for review.
- No production Stripe prices or subscriptions were created/changed; no new launch date or regular post-launch price was invented.

**Production rollout is not yet certified.** Blockers: approved OpenAI/Anthropic account/model access and pricing; real Stripe test-mode checkout/webhook/invoice/proration/cancellation acceptance; reviewed production migration and RLS verification; Sapphire duration metering; authorized property-photo/media workflow; complete direct-cost reconciliation/admin alerts; approved retention/purge policy; messaging concurrency/allowance acceptance and shared-number attribution; signed-in staging end-to-end/load/permission acceptance. Existing compound campaign persistence can still need manual recovery after partial failure. No speculative production migration or permission relaxation was applied.

## Final local QA

See [complete test results and acceptance limits](QA.md) and [files changed](FILES-CHANGED.txt). New launch pricing, V2 public access and approved-send flags remain disabled. Review readiness is established locally; production rollout remains blocked by the documented external acceptance and business approvals.
