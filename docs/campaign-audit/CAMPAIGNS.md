# Campaign-by-campaign audit

All 11 bundled templates and all 56 steps were inspected. Subscriber database campaigns are **not verified**. No campaign is marked PASS while delivery, consent and database checks remain unresolved. Original template definitions are unchanged.

| Template | ID | Steps | Classification |
| --- | --- | ---: | --- |
| Cold Lead Re-engagement | tpl-cold-lead-reengage | 5 | **NEEDS REVIEW** |
| Speed-to-Lead Quick Response | tpl-speed-to-lead | 6 | **FAIL** |
| Listing Alert Drip | tpl-listing-alert-drip | 5 | **FAIL** |
| Long-term Buyer Nurture | tpl-long-term-buyer-nurture | 7 | **FAIL** |
| Engaged - No Tour Yet | tpl-engaged-no-tour | 5 | **NEEDS REVIEW** |
| Post-Tour Follow-up & Offer Push | tpl-post-tour-follow-up | 6 | **FAIL** |
| Luxury Seller – Automated Follow Up | tpl-luxury-seller-follow-up | 6 | **FAIL** |
| Seller Home Valuation Follow-up | tpl-seller-valuation | 5 | **FAIL** |
| Open House Follow-up | tpl-open-house | 4 | **FAIL** |
| Past Client Anniversary & Referral | tpl-past-client | 4 | **NEEDS REVIEW** |
| Pre-approval Push | tpl-pre-approval | 3 | **NEEDS REVIEW** |

## Cold Lead Re-engagement

ID: `tpl-cold-lead-reengage`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Cold / inactive buyers (14+ days quiet). Channels: email, sms, voicemail, callback. Reviewed **5 steps**. Classification: **NEEDS REVIEW**.

### Personalization issues

No additional issue identified by the defined synthetic checks.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

No additional issue identified by the defined synthetic checks.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. Market update / saved-search digest

Channel: email. Timing: Day 1, 9:00 AM; resolved fixture instant: 2026-10-22T13:00:00.000Z. Variables: {{area}}, {{first_name}}, {{agent_name}}, [AgentPhone], [Brokerage].

Original:

> Subject: {{area}} market update for you, {{first_name}}
> 
> Hi {{first_name}},
> 
> I've been watching the {{area}} market and wanted to share a quick snapshot - no check-in ask, just useful info.
> 
> If you're still keeping an eye on homes in {{area}}, reply UPDATE and I'll send this week's pricing pulse plus 2–3 standout listings.
> 
> Happy to adjust what I'm watching for you anytime.
> 
> {{agent_name}}
> [AgentPhone] | [Brokerage]

Proposed **review-only** email copy:

> Subject: A fresh look at your home search
> 
> Hi [FirstName],
> 
> Would an updated look at homes in {{area}} be useful? Tell me what has changed in your timing or priorities, and I can help you decide on a practical next step.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 2. Casual search-status SMS

Channel: sms. Timing: Day 3, 11:00 AM; resolved fixture instant: 2026-10-24T15:00:00.000Z. Variables: [FirstName], [Agent], [City].

Original:

> Hey [FirstName], [Agent] here - still looking in [City], or has your timeline shifted? Either answer is fine. Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], [Agent] here. Are you still considering a move in [City], or has your timing changed? Either answer helps me tailor the follow-up. Reply STOP to opt out.

#### 3. Low-pressure availability VM

Channel: voicemail. Timing: Day 7, 10:00 AM; resolved fixture instant: 2026-10-28T14:00:00.000Z. Variables: [FirstName], [Agent], [Brokerage], [City].

Original:

> Hi [FirstName], this is [Agent] with [Brokerage]. Just leaving a quick note - I'm around if you want to talk through the [City] market or tweak your search. No pressure at all. You have my number whenever timing feels right. Take care.

Proposed **review-only** voicemail copy:

> Hi [FirstName], this is [Agent] with [Brokerage]. I’m available if you would like to revisit your real estate plans or talk through the market in [City]. No pressure—please reach out whenever the timing suits you.

#### 4. Opt-down / should I stop?

Channel: email. Timing: Day 14, 9:00 AM; resolved fixture instant: 2026-11-04T14:00:00.000Z. Variables: [FirstName], [City], [Agent], [AgentPhone], [Brokerage].

Original:

> Subject: Should I keep sending these, [FirstName]?
> 
> Hi [FirstName],
> 
> I've reached out a few times and don't want to fill your inbox if the timing isn't right.
> 
> Should I keep sending market updates and listing ideas for [City], or would you rather I stop for now?
> 
> Just reply:
> · YES - keep me on the list
> · PAUSE - hold off for a bit
> · STOP - remove me
> 
> Either way is completely fine - I only want to be useful.
> 
> [Agent]
> [AgentPhone] | [Brokerage]

Proposed **review-only** email copy:

