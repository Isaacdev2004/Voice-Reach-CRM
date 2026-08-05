# Buyer Engagement Workflows — Automation Spec
**For: Voice Reach CRM development**
**Purpose:** Behavior-triggered (not just time-triggered) automation branches for buyer leads across three engagement states.

---

## 1. Required Data Model / Fields

Before these workflows can run, the CRM needs to track the following per contact:

| Field | Type | Notes |
|---|---|---|
| `lead_type` | enum | buyer / seller / investor / partner |
| `lead_status` | enum | cold / engaged_no_tour / toured_no_followup / active / nurture |
| `last_engagement_at` | timestamp | last open, click, reply, or inbound touch |
| `last_engagement_type` | enum | email_open / email_click / reply / text_reply / call_answered / tour_completed |
| `engagement_score` | integer | see scoring logic below |
| `listings_viewed` | array | listing IDs + timestamp, for referencing "the listing they clicked" in follow-ups |
| `sequence_active` | string | which of the 3 workflows (or none) is currently running |
| `sequence_step` | integer | current step within active sequence |
| `sequence_started_at` | timestamp | for computing day offsets below |
| `tour_count` | integer | 0, 1, 2+ — determines workflow eligibility |
| `opt_out_requested` | boolean | hard stop on all sequences if true |

**Engagement score (simple weighted model, tune as needed):**
```
email_open        = +1
email_click        = +3
reply (email/text) = +10
call_answered       = +10
tour_completed      = +20
14 days no activity = -5 (decay)
```
- `engagement_score >= 5` and `tour_count == 0` → eligible for Workflow 2
- `engagement_score < 5` and `last_engagement_at > 14 days ago` → eligible for Workflow 1
- `tour_count >= 1` and no engagement since last tour → eligible for Workflow 3

---

## 2. Workflow 1 — Cold Lead Re-Engagement

**Entry trigger:** `lead_status = cold` AND (`last_engagement_at` is null OR > 14 days ago) AND `sequence_active != this workflow`

**Exit conditions:** any reply/click → move to Workflow 2 evaluation; `opt_out_requested = true` → hard stop; tour scheduled → move to active pipeline (remove from automation)

| Step | Day offset | Channel | Content type | Send condition |
|---|---|---|---|---|
| 1 | Day 0 | Email | Market update / saved-search digest (value-first, no CTA to "check in") | Always |
| 2 | Day 3 | SMS | Short, casual, single question re: search status | If no reply to Step 1 |
| 3 | Day 7 | Ringless voicemail | Low-pressure availability message | If no reply to Step 2 |
| 4 | Day 14 | Email | "Should I stop reaching out?" opt-down message | If no reply to Step 3 |
| 5 | Day 21 | — | Move to `lead_status = nurture`, monthly market-report-only cadence | Always, regardless of reply |

**Branch logic:**
- Reply detected at ANY step → immediately halt remaining steps in this sequence, re-evaluate contact against Workflow 2 rules
- Step 4 explicit opt-down reply ("yes stop") → set `opt_out_requested = true`, remove from all sequences

---

## 3. Workflow 2 — Engaged, No Tour Scheduled

**Entry trigger:** `engagement_score >= 5` AND `tour_count = 0` AND `sequence_active != this workflow`

**Exit conditions:** tour scheduled → remove from automation, move to active pipeline; 14 days no response after Step 4 → downgrade to Workflow 1 (cold) evaluation

| Step | Day offset | Channel | Content type | Send condition |
|---|---|---|---|---|
| 1 | Immediate (on trigger) | Email/Text | Personal reference to specific listing in `listings_viewed`; offer to send details or set up showing | Always |
| 2 | +2 days | Email/Text | Lower-friction offer: video walkthrough / FaceTime tour in place of in-person | If no reply to Step 1 |
| 3 | +5 days | Email | "What to know before touring" — addresses financing/timing objections indirectly | If no reply to Step 2 |
| 4 | +7 days | Text/Call task | Soft direct ask for a 10-min call ("so I only show you the right stuff") | If no reply to Step 3 |
| 5 | +14 days from Step 4 with no response | — | Route back into Workflow 1 (cold) logic | If no reply to Step 4 |

**Personalization requirement:** Step 1 must dynamically pull the most recent entry in `listings_viewed` (address/link) into the message template — this is a hard requirement, not optional, since the whole workflow depends on referencing something specific.

---

## 4. Workflow 3 — Post-Tour, No Second Touch

**Entry trigger:** `tour_count >= 1` AND no engagement logged since `tour_completed` timestamp AND `sequence_active != this workflow`

**Exit conditions:** second tour scheduled → remove from automation; reply received → route to manual follow-up task for owner/agent, do not continue automation

| Step | Day offset | Channel | Content type | Send condition |
|---|---|---|---|---|
| 1 | Same day as tour | Text | Thank-you + specific reaction prompt (reference a feature of the toured property) | Always |
| 2 | +2 days | Email | 2-3 comparable listings not yet in `listings_viewed` | If no reply to Step 1 |
| 3 | +5 days | Text/Email | Direct question isolating objection: price / location / property itself | If no reply to Step 2 |
| 4 | +7 days from Step 3 with no response | — | Route to Workflow 1 (cold) logic | If no reply |

---

## 5. Cross-Workflow Rules

1. **A contact is only ever in one active sequence at a time** (`sequence_active` field enforces this).
2. **Any inbound reply on any channel** should trigger an immediate re-evaluation against entry conditions for all three workflows, in this priority order: Workflow 3 > Workflow 2 > Workflow 1 (most-engaged state wins).
3. **Hard stop fields**: `opt_out_requested = true` overrides all sequence entry logic permanently.
4. **Tour scheduling** (any workflow) should immediately halt automation and create a manual task/notification for the agent — no workflow should continue running once a tour is booked.
5. **Logging**: every automated send should log to the contact's activity timeline with sequence name + step number, so manual follow-up (owner/agent) has full context without re-deriving where the automation left off.

---

## 6. Suggested Webhook / Trigger Events Needed

- `on_email_open`, `on_email_click`, `on_email_reply`
- `on_sms_reply`
- `on_call_answered` / `on_call_completed`
- `on_tour_scheduled`, `on_tour_completed`
- `on_listing_viewed` (from site/portal integration, if available) → appends to `listings_viewed`
- `nightly_batch_job` → recalculates `engagement_score` decay and re-evaluates cold-lead eligibility (Step 1 of Workflow 1 entry condition)

---

*Prepared for developer implementation within Voice Reach CRM. Copy/messaging content for each step to be provided separately — this spec defines trigger logic, timing, and data requirements only.*