> Subject: Would you like me to keep in touch?
> 
> Hi [FirstName],
> 
> I want these updates to be useful. Would you prefer an occasional market note, a pause, or a different kind of help? You can contact me directly with your preference.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 5. Move to nurture cadence

Channel: callback. Timing: Day 21, 9:00 AM; resolved fixture instant: 2026-11-11T14:00:00.000Z. Variables: none.

Original:

> Set lead_status = nurture. Enroll in Long-term Buyer Nurture if still silent. If they replied or listened, call personally within 24 hours.

Proposed **review-only** callback copy:

> Review this contact’s response and preferences. If appropriate and authorized, propose a nurture plan for agent approval; do not change lifecycle stages or enroll another sequence automatically.


## Speed-to-Lead Quick Response

ID: `tpl-speed-to-lead`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Brand-new buyer leads (form, IDX, portal, lead ads). Channels: sms, email, callback. Reviewed **6 steps**. Classification: **FAIL**.

### Personalization issues

No additional issue identified by the defined synthetic checks.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

- Step 2: Claims specific supporting information or activity that is not supplied by this template.
- Step 4: Claims specific supporting information or activity that is not supplied by this template.
- Step 5: Claims specific supporting information or activity that is not supplied by this template.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. First SMS (<60s)

Channel: sms. Timing: Day 1, Immediate; resolved fixture instant: 2026-10-22T12:00:00.000Z. Variables: [FirstName], [Agent], [Brokerage], [PropertyAddress].

Original:

> Hi [FirstName]! This is [Agent] from [Brokerage] - I just saw your inquiry about [PropertyAddress]. Great choice! I have a few similar listings to share right now. Can I send them over, or is there a better time to connect? Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], this is [Agent] with [Brokerage]. Thanks for getting in touch. What would be most helpful right now—property details, search guidance, or a quick conversation? Reply STOP to opt out.

#### 2. First email (<2 min)

Channel: email. Timing: Day 1, Immediate +2m; resolved fixture instant: 2026-10-22T12:02:00.000Z. Variables: {{first_name}}, {{agent_name}}, {{area}}, {{property_address}}, [Brokerage], [AgentPhone].

Original:

> Subject: I found homes matching your search - {{first_name}}
> 
> Hi {{first_name}},
> 
> Thanks for reaching out! I'm {{agent_name}}, your local real estate specialist covering {{area}}.
> 
> I pulled up the listing you were looking at - {{property_address}} - and I want to make sure you don't miss out.
> 
> Here's what I'd love to do for you in the next 15 minutes:
> → Send you a shortlist of 3–5 similar homes
> → Answer any questions about the neighborhood, schools, or pricing
> → Get you set up with instant alerts so you see new listings the moment they hit
> 
> Is now a good time to chat? Even a quick 10-minute call can save you weeks of searching.
> 
> Talk soon,
> 
> {{agent_name}}
> [Brokerage] · [AgentPhone]

Proposed **review-only** email copy:

> Subject: How can I help with your search?
> 
> Hi [FirstName],
> 
> Thank you for reaching out. What are your priorities for {{area}}? Share your preferred timing and must-haves, and I can help you identify a useful next step.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 3. Agent call task

Channel: callback. Timing: Day 1, Immediate +5m; resolved fixture instant: 2026-10-22T12:05:00.000Z. Variables: [FirstName], [LeadSource], [PropertyAddress].

Original:

> Call [FirstName] - new lead from [LeadSource] interested in [PropertyAddress]. Confirm timeline, budget, and whether they want a shortlist or showing. Due within 4 hours.

Proposed **review-only** callback copy:

> Review the inquiry, confirm the actual property and source, and arrange a personal follow-up. Do not claim a call or listing review has already happened.

#### 4. Day 1 comps follow-up (no reply)

Channel: email. Timing: Day 2, 10:00 AM; resolved fixture instant: 2026-10-23T14:00:00.000Z. Variables: {{property_address}}, {{first_name}}, {{area}}, {{agent_name}}, [AgentPhone], [Brokerage].

Original:

> Subject: Still searching? A few homes near {{property_address}} worth seeing
> 
> Hi {{first_name}},
> 
> I wanted to follow up in case my first message got buried.
> 
> I pulled a short list of homes near {{property_address}} that match what you're looking for in {{area}} and wanted to share them before they're gone.
> 
> Reply LIST and I'll send the 3 strongest options with beds, baths, and price - no pressure at all.
> 
> If any catch your eye, I can get you in for a showing as early as tomorrow.
> 
> {{agent_name}}
> [AgentPhone] | [Brokerage]

Proposed **review-only** email copy:

> Subject: A quick follow-up on your search
> 
> Hi [FirstName],
> 
> I wanted to make sure you have a way to reach me. Would you like help comparing properties, refining your criteria, or planning a tour? I’m happy to work at your pace.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 5. Day 3 new-listing nudge

Channel: sms. Timing: Day 3, 11:00 AM; resolved fixture instant: 2026-10-24T15:00:00.000Z. Variables: {{first_name}}, {{agent_name}}, {{area}}.

Original:

> Hey {{first_name}}, {{agent_name}} again. Still looking in {{area}}? A strong match just hit - want details or a showing this week? - {{agent_name}} Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi {{first_name}}, {{agent_name}} here. Has anything changed in your search priorities for {{area}}? I’m available if you would like help with the next step. Reply STOP to opt out.

#### 6. Day 5 breakup text

Channel: sms. Timing: Day 5, 10:00 AM; resolved fixture instant: 2026-10-26T14:00:00.000Z. Variables: [FirstName], [MarketArea], [Agent], [AgentPhone].

Original:

> Hi [FirstName], I don't want to keep bugging you - just wanted to make sure you have my number if you ever need a local expert in [MarketArea]. No pressure at all. Wishing you the best! - [Agent] [AgentPhone] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], I’ll give you some space for now. If you would like help with your real estate plans later, you’re welcome to reach out. —[Agent] Reply STOP to opt out.


## Listing Alert Drip

ID: `tpl-listing-alert-drip`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Active buyers with a search criteria / saved search. Channels: email, sms. Reviewed **5 steps**. Classification: **FAIL**.

### Personalization issues

No additional issue identified by the defined synthetic checks.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

- Step 1: Claims specific supporting information or activity that is not supplied by this template.
- Step 2: Claims specific supporting information or activity that is not supplied by this template.
- Step 3: Claims specific supporting information or activity that is not supplied by this template.
- Step 5: Missing explicit STOP instruction; PAUSE is not an automated SMS opt-out keyword in the current receiver.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. Weekly matching homes digest

Channel: email. Timing: Day 1, 9:00 AM; resolved fixture instant: 2026-10-22T13:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: New matches for your search this week
> 
> Hi [FirstName],
> 
> Here are the strongest new listings that fit what we've been watching together. I've highlighted what stands out on each.
> 
> Reply with any address you want a deeper look at - or "tour" and I'll set times.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Keeping your property search focused
> 
> Hi [FirstName],
> 
> Are your location, budget, and must-haves still the same? Let me know what matters most, and I can help you review suitable properties without filling your inbox with irrelevant options.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 2. High-match alert SMS

Channel: sms. Timing: Day 3, 10:00 AM; resolved fixture instant: 2026-10-24T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName] - strong match just hit your criteria. Want details or a showing this week? - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], would a fresh look at properties that fit your priorities be useful? Let me know whether you prefer details by message or a quick conversation. —[Agent] Reply STOP to opt out.

#### 3. Price-drop style nudge

Channel: sms. Timing: Day 14, 11:00 AM; resolved fixture instant: 2026-11-04T16:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> [FirstName], a home on your watchlist had a meaningful update. Want me to send the new numbers? - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], are there any homes you would like me to check on? Send an address or tell me what has changed in your search. —[Agent] Reply STOP to opt out.

#### 4. Monthly check-in

Channel: email. Timing: Day 30, 10:00 AM; resolved fixture instant: 2026-11-20T15:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: Quick pulse on your home search
> 
> Hi [FirstName],
> 
> It's been about a month - has anything shifted on budget, neighborhood, or timing? I can tighten alerts so you only see what still fits.
> 
> One reply is enough.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Has your home search changed?
> 
> Hi [FirstName],
> 
> Would you like to adjust your preferred neighborhoods, budget, or timing? A brief reply will help me keep future recommendations relevant.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 5. 60-day re-engage

Channel: sms. Timing: Day 60, 10:00 AM; resolved fixture instant: 2026-12-20T15:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName] - still want listing alerts, or should I pause for now? Reply YES to keep them or PAUSE to stop. - [Agent]

Proposed **review-only** sms copy:

> Hi [FirstName], would you like occasional search updates, or would you prefer a pause? You can let me know what works best. —[Agent] Reply STOP to opt out.


## Long-term Buyer Nurture

ID: `tpl-long-term-buyer-nurture`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Cold / long-term buyers (6+ month timeline). Channels: email, sms. Reviewed **7 steps**. Classification: **FAIL**.

### Personalization issues

No additional issue identified by the defined synthetic checks.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

- Step 2: Claims specific supporting information or activity that is not supplied by this template.
- Step 5: Claims specific supporting information or activity that is not supplied by this template.
- Step 6: Missing explicit STOP instruction; PAUSE is not an automated SMS opt-out keyword in the current receiver.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. Market education

Channel: email. Timing: Day 1, 10:00 AM; resolved fixture instant: 2026-10-22T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: What buyers should watch this month
> 
> Hi [FirstName],
> 
> A quick, no-pressure briefing on inventory, pricing, and what smart buyers are doing right now in our market.
> 
> If you want this tailored to a specific neighborhood, reply with the area.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Planning a move at your pace
> 
> Hi [FirstName],
> 
> A little preparation can make a future move easier. What would be useful to explore first: neighborhoods, a realistic timeline, or the steps involved in buying?
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 2. Neighborhood spotlight

Channel: email. Timing: Day 14, 10:00 AM; resolved fixture instant: 2026-11-04T15:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: Neighborhood spotlight worth knowing
> 
> Hi [FirstName],
> 
> Here's a short look at a neighborhood clients often ask about - lifestyle, schools, and what recent sales suggest.
> 
> Happy to compare it to anywhere else on your list.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Which neighborhoods are on your list?
> 
> Hi [FirstName],
> 
> If you are comparing areas, tell me what matters most in your day-to-day life. I can help you find reliable information and questions to consider without assuming one neighborhood is right for you.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 3. Quarterly soft SMS

Channel: sms. Timing: Day 30, 11:00 AM; resolved fixture instant: 2026-11-20T16:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName] - still planning a move in the next year? I can keep quiet updates coming, or pause anytime. - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], is a move still part of your longer-term plans? I can keep in touch occasionally or give you space—whichever is more useful. —[Agent] Reply STOP to opt out.

#### 4. Financing / timing tip

Channel: email. Timing: Day 45, 10:00 AM; resolved fixture instant: 2026-12-05T15:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: One timing tip most buyers miss
> 
> Hi [FirstName],
> 
> Whether you're 3 months or 18 months out, a little prep now (pre-approval, must-haves vs nice-to-haves) makes the search much calmer later.
> 
> Want a simple checklist?
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: A simple way to prepare for a future move
> 
> Hi [FirstName],
> 
> Even with a longer timeline, listing your must-haves and understanding financing options can bring clarity. Would a short preparation checklist help?
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 5. Inventory / opportunity note

Channel: email. Timing: Day 90, 10:00 AM; resolved fixture instant: 2027-01-19T15:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: A quiet opportunity in the market
> 
> Hi [FirstName],
> 
> Occasionally a listing fits long-term buyers even if they're not "actively touring" yet. Here's what I'm seeing and why it might matter later.
> 
> No rush - just keeping you informed.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Keeping your options in view
> 
> Hi [FirstName],
> 
> Have your priorities or timing changed? I can help you review options when you are ready, without rushing a decision.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 6. 90-day re-engage gate

Channel: sms. Timing: Day 90, 2:00 PM; resolved fixture instant: 2027-01-19T19:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName], checking if home-search timing has changed. Reply READY, LATER, or PAUSE. - [Agent]

Proposed **review-only** sms copy:

> Hi [FirstName], how is your planning going? Let me know if you would like help, a later follow-up, or a pause. —[Agent] Reply STOP to opt out.

#### 7. 6-month relationship note

Channel: email. Timing: Day 180, 10:00 AM; resolved fixture instant: 2027-04-19T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: Still here when you're ready
> 
> Hi [FirstName],
> 
> Just a note that I'm still happy to be your local resource - market questions, neighborhood intel, or a quiet first tour when timing is right.
> 
> Whenever you're ready,
> [Agent]

Proposed **review-only** email copy:

> Subject: Here when you are ready
> 
> Hi [FirstName],
> 
> I’m happy to be a resource whenever your next move comes into focus. You can reach out with a market question, a property you are considering, or a change in plans.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.


## Engaged - No Tour Yet

ID: `tpl-engaged-no-tour`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Engaged buyers (score ≥5) with zero tours. Channels: sms, email, callback. Reviewed **5 steps**. Classification: **NEEDS REVIEW**.

### Personalization issues

No additional issue identified by the defined synthetic checks.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

No additional issue identified by the defined synthetic checks.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. Personal listing reference

Channel: sms. Timing: Day 1, Immediate; resolved fixture instant: 2026-10-22T12:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName] - saw you were looking at a listing that fits. Want details or a short showing window this week? - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], would a brief conversation or a tour help you narrow your search? Let me know what would feel useful at this stage. —[Agent] Reply STOP to opt out.

#### 2. Video / virtual tour offer

Channel: email. Timing: Day 3, 10:00 AM; resolved fixture instant: 2026-10-24T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: Prefer a FaceTime walkthrough first?
> 
> Hi [FirstName],
> 
> If an in-person tour feels like a big step, I can do a quick video walkthrough so you only visit the homes that truly fit.
> 
> Want me to set one up?
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Would a walkthrough help?
> 
> Hi [FirstName],
> 
> If you would rather explore a home remotely before arranging an in-person visit, I can help check what walkthrough options are available for a property you choose.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 3. What to know before touring

Channel: email. Timing: Day 6, 10:00 AM; resolved fixture instant: 2026-10-27T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: What to know before you tour
> 
> Hi [FirstName],
> 
> A short guide covering timing, financing questions buyers often wait too long to ask, and how to walk a home with clarity.
> 
> When you're ready, I'll only show you the right ones.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: A few questions before your next tour
> 
> Hi [FirstName],
> 
> Before touring, it helps to be clear about your must-haves, financing questions, and what you want to learn from the visit. Is there anything you would like to talk through first?
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 4. 10-min call ask

Channel: callback. Timing: Day 8, 9:00 AM; resolved fixture instant: 2026-10-29T13:00:00.000Z. Variables: none.

Original:

> Soft ask: 10-minute call so you only show the right homes. Create task if no reply after this step.

Proposed **review-only** callback copy:

> Review the contact’s actual engagement and reply history. Offer a short conversation if appropriate; do not infer that a specific listing was viewed.

#### 5. Route back to cold if silent

Channel: sms. Timing: Day 14, 10:00 AM; resolved fixture instant: 2026-11-04T15:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName] - I'll ease up for now and keep you on quiet market updates. Ping me anytime. - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], I’ll ease up on follow-ups for now. If you would like to revisit your search, you are welcome to reach out anytime. —[Agent] Reply STOP to opt out.


## Post-Tour Follow-up & Offer Push

ID: `tpl-post-tour-follow-up`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Buyers who completed at least one tour. Channels: sms, email, callback. Reviewed **6 steps**. Classification: **FAIL**.

### Personalization issues

No additional issue identified by the defined synthetic checks.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

- Step 2: Claims specific supporting information or activity that is not supplied by this template.
- Step 3: Claims specific supporting information or activity that is not supplied by this template.
- Step 4: Claims specific supporting information or activity that is not supplied by this template.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. Same-day thank-you + reaction

Channel: sms. Timing: Day 1, Same day; resolved fixture instant: 2026-10-22T12:00:00.000Z. Variables: [FirstName], [PropertyAddress], [Agent].

Original:

> Hey [FirstName]! Hope the showing at [PropertyAddress] was helpful. Quick question - overall impression: loved it, liked it, or not the one? Your gut reaction helps me zero in on exactly what you're looking for. - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], what stood out to you about [PropertyAddress]? Your thoughts on what worked—and what didn’t—will help me plan the next step with you. —[Agent] Reply STOP to opt out.

#### 2. Comp analysis - priced right?

Channel: email. Timing: Day 2, 10:00 AM; resolved fixture instant: 2026-10-23T14:00:00.000Z. Variables: {{property_address}}, {{first_name}}, {{area}}, {{agent_name}}, [AgentPhone], [Brokerage].

Original:

> Subject: Quick thoughts after your tour of {{property_address}}
> 
> Hi {{first_name}},
> 
> Hope you enjoyed the tour yesterday at {{property_address}}! I pulled recent nearby sales so you can see how it stacks up in {{area}}.
> 
> I'll text you the shortlist of comps next - or reply COMPS and I'll send them right away.
> 
> Thinking about an offer? I can have a draft ready in about an hour.
> 
> {{agent_name}}
> [AgentPhone] | [Brokerage]

Proposed **review-only** email copy:

> Subject: Your thoughts after the tour
> 
> Hi [FirstName],
> 
> What questions would you like to explore about {{property_address}}? We can review available information together before you decide whether it is worth pursuing.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 3. Offer strategy nudge

Channel: sms. Timing: Day 3, 2:00 PM; resolved fixture instant: 2026-10-24T18:00:00.000Z. Variables: [FirstName], [PropertyAddress], [Agent].

Original:

> [FirstName], I ran the comps on [PropertyAddress] and sent you an analysis - did you get a chance to look? If you're thinking about it, I can have a draft offer ready in about an hour. Just say the word. - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], would it help to talk through [PropertyAddress] or compare it with other options? There is no need to rush a decision. —[Agent] Reply STOP to opt out.

#### 4. Activity / competing-offer alert

Channel: email. Timing: Day 4, 4:00 PM; resolved fixture instant: 2026-10-25T20:00:00.000Z. Variables: {{property_address}}, {{first_name}}, {{agent_name}}, [AgentPhone], [Brokerage].

Original:

> Subject: Update on {{property_address}} - wanted you to know
> 
> Hi {{first_name}},
> 
> I wanted to give you a heads up - {{property_address}} has been getting activity since we toured.
> 
> I don't say this to pressure you - only you know if this is the right home. But I want to make sure you have the full picture before the window closes.
> 
> If you want to move forward or just talk through whether it makes sense, I'm available.
> 
> {{agent_name}}
> [AgentPhone] | [Brokerage]

Proposed **review-only** email copy:

> Subject: Considering your next step
> 
> Hi [FirstName],
> 
> If you are still thinking about {{property_address}}, I can help you check current information and discuss your options. Any availability or offer activity should be verified before you act.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 5. Objection isolator

Channel: sms. Timing: Day 5, 11:00 AM; resolved fixture instant: 2026-10-26T15:00:00.000Z. Variables: [FirstName], [PropertyAddress], [Agent].

Original:

> Hi [FirstName], checking in on [PropertyAddress] - was it mainly price, location, or the house itself that didn't click? Knowing that helps me find a better match fast. - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], was there anything about [PropertyAddress] that didn’t fit your priorities? Your feedback will help me refine the next search. —[Agent] Reply STOP to opt out.

#### 6. Agent personal follow-up

Channel: callback. Timing: Day 7, 9:00 AM; resolved fixture instant: 2026-10-28T13:00:00.000Z. Variables: none.

Original:

> If no reply: call personally. If silent after this, route to Cold Lead / Long-term Nurture. If they said 'not the one', add to Listing Alert Drip.

Proposed **review-only** callback copy:

> Review tour feedback and current listing information. Agree on the next step personally; do not move the contact to another campaign without authorization.


## Luxury Seller – Automated Follow Up

ID: `tpl-luxury-seller-follow-up`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Luxury Home Sellers. Channels: voicemail, avatar_video, email, sms, retargeting, callback. Reviewed **6 steps**. Classification: **FAIL**.

### Personalization issues

- Step 1: Replace the instructional placeholder with actual message copy.
- Step 2: No delivery integration is configured for this channel.
- Step 3: Replace the instructional placeholder with actual message copy.
- Step 4: Replace the instructional placeholder with actual message copy.
- Step 5: No delivery integration is configured for this channel.
- Step 5: Review this step’s send time and timezone.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

- Step 2: No implemented delivery integration; originally represented as sent or converted to email.
- Step 4: Missing explicit STOP instruction; PAUSE is not an automated SMS opt-out keyword in the current receiver.
- Step 5: No implemented delivery integration; originally represented as sent or converted to email.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. Ringless Voicemail

Channel: voicemail. Timing: Day 1, 9:00 AM; resolved fixture instant: 2026-10-22T13:00:00.000Z. Variables: none.

Original:

> Warm introduction with your recorded voice message.

Proposed **review-only** voicemail copy:

> Hi [FirstName], this is [Agent] with [Brokerage]. I’m available if you would like to discuss your selling plans, questions about the process, or what a thoughtful next step might look like. Please reach out whenever it suits you.

#### 2. Personalized Video Message

Channel: avatar_video. Timing: Day 2, 11:00 AM; resolved fixture instant: 2026-10-23T15:00:00.000Z. Variables: none.

Original:

> AI avatar delivers a tailored message on your behalf.

Proposed **review-only** callback copy:

> Prepare a personal video invitation only if an approved video workflow exists. Otherwise create an internal follow-up task; do not mark a video as delivered.

#### 3. Email

Channel: email. Timing: Day 3, 1:00 PM; resolved fixture instant: 2026-10-24T17:00:00.000Z. Variables: none.

Original:

> Beautifully designed, personalized email follow-up.

Proposed **review-only** email copy:

> Subject: A thoughtful next step for your selling plans
> 
> Hi [FirstName],
> 
> What would help you feel clearer about a possible sale: understanding the process, discussing timing, or arranging a property review? I’m happy to start with your questions.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 4. Text Message

Channel: sms. Timing: Day 5, 10:00 AM; resolved fixture instant: 2026-10-26T14:00:00.000Z. Variables: none.

Original:

> Concise, high-touch SMS check-in.

Proposed **review-only** sms copy:

> Hi [FirstName], would a short conversation about your selling plans be useful? I’m happy to work around your priorities and timing. —[Agent] Reply STOP to opt out.

#### 5. Social Media Retargeting

Channel: retargeting. Timing: Day 7, All Day; resolved fixture instant: requires review. Variables: none.

Original:

> Stay visible with co-branded social touchpoints.

Proposed **review-only** callback copy:

> Review authorized marketing options with the agent. No social retargeting integration is configured; do not send this instruction to a contact.

#### 6. Callback Alert

Channel: callback. Timing: Day 10, 9:00 AM; resolved fixture instant: 2026-10-31T13:00:00.000Z. Variables: none.

Original:

> Reminder to personally follow up when engagement peaks.

Proposed **review-only** callback copy:

> Arrange a personal follow-up if the contact wants to discuss selling. Check current consent, reply history, and preferences first.


## Seller Home Valuation Follow-up

ID: `tpl-seller-valuation`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Sellers who requested a CMA / AVM / valuation. Channels: email, sms. Reviewed **5 steps**. Classification: **FAIL**.

### Personalization issues

No additional issue identified by the defined synthetic checks.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

- Step 1: Claims specific supporting information or activity that is not supplied by this template.
- Step 2: Claims specific supporting information or activity that is not supplied by this template.
- Step 4: Claims specific supporting information or activity that is not supplied by this template.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. CMA delivery

Channel: email. Timing: Day 1, 10:00 AM; resolved fixture instant: 2026-10-22T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: Your home value snapshot
> 
> Hi [FirstName],
> 
> Attached/linked is a clear look at where your home sits in today's market - comps, timing, and what buyers are responding to.
> 
> Happy to walk through it on a short call.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Would a home-value review be useful?
> 
> Hi [FirstName],
> 
> If you are weighing a sale, I can help arrange a review of your property and relevant local information. Would you prefer to start with a short conversation about your goals?
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 2. Day 1 SMS

Channel: sms. Timing: Day 1, 2:00 PM; resolved fixture instant: 2026-10-22T18:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName] - sent your home value snapshot. Want a 10-min walkthrough this week? - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], would you like to discuss a home-value review or ask a question about selling? Let me know what would be helpful. —[Agent] Reply STOP to opt out.

#### 3. Market stats

Channel: email. Timing: Day 3, 10:00 AM; resolved fixture instant: 2026-10-24T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: What sellers in your area are seeing
> 
> Hi [FirstName],
> 
> A few local stats that matter if you're weighing timing - days on market, list-to-sale ratio, and buyer demand.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Questions about the local selling market?
> 
> Hi [FirstName],
> 
> Which questions are most important to you—pricing, preparation, or timing? I can help gather relevant, current information rather than make assumptions about your property.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 4. Video / personal note

Channel: email. Timing: Day 7, 10:00 AM; resolved fixture instant: 2026-10-28T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: A quick personal note on your home
> 
> Hi [FirstName],
> 
> I recorded a short note on positioning and next steps if you decide to list. No pressure - just clarity.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Your plans come first
> 
> Hi [FirstName],
> 
> There is no need to decide on a sale before you have the information you need. I’m available to discuss your options or explain the next steps whenever you are ready.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 5. Breakup

Channel: sms. Timing: Day 14, 10:00 AM; resolved fixture instant: 2026-11-04T15:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName] - I'll pause follow-ups for now. If listing timing opens up later, I'm here. - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], I’ll pause these follow-ups for now. If you want to revisit your selling plans later, you’re welcome to reach out. —[Agent] Reply STOP to opt out.


## Open House Follow-up

ID: `tpl-open-house`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Open house sign-ins. Channels: sms, email, callback. Reviewed **4 steps**. Classification: **FAIL**.

### Personalization issues

No additional issue identified by the defined synthetic checks.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

- Step 2: Claims specific supporting information or activity that is not supplied by this template.
- Step 3: Claims specific supporting information or activity that is not supplied by this template.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. Same-day SMS

Channel: sms. Timing: Day 1, Same day; resolved fixture instant: 2026-10-22T12:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName] - thanks for coming by the open house today. What did you think? I can send details or similar options. - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], thank you for visiting. What did you think of the home? I’m happy to help with a question or discuss a possible next step. —[Agent] Reply STOP to opt out.

#### 2. Photo / details email

Channel: email. Timing: Day 2, 10:00 AM; resolved fixture instant: 2026-10-23T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: Details from today's open house
> 
> Hi [FirstName],
> 
> Glad you stopped by. Here's a recap of the home plus answers to questions visitors usually ask.
> 
> Want a private second look?
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Following up after your visit
> 
> Hi [FirstName],
> 
> Was there anything you wanted to revisit or ask about the home? I can help check the details that matter most to you.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 3. Similar homes

Channel: email. Timing: Day 3, 10:00 AM; resolved fixture instant: 2026-10-24T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: Similar homes you may like
> 
> Hi [FirstName],
> 
> If that open house wasn't quite right, here are 2–3 similar options worth a look.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Refining your next property search
> 
> Hi [FirstName],
> 
> If the home wasn’t quite right, what would you like to change in the next search? Share a few priorities, and I can help you consider suitable options.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 4. Call task

Channel: callback. Timing: Day 7, 9:00 AM; resolved fixture instant: 2026-10-28T13:00:00.000Z. Variables: none.

Original:

> Personal follow-up call. Ask feedback and next-tour interest.

Proposed **review-only** callback copy:

> Review verified visit feedback and ask whether a personal follow-up would be useful. Confirm the correct property and event date before referring to them.


## Past Client Anniversary & Referral

ID: `tpl-past-client`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Past clients (closed transactions). Channels: email, sms. Reviewed **4 steps**. Classification: **NEEDS REVIEW**.

### Personalization issues

No additional issue identified by the defined synthetic checks.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

No additional issue identified by the defined synthetic checks.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. 7-day thank you

Channel: email. Timing: Day 7, 10:00 AM; resolved fixture instant: 2026-10-28T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: Still cheering for your new chapter
> 
> Hi [FirstName],
> 
> Just a note to say congratulations again - and I'm here if anything comes up as you settle in.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Here for your next chapter
> 
> Hi [FirstName],
> 
> It was a pleasure working with you. If a homeownership question comes up, I’m happy to point you toward useful information or discuss a future real estate need.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 2. 90-day check-in

Channel: sms. Timing: Day 90, 11:00 AM; resolved fixture instant: 2027-01-19T16:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName] - how is the new place treating you? Anything I can help with? - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], how are things going with your home? If a real estate question comes up, I’m happy to help. —[Agent] Reply STOP to opt out.

#### 3. Equity / market update

Channel: email. Timing: Day 180, 10:00 AM; resolved fixture instant: 2027-04-19T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: A quick look at your home's market
> 
> Hi [FirstName],
> 
> Thought you'd appreciate a simple update on how homes like yours are performing nearby.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: A resource for your homeownership questions
> 
> Hi [FirstName],
> 
> Would an updated look at local real estate information be useful? Let me know what you would like to understand, and I can help you find relevant, current details.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 4. Anniversary + soft referral

Channel: email. Timing: Day 365, 10:00 AM; resolved fixture instant: 2027-10-21T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: Happy home-iversary
> 
> Hi [FirstName],
> 
> One year in - congratulations. If a friend or family member ever needs a trusted local agent, I'm honored to help.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Keeping in touch
> 
> Hi [FirstName],
> 
> I hope homeownership is treating you well. I’m here if you have a real estate question, and I would be happy to help someone you choose to introduce. Thank you for staying in touch.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.


## Pre-approval Push

ID: `tpl-pre-approval`. Owner/status: MyARI shared product definition; subscriber owner not verified; bundled draft template; database instance status not verified. Audience: Buyers with intent, not yet pre-approved. Channels: email, sms. Reviewed **3 steps**. Classification: **NEEDS REVIEW**.

### Personalization issues

No additional issue identified by the defined synthetic checks.
### Sequence issues

- Original time labels and immediate offsets were ignored; repair is prepared, not deployed.
- Actual subscriber enrollment/closing/tour dates are unavailable.
- Reply-stop and resume repairs need staging verification before approval.
### Delivery issues

- Real provider credentials, sender domain, callbacks and recordings have not been exercised.
- RVM audio is an approved asset and is not synthesized from personalized script text.
### Compliance concerns

- Generic consent schema does not prove channel-specific legal eligibility.
- No complete email unsubscribe/inbound reply lifecycle exists.
- Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.
- Provider webhook atomic replay migration remains unapplied.
### Content quality issues

No additional issue identified by the defined synthetic checks.
### Fixes prepared

- Shared safe renderer and final authorization boundary prepared.
- All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.
- Read-only preview, stable scheduling and revision protection prepared.
### Remaining blockers

- Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.
- Draft copy, migrations, sender/integration checks and legal consent review require approval.

### Every step and proposed copy

#### 1. Lender intro

Channel: email. Timing: Day 1, 10:00 AM; resolved fixture instant: 2026-10-22T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: A simple next step before touring
> 
> Hi [FirstName],
> 
> When you're ready to tour seriously, a pre-approval makes everything smoother. I can intro a trusted local lender who treats clients well - no pressure.
> 
> Want the intro?
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: A useful step before a serious home search
> 
> Hi [FirstName],
> 
> Understanding financing options can help you plan a comfortable budget. If you would like, I can help you identify questions to discuss with a licensed lender. Would that be useful?
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

#### 2. Why it matters

Channel: sms. Timing: Day 3, 11:00 AM; resolved fixture instant: 2026-10-24T15:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Hi [FirstName] - pre-approval often means stronger offers and clearer budgets. Want me to connect you? - [Agent] Reply STOP to opt out.

Proposed **review-only** sms copy:

> Hi [FirstName], would a conversation with a licensed lender help clarify your budget and financing options? I can help with an introduction if you would like one. —[Agent] Reply STOP to opt out.

#### 3. Lost-offer story

Channel: email. Timing: Day 5, 10:00 AM; resolved fixture instant: 2026-10-26T14:00:00.000Z. Variables: [FirstName], [Agent].

Original:

> Subject: Why strong buyers still lose homes
> 
> Hi [FirstName],
> 
> Sometimes the difference isn't the offer price - it's how ready the buyer looks on paper. Happy to help you get that piece in place before the right home shows up.
> 
> [Agent]

Proposed **review-only** email copy:

> Subject: Feeling prepared for the next step
> 
> Hi [FirstName],
> 
> When you are ready, having financing questions answered can make evaluating homes less stressful. There is no obligation to move forward before you feel informed.
> 
> [Agent]
> [AgentPhone] | [Brokerage]
> 
> If you prefer not to receive updates, please contact me directly.

