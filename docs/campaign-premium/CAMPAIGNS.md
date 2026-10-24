# Campaign-by-campaign review

Scope: all 11 bundled templates, the default campaign fixture, and two new draft sequences. Production database campaigns, recordings, enrollments, archived/shared subscriber records and provider metrics remain unverified because the configured hosts are not permitted by the managed environment policy. No subscriber records were changed.

## Cold Lead Re-engagement

- ID: `tpl-cold-lead-reengage`
- Source: lib/crm/campaign-templates.ts
- Audience: Cold / inactive buyers (14+ days quiet)
- Objective: Re-engage leads with no recent activity; Get a reply without sounding spammy; Hand warm responses back to the agent
- Status: Repository template/fixture — not live subscriber status
- Timing: 21 → 21 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: Homebuying Readiness Checklist
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Blocked**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: Market update / saved-search digest (email)

Subject: {{area}} market update for you, {{first_name}}

Hi {{first_name}},

I've been watching the {{area}} market and wanted to share a quick snapshot - no check-in ask, just useful info.

If you're still keeping an eye on homes in {{area}}, reply UPDATE and I'll send this week's pricing pulse plus 2–3 standout listings.

Happy to adjust what I'm watching for you anytime.

{{agent_name}}
[AgentPhone] | [Brokerage]

#### Day 3: Casual search-status SMS (sms)

Hey [FirstName], [Agent] here - still looking in [City], or has your timeline shifted? Either answer is fine. Reply STOP to opt out.

#### Day 7: Low-pressure availability VM (voicemail)

Hi [FirstName], this is [Agent] with [Brokerage]. Just leaving a quick note - I'm around if you want to talk through the [City] market or tweak your search. No pressure at all. You have my number whenever timing feels right. Take care.

#### Day 14: Opt-down / should I stop? (email)

Subject: Should I keep sending these, [FirstName]?

Hi [FirstName],

I've reached out a few times and don't want to fill your inbox if the timing isn't right.

Should I keep sending market updates and listing ideas for [City], or would you rather I stop for now?

Just reply:
· YES - keep me on the list
· PAUSE - hold off for a bit
· STOP - remove me

Either way is completely fine - I only want to be useful.

[Agent]
[AgentPhone] | [Brokerage]

#### Day 21: Move to nurture cadence (callback)

Set lead_status = nurture. Enroll in Long-term Buyer Nurture if still silent. If they replied or listened, call personally within 24 hours.


### Revised sequence

#### Day 1: A fresh look at your home search (email)

Subject: A fresh look at your home search

Hi [FirstName],

Would an updated look at homes in {{area}} be useful? Tell me what has changed in your timing or priorities, and I can help you decide on a practical next step.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

Required resource: readiness-checklist; review and attach the PDF before use.

#### Day 6: Your priorities (sms)

Hi [FirstName], [Agent] here. Are you still considering a move in [City], or has your timing changed? Either answer helps me tailor the follow-up. Reply STOP to opt out.

#### Day 11: An invitation to connect (voicemail)

Hi, this is [Agent] with [Brokerage]. I’m available if you would like to revisit your real estate plans or talk through the market in [City]. No pressure—please reach out whenever the timing suits you.

#### Day 16: Would you like me to keep in touch? (email)

Subject: Would you like me to keep in touch?

Hi [FirstName],

I want these updates to be useful. Would you prefer an occasional market note, a pause, or a different kind of help? You can contact me directly with your preference.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 21: Agent review — no message sent (task)

Review this contact’s response and preferences. If appropriate and authorized, propose a nurture plan for agent approval; do not change lifecycle stages or enroll another sequence automatically.


## Speed-to-Lead Quick Response

- ID: `tpl-speed-to-lead`
- Source: lib/crm/campaign-templates.ts
- Audience: Brand-new buyer leads (form, IDX, portal, lead ads)
- Objective: Respond in under 60 seconds before competitors call; Qualify interest and book a short call or showing; Exit to nurture if silent after Day 5 breakup
- Status: Repository template/fixture — not live subscriber status
- Timing: 5 → 5 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: No resource is attached automatically.
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Unable to Verify**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: First SMS (<60s) (sms)

Hi [FirstName]! This is [Agent] from [Brokerage] - I just saw your inquiry about [PropertyAddress]. Great choice! I have a few similar listings to share right now. Can I send them over, or is there a better time to connect? Reply STOP to opt out.

#### Day 1: First email (<2 min) (email)

Subject: I found homes matching your search - {{first_name}}

Hi {{first_name}},

Thanks for reaching out! I'm {{agent_name}}, your local real estate specialist covering {{area}}.

I pulled up the listing you were looking at - {{property_address}} - and I want to make sure you don't miss out.

Here's what I'd love to do for you in the next 15 minutes:
→ Send you a shortlist of 3–5 similar homes
→ Answer any questions about the neighborhood, schools, or pricing
→ Get you set up with instant alerts so you see new listings the moment they hit

Is now a good time to chat? Even a quick 10-minute call can save you weeks of searching.

Talk soon,

{{agent_name}}
[Brokerage] · [AgentPhone]

#### Day 1: Agent call task (callback)

Call [FirstName] - new lead from [LeadSource] interested in [PropertyAddress]. Confirm timeline, budget, and whether they want a shortlist or showing. Due within 4 hours.

#### Day 2: Day 1 comps follow-up (no reply) (email)

Subject: Still searching? A few homes near {{property_address}} worth seeing

Hi {{first_name}},

I wanted to follow up in case my first message got buried.

I pulled a short list of homes near {{property_address}} that match what you're looking for in {{area}} and wanted to share them before they're gone.

Reply LIST and I'll send the 3 strongest options with beds, baths, and price - no pressure at all.

If any catch your eye, I can get you in for a showing as early as tomorrow.

{{agent_name}}
[AgentPhone] | [Brokerage]

#### Day 3: Day 3 new-listing nudge (sms)

Hey {{first_name}}, {{agent_name}} again. Still looking in {{area}}? A strong match just hit - want details or a showing this week? - {{agent_name}} Reply STOP to opt out.

#### Day 5: Day 5 breakup text (sms)

Hi [FirstName], I don't want to keep bugging you - just wanted to make sure you have my number if you ever need a local expert in [MarketArea]. No pressure at all. Wishing you the best! - [Agent] [AgentPhone] Reply STOP to opt out.


### Revised sequence

#### Day 1: A thoughtful introduction (sms)

Hi [FirstName], this is [Agent] with [Brokerage]. Thanks for getting in touch. What would be most helpful right now—property details, search guidance, or a quick conversation? Reply STOP to opt out.

#### Day 2: How can I help with your search? (email)

Subject: How can I help with your search?

Hi [FirstName],

Thank you for reaching out. What are your priorities for {{area}}? Share your preferred timing and must-haves, and I can help you identify a useful next step.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 3: Agent review — no message sent (task)

Review the inquiry, confirm the actual property and source, and arrange a personal follow-up. Do not claim a call or listing review has already happened.

#### Day 3: A quick follow-up on your search (email)

Subject: A quick follow-up on your search

Hi [FirstName],

I wanted to make sure you have a way to reach me. Would you like help comparing properties, refining your criteria, or planning a tour? I’m happy to work at your pace.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 4: Your preferred timing (sms)

Hi {{first_name}}, {{agent_name}} here. Has anything changed in your search priorities for {{area}}? I’m available if you would like help with the next step. Reply STOP to opt out.

#### Day 5: Staying connected (sms)

Hi [FirstName], I’ll give you some space for now. If you would like help with your real estate plans later, you’re welcome to reach out. —[Agent] Reply STOP to opt out.


## Listing Alert Drip

- ID: `tpl-listing-alert-drip`
- Source: lib/crm/campaign-templates.ts
- Audience: Active buyers with a search criteria / saved search
- Objective: Stay top of mind during a long search; Drive showings from new matches; Avoid spammy check-ins
- Status: Repository template/fixture — not live subscriber status
- Timing: 60 → 60 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: No resource is attached automatically.
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Unable to Verify**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: Weekly matching homes digest (email)

Subject: New matches for your search this week

Hi [FirstName],

Here are the strongest new listings that fit what we've been watching together. I've highlighted what stands out on each.

Reply with any address you want a deeper look at - or "tour" and I'll set times.

[Agent]

#### Day 3: High-match alert SMS (sms)

Hi [FirstName] - strong match just hit your criteria. Want details or a showing this week? - [Agent] Reply STOP to opt out.

#### Day 14: Price-drop style nudge (sms)

[FirstName], a home on your watchlist had a meaningful update. Want me to send the new numbers? - [Agent] Reply STOP to opt out.

#### Day 30: Monthly check-in (email)

Subject: Quick pulse on your home search

Hi [FirstName],

It's been about a month - has anything shifted on budget, neighborhood, or timing? I can tighten alerts so you only see what still fits.

One reply is enough.

[Agent]

#### Day 60: 60-day re-engage (sms)

Hi [FirstName] - still want listing alerts, or should I pause for now? Reply YES to keep them or PAUSE to stop. - [Agent]


### Revised sequence

#### Day 1: Keeping your property search focused (email)

Subject: Keeping your property search focused

Hi [FirstName],

Are your location, budget, and must-haves still the same? Let me know what matters most, and I can help you review suitable properties without filling your inbox with irrelevant options.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 16: Your priorities (sms)

Hi [FirstName], would a fresh look at properties that fit your priorities be useful? Let me know whether you prefer details by message or a quick conversation. —[Agent] Reply STOP to opt out.

#### Day 31: Planning at your pace (sms)

Hi [FirstName], are there any homes you would like me to check on? Send an address or tell me what has changed in your search. —[Agent] Reply STOP to opt out.

#### Day 45: Has your home search changed? (email)

Subject: Has your home search changed?

Hi [FirstName],

Would you like to adjust your preferred neighborhoods, budget, or timing? A brief reply will help me keep future recommendations relevant.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 60: Your preferred timing (sms)

Hi [FirstName], would you like occasional search updates, or would you prefer a pause? You can let me know what works best. —[Agent] Reply STOP to opt out.


## Long-term Buyer Nurture

- ID: `tpl-long-term-buyer-nurture`
- Source: lib/crm/campaign-templates.ts
- Audience: Cold / long-term buyers (6+ month timeline)
- Objective: Stay useful for months without pressure; Build trust before they're ready; Catch them when timing flips
- Status: Repository template/fixture — not live subscriber status
- Timing: 180 → 180 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: Buyer Preparation Guide
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Blocked**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: Market education (email)

Subject: What buyers should watch this month

Hi [FirstName],

A quick, no-pressure briefing on inventory, pricing, and what smart buyers are doing right now in our market.

If you want this tailored to a specific neighborhood, reply with the area.

[Agent]

#### Day 14: Neighborhood spotlight (email)

Subject: Neighborhood spotlight worth knowing

Hi [FirstName],

Here's a short look at a neighborhood clients often ask about - lifestyle, schools, and what recent sales suggest.

Happy to compare it to anywhere else on your list.

[Agent]

#### Day 30: Quarterly soft SMS (sms)

Hi [FirstName] - still planning a move in the next year? I can keep quiet updates coming, or pause anytime. - [Agent] Reply STOP to opt out.

#### Day 45: Financing / timing tip (email)

Subject: One timing tip most buyers miss

Hi [FirstName],

Whether you're 3 months or 18 months out, a little prep now (pre-approval, must-haves vs nice-to-haves) makes the search much calmer later.

Want a simple checklist?

[Agent]

#### Day 90: Inventory / opportunity note (email)

Subject: A quiet opportunity in the market

Hi [FirstName],

Occasionally a listing fits long-term buyers even if they're not "actively touring" yet. Here's what I'm seeing and why it might matter later.

No rush - just keeping you informed.

[Agent]

#### Day 90: 90-day re-engage gate (sms)

Hi [FirstName], checking if home-search timing has changed. Reply READY, LATER, or PAUSE. - [Agent]

#### Day 180: 6-month relationship note (email)

Subject: Still here when you're ready

Hi [FirstName],

Just a note that I'm still happy to be your local resource - market questions, neighborhood intel, or a quiet first tour when timing is right.

Whenever you're ready,
[Agent]


### Revised sequence

#### Day 1: Planning a move at your pace (email)

Subject: Planning a move at your pace

Hi [FirstName],

A little preparation can make a future move easier. What would be useful to explore first: neighborhoods, a realistic timeline, or the steps involved in buying?

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

Required resource: buyer-preparation; review and attach the PDF before use.

#### Day 31: Which neighborhoods are on your list? (email)

Subject: Which neighborhoods are on your list?

Hi [FirstName],

If you are comparing areas, tell me what matters most in your day-to-day life. I can help you find reliable information and questions to consider without assuming one neighborhood is right for you.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 61: Planning at your pace (sms)

Hi [FirstName], is a move still part of your longer-term plans? I can keep in touch occasionally or give you space—whichever is more useful. —[Agent] Reply STOP to opt out.

#### Day 91: A simple way to prepare for a future move (email)

Subject: A simple way to prepare for a future move

Hi [FirstName],

Even with a longer timeline, listing your must-haves and understanding financing options can bring clarity. Would a short preparation checklist help?

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 120: Keeping your options in view (email)

Subject: Keeping your options in view

Hi [FirstName],

Have your priorities or timing changed? I can help you review options when you are ready, without rushing a decision.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 150: Staying connected (sms)

Hi [FirstName], how is your planning going? Let me know if you would like help, a later follow-up, or a pause. —[Agent] Reply STOP to opt out.

#### Day 180: Here when you are ready (email)

Subject: Here when you are ready

Hi [FirstName],

I’m happy to be a resource whenever your next move comes into focus. You can reach out with a market question, a property you are considering, or a change in plans.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]


## Engaged - No Tour Yet

- ID: `tpl-engaged-no-tour`
- Source: lib/crm/campaign-templates.ts
- Audience: Engaged buyers (score ≥5) with zero tours
- Objective: Convert soft engagement into a tour or call; Address objections without pressure; Fall back to cold nurture if silent
- Status: Repository template/fixture — not live subscriber status
- Timing: 14 → 14 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: No resource is attached automatically.
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Unable to Verify**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: Personal listing reference (sms)

Hi [FirstName] - saw you were looking at a listing that fits. Want details or a short showing window this week? - [Agent] Reply STOP to opt out.

#### Day 3: Video / virtual tour offer (email)

Subject: Prefer a FaceTime walkthrough first?

Hi [FirstName],

If an in-person tour feels like a big step, I can do a quick video walkthrough so you only visit the homes that truly fit.

Want me to set one up?

[Agent]

#### Day 6: What to know before touring (email)

Subject: What to know before you tour

Hi [FirstName],

A short guide covering timing, financing questions buyers often wait too long to ask, and how to walk a home with clarity.

When you're ready, I'll only show you the right ones.

[Agent]

#### Day 8: 10-min call ask (callback)

Soft ask: 10-minute call so you only show the right homes. Create task if no reply after this step.

#### Day 14: Route back to cold if silent (sms)

Hi [FirstName] - I'll ease up for now and keep you on quiet market updates. Ping me anytime. - [Agent] Reply STOP to opt out.


### Revised sequence

#### Day 1: A thoughtful introduction (sms)

Hi [FirstName], would a brief conversation or a tour help you narrow your search? Let me know what would feel useful at this stage. —[Agent] Reply STOP to opt out.

#### Day 4: Would a walkthrough help? (email)

Subject: Would a walkthrough help?

Hi [FirstName],

If you would rather explore a home remotely before arranging an in-person visit, I can help check what walkthrough options are available for a property you choose.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 8: A few questions before your next tour (email)

Subject: A few questions before your next tour

Hi [FirstName],

Before touring, it helps to be clear about your must-haves, financing questions, and what you want to learn from the visit. Is there anything you would like to talk through first?

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 11: Agent review — no message sent (task)

Review the contact’s actual engagement and reply history. Offer a short conversation if appropriate; do not infer that a specific listing was viewed.

#### Day 14: Your preferred timing (sms)

Hi [FirstName], I’ll ease up on follow-ups for now. If you would like to revisit your search, you are welcome to reach out anytime. —[Agent] Reply STOP to opt out.


## Post-Tour Follow-up & Offer Push

- ID: `tpl-post-tour-follow-up`
- Source: lib/crm/campaign-templates.ts
- Audience: Buyers who completed at least one tour
- Objective: Capture feedback while memory is fresh; Move toward offer or next tour; Surface objections fast
- Status: Repository template/fixture — not live subscriber status
- Timing: 7 → 7 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: Property Comparison Worksheet
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Blocked**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: Same-day thank-you + reaction (sms)

Hey [FirstName]! Hope the showing at [PropertyAddress] was helpful. Quick question - overall impression: loved it, liked it, or not the one? Your gut reaction helps me zero in on exactly what you're looking for. - [Agent] Reply STOP to opt out.

#### Day 2: Comp analysis - priced right? (email)

Subject: Quick thoughts after your tour of {{property_address}}

Hi {{first_name}},

Hope you enjoyed the tour yesterday at {{property_address}}! I pulled recent nearby sales so you can see how it stacks up in {{area}}.

I'll text you the shortlist of comps next - or reply COMPS and I'll send them right away.

Thinking about an offer? I can have a draft ready in about an hour.

{{agent_name}}
[AgentPhone] | [Brokerage]

#### Day 3: Offer strategy nudge (sms)

[FirstName], I ran the comps on [PropertyAddress] and sent you an analysis - did you get a chance to look? If you're thinking about it, I can have a draft offer ready in about an hour. Just say the word. - [Agent] Reply STOP to opt out.

#### Day 4: Activity / competing-offer alert (email)

Subject: Update on {{property_address}} - wanted you to know

Hi {{first_name}},

I wanted to give you a heads up - {{property_address}} has been getting activity since we toured.

I don't say this to pressure you - only you know if this is the right home. But I want to make sure you have the full picture before the window closes.

If you want to move forward or just talk through whether it makes sense, I'm available.

{{agent_name}}
[AgentPhone] | [Brokerage]

#### Day 5: Objection isolator (sms)

Hi [FirstName], checking in on [PropertyAddress] - was it mainly price, location, or the house itself that didn't click? Knowing that helps me find a better match fast. - [Agent] Reply STOP to opt out.

#### Day 7: Agent personal follow-up (callback)

If no reply: call personally. If silent after this, route to Cold Lead / Long-term Nurture. If they said 'not the one', add to Listing Alert Drip.


### Revised sequence

#### Day 1: A thoughtful introduction (sms)

Hi [FirstName], what stood out to you about [PropertyAddress]? Your thoughts on what worked—and what didn’t—will help me plan the next step with you. —[Agent] Reply STOP to opt out.

#### Day 2: Your thoughts after the tour (email)

Subject: Your thoughts after the tour

Hi [FirstName],

What questions would you like to explore about {{property_address}}? We can review available information together before you decide whether it is worth pursuing.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

Required resource: property-comparison; review and attach the PDF before use.

#### Day 3: Planning at your pace (sms)

Hi [FirstName], would it help to talk through [PropertyAddress] or compare it with other options? There is no need to rush a decision. —[Agent] Reply STOP to opt out.

#### Day 5: Considering your next step (email)

Subject: Considering your next step

Hi [FirstName],

If you are still thinking about {{property_address}}, I can help you check current information and discuss your options. Any availability or offer activity should be verified before you act.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 6: Your preferred timing (sms)

Hi [FirstName], was there anything about [PropertyAddress] that didn’t fit your priorities? Your feedback will help me refine the next search. —[Agent] Reply STOP to opt out.

#### Day 7: Agent review — no message sent (task)

Review tour feedback and current listing information. Agree on the next step personally; do not move the contact to another campaign without authorization.


## Luxury Seller – Automated Follow Up

- ID: `tpl-luxury-seller-follow-up`
- Source: lib/crm/campaign-templates.ts
- Audience: Luxury Home Sellers
- Objective: Increase response rate; Convert leads into luxury listings; Maintain warm, personalized touchpoints
- Status: Repository template/fixture — not live subscriber status
- Timing: 10 → 30 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Unsupported automated channels in original; revised as explicit internal review steps. Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: Home Selling Preparation Checklist
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Blocked**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: Ringless Voicemail (voicemail)

Warm introduction with your recorded voice message.

#### Day 2: Personalized Video Message (avatar_video)

AI avatar delivers a tailored message on your behalf.

#### Day 3: Email (email)

Beautifully designed, personalized email follow-up.

#### Day 5: Text Message (sms)

Concise, high-touch SMS check-in.

#### Day 7: Social Media Retargeting (retargeting)

Stay visible with co-branded social touchpoints.

#### Day 10: Callback Alert (callback)

Reminder to personally follow up when engagement peaks.


### Revised sequence

#### Day 1: An invitation to connect (voicemail)

Hi, this is [Agent] with [Brokerage]. I’m available if you would like to discuss your selling plans, questions about the process, or what a thoughtful next step might look like. Please reach out whenever it suits you.

#### Day 7: Agent review — no message sent (task)

Prepare a personal video invitation only if an approved video workflow exists. Otherwise create an internal follow-up task; do not mark a video as delivered.

#### Day 13: A thoughtful next step for your selling plans (email)

Subject: A thoughtful next step for your selling plans

Hi [FirstName],

What would help you feel clearer about a possible sale: understanding the process, discussing timing, or arranging a property review? I’m happy to start with your questions.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

Required resource: seller-preparation; review and attach the PDF before use.

#### Day 18: A useful next step (sms)

Hi [FirstName], would a short conversation about your selling plans be useful? I’m happy to work around your priorities and timing. —[Agent] Reply STOP to opt out.

#### Day 24: Agent review — no message sent (task)

Review authorized marketing options with the agent. No social retargeting integration is configured; do not send this instruction to a contact.

#### Day 30: Agent review — no message sent (task)

Arrange a personal follow-up if the contact wants to discuss selling. Check current consent, reply history, and preferences first.


## Seller Home Valuation Follow-up

- ID: `tpl-seller-valuation`
- Source: lib/crm/campaign-templates.ts
- Audience: Sellers who requested a CMA / AVM / valuation
- Objective: Convert valuation requests into listing appointments; Stay consultative
- Status: Repository template/fixture — not live subscriber status
- Timing: 14 → 30 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: Home Selling Preparation Checklist
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Blocked**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: CMA delivery (email)

Subject: Your home value snapshot

Hi [FirstName],

Attached/linked is a clear look at where your home sits in today's market - comps, timing, and what buyers are responding to.

Happy to walk through it on a short call.

[Agent]

#### Day 1: Day 1 SMS (sms)

Hi [FirstName] - sent your home value snapshot. Want a 10-min walkthrough this week? - [Agent] Reply STOP to opt out.

#### Day 3: Market stats (email)

Subject: What sellers in your area are seeing

Hi [FirstName],

A few local stats that matter if you're weighing timing - days on market, list-to-sale ratio, and buyer demand.

[Agent]

#### Day 7: Video / personal note (email)

Subject: A quick personal note on your home

Hi [FirstName],

I recorded a short note on positioning and next steps if you decide to list. No pressure - just clarity.

[Agent]

#### Day 14: Breakup (sms)

Hi [FirstName] - I'll pause follow-ups for now. If listing timing opens up later, I'm here. - [Agent] Reply STOP to opt out.


### Revised sequence

#### Day 1: Would a home-value review be useful? (email)

Subject: Would a home-value review be useful?

Hi [FirstName],

If you are weighing a sale, I can help arrange a review of your property and relevant local information. Would you prefer to start with a short conversation about your goals?

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

Required resource: seller-preparation; review and attach the PDF before use.

#### Day 8: Your priorities (sms)

Hi [FirstName], would you like to discuss a home-value review or ask a question about selling? Let me know what would be helpful. —[Agent] Reply STOP to opt out.

#### Day 16: Questions about the local selling market? (email)

Subject: Questions about the local selling market?

Hi [FirstName],

Which questions are most important to you—pricing, preparation, or timing? I can help gather relevant, current information rather than make assumptions about your property.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 23: Your plans come first (email)

Subject: Your plans come first

Hi [FirstName],

There is no need to decide on a sale before you have the information you need. I’m available to discuss your options or explain the next steps whenever you are ready.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 30: Your preferred timing (sms)

Hi [FirstName], I’ll pause these follow-ups for now. If you want to revisit your selling plans later, you’re welcome to reach out. —[Agent] Reply STOP to opt out.


## Open House Follow-up

- ID: `tpl-open-house`
- Source: lib/crm/campaign-templates.ts
- Audience: Open house sign-ins
- Objective: Convert visitors while memory is fresh; Offer similar homes
- Status: Repository template/fixture — not live subscriber status
- Timing: 7 → 7 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: No resource is attached automatically.
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Unable to Verify**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: Same-day SMS (sms)

Hi [FirstName] - thanks for coming by the open house today. What did you think? I can send details or similar options. - [Agent] Reply STOP to opt out.

#### Day 2: Photo / details email (email)

Subject: Details from today's open house

Hi [FirstName],

Glad you stopped by. Here's a recap of the home plus answers to questions visitors usually ask.

Want a private second look?

[Agent]

#### Day 3: Similar homes (email)

Subject: Similar homes you may like

Hi [FirstName],

If that open house wasn't quite right, here are 2–3 similar options worth a look.

[Agent]

#### Day 7: Call task (callback)

Personal follow-up call. Ask feedback and next-tour interest.


### Revised sequence

#### Day 1: A thoughtful introduction (sms)

Hi [FirstName], thank you for visiting. What did you think of the home? I’m happy to help with a question or discuss a possible next step. —[Agent] Reply STOP to opt out.

#### Day 3: Following up after your visit (email)

Subject: Following up after your visit

Hi [FirstName],

Was there anything you wanted to revisit or ask about the home? I can help check the details that matter most to you.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 5: Refining your next property search (email)

Subject: Refining your next property search

Hi [FirstName],

If the home wasn’t quite right, what would you like to change in the next search? Share a few priorities, and I can help you consider suitable options.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 7: Agent review — no message sent (task)

Review verified visit feedback and ask whether a personal follow-up would be useful. Confirm the correct property and event date before referring to them.


## Past Client Anniversary & Referral

- ID: `tpl-past-client`
- Source: lib/crm/campaign-templates.ts
- Audience: Past clients (closed transactions)
- Objective: Stay top of mind; Earn referrals; Catch refinance / move-up moments
- Status: Repository template/fixture — not live subscriber status
- Timing: 365 → 365 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: Seasonal Homeowner Care Guide
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Blocked**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 7: 7-day thank you (email)

Subject: Still cheering for your new chapter

Hi [FirstName],

Just a note to say congratulations again - and I'm here if anything comes up as you settle in.

[Agent]

#### Day 90: 90-day check-in (sms)

Hi [FirstName] - how is the new place treating you? Anything I can help with? - [Agent] Reply STOP to opt out.

#### Day 180: Equity / market update (email)

Subject: A quick look at your home's market

Hi [FirstName],

Thought you'd appreciate a simple update on how homes like yours are performing nearby.

[Agent]

#### Day 365: Anniversary + soft referral (email)

Subject: Happy home-iversary

Hi [FirstName],

One year in - congratulations. If a friend or family member ever needs a trusted local agent, I'm honored to help.

[Agent]


### Revised sequence

#### Day 1: Here for your next chapter (email)

Subject: Here for your next chapter

Hi [FirstName],

It was a pleasure working with you. If a homeownership question comes up, I’m happy to point you toward useful information or discuss a future real estate need.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

Required resource: homeowner-care; review and attach the PDF before use.

#### Day 122: Your priorities (sms)

Hi [FirstName], how are things going with your home? If a real estate question comes up, I’m happy to help. —[Agent] Reply STOP to opt out.

#### Day 244: A resource for your homeownership questions (email)

Subject: A resource for your homeownership questions

Hi [FirstName],

Would an updated look at local real estate information be useful? Let me know what you would like to understand, and I can help you find relevant, current details.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 365: Keeping in touch (email)

Subject: Keeping in touch

Hi [FirstName],

I hope homeownership is treating you well. I’m here if you have a real estate question, and I would be happy to help someone you choose to introduce. Thank you for staying in touch.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]


## Pre-approval Push

- ID: `tpl-pre-approval`
- Source: lib/crm/campaign-templates.ts
- Audience: Buyers with intent, not yet pre-approved
- Objective: Remove financing friction; Introduce trusted lender; Prepare for showings
- Status: Repository template/fixture — not live subscriber status
- Timing: 7 → 7 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: No resource is attached automatically.
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Unable to Verify**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: Lender intro (email)

Subject: A simple next step before touring

Hi [FirstName],

When you're ready to tour seriously, a pre-approval makes everything smoother. I can intro a trusted local lender who treats clients well - no pressure.

Want the intro?

[Agent]

#### Day 3: Why it matters (sms)

Hi [FirstName] - pre-approval often means stronger offers and clearer budgets. Want me to connect you? - [Agent] Reply STOP to opt out.

#### Day 5: Lost-offer story (email)

Subject: Why strong buyers still lose homes

Hi [FirstName],

Sometimes the difference isn't the offer price - it's how ready the buyer looks on paper. Happy to help you get that piece in place before the right home shows up.

[Agent]


### Revised sequence

#### Day 1: A useful step before a serious home search (email)

Subject: A useful step before a serious home search

Hi [FirstName],

Understanding financing options can help you plan a comfortable budget. If you would like, I can help you identify questions to discuss with a licensed lender. Would that be useful?

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

#### Day 4: Your priorities (sms)

Hi [FirstName], would a conversation with a licensed lender help clarify your budget and financing options? I can help with an introduction if you would like one. —[Agent] Reply STOP to opt out.

#### Day 7: Feeling prepared for the next step (email)

Subject: Feeling prepared for the next step

Hi [FirstName],

When you are ready, having financing questions answered can make evaluating homes less stressful. There is no obligation to move forward before you feel informed.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]


## Luxury Seller – Automated Follow Up

- ID: `luxury-seller-follow-up`
- Source: lib/crm/mock-data.ts (shared default view fixture; not a subscriber campaign)
- Audience: Luxury Home Sellers
- Objective: Increase response rate; Convert leads into luxury listings; Maintain warm, personalized touchpoints
- Status: Repository template/fixture — not live subscriber status
- Timing: 10 → 30 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Unsupported automated channels in original; revised as explicit internal review steps. Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: Home Selling Preparation Checklist
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Blocked**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

#### Day 1: Ringless Voicemail (voicemail)

Warm introduction with your recorded voice message.

#### Day 2: Personalized Video Message (avatar_video)

AI avatar delivers a tailored message on your behalf.

#### Day 3: Email (email)

Beautifully designed, personalized email follow-up.

#### Day 5: Text Message (sms)

Concise, high-touch SMS check-in.

#### Day 7: Social Media Retargeting (retargeting)

Stay visible with co-branded social touchpoints.

#### Day 10: Callback Alert (callback)

Reminder to personally follow up when engagement peaks.


### Revised sequence

#### Day 1: An invitation to connect (voicemail)

Hi, this is [Agent] with [Brokerage]. I’m available if you would like to discuss your selling plans, questions about the process, or what a thoughtful next step might look like. Please reach out whenever it suits you.

#### Day 7: Agent review — no message sent (task)

Prepare a personal video invitation only if an approved video workflow exists. Otherwise create an internal follow-up task; do not mark a video as delivered.

#### Day 13: A thoughtful next step for your selling plans (email)

Subject: A thoughtful next step for your selling plans

Hi [FirstName],

What would help you feel clearer about a possible sale: understanding the process, discussing timing, or arranging a property review? I’m happy to start with your questions.

[Agent]
[AgentPhone] | [Brokerage]

If you prefer not to receive updates, please contact me directly.
[BusinessAddress]

Required resource: seller-preparation; review and attach the PDF before use.

#### Day 18: A useful next step (sms)

Hi [FirstName], would a short conversation about your selling plans be useful? I’m happy to work around your priorities and timing. —[Agent] Reply STOP to opt out.

#### Day 24: Agent review — no message sent (task)

Review authorized marketing options with the agent. No social retargeting integration is configured; do not send this instruction to a contact.

#### Day 30: Agent review — no message sent (task)

Arrange a personal follow-up if the contact wants to discuss selling. Check current consent, reply history, and preferences first.


## Commercial Property Planning — Premium Draft

- ID: `premium-commercial-28`
- Source: New review-only draft
- Audience: Commercial property decision-makers with documented consent
- Objective: Clarify property requirements; Arrange an optional consultation
- Status: Review-only new draft
- Timing: New → 28 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: Commercial Property Planning Guide
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Blocked**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

New campaign; no original records to overwrite.

### Revised sequence

#### Day 1: An introduction on your terms (email)

Subject: A thoughtful starting point for your property plans

Hi [FirstName],

I'm [Agent] with [Brokerage]. If you are considering an acquisition, lease or change in business space, I can help you organize the questions that matter. Which property objective is most important to you?

[Agent]
[AgentPhone]
Reply if you prefer no further updates.
[BusinessAddress]

Required resource: commercial-planning; review and attach the PDF before use.

#### Day 7: Understanding your requirements (sms)

Hi [FirstName], this is [Agent]. Are your commercial property plans centered on acquiring, leasing or changing business space? Reply STOP to opt out.

#### Day 14: A professional introduction (voicemail)

Hi, this is [Agent] with [Brokerage]. If it would be useful to talk through your commercial property requirements, please call me at [AgentPhone]. I would be glad to start with your priorities. Thank you.

#### Day 21: Space for a useful conversation (email)

Subject: A clear brief for your next property decision

Hi [FirstName],

A useful property brief can bring location, intended use, timing and space requirements into focus. Would a short conversation help you organize those priorities?

[Agent]
Reply if you prefer no further updates.
[BusinessAddress]

#### Day 28: Your timing comes first (sms)

Hi [FirstName], this is [Agent]. Would you prefer a later follow-up about your commercial plans, or should I pause for now? Reply STOP to opt out.


## Relationships Worth Sharing

- ID: `premium-relationships-worth-sharing`
- Source: New review-only draft
- Audience: Past clients who have authorized the relevant communication channel
- Objective: Maintain genuine relationships; Invite voluntary honest feedback; Offer thoughtful guidance to referrals
- Status: Review-only new draft
- Timing: New → 90 days; scheduling remains relative to enrollment, not a fabricated closing anniversary.
- Problems: Original copy requires relevance, missing-field, identity and consent review; sample metrics do not establish performance.
- Copy changes: distinct, low-pressure purpose; one next-step invitation; STOP instructions on SMS; actual sender/business-address tokens for email; no unsupported listing, value or return claims.
- Voice: Live recordings unavailable; Sapphire availability unverified. No audio generated, replaced or approved.
- Attachments: Buyer & Seller Planning Guide
- Functionality: all revised external messages render using synthetic values; missing review link remains blocking. Internal task/callback execution depends on existing Calendar integration.
- Compliance: verify sender registration, email authentication, applicable consent, opt-out handling, disclosures and message frequency. No legal certification.
- Analytics: Unavailable; template/sample statistics are not provider-backed results
- Enrollment/usage: Unknown; production subscriber data was not accessed
- Readiness: **Blocked**. Critical blockers are never averaged into a score.
- Remaining blockers: live owner-scoped inventory; authorized Sapphire voice and recordings; subscriber-approved branding; provider and compliance verification.
- Approval: Agent review of every message and audience; Channel consent and deliverability verification; Matching approved voice recording; Approved branded attachment where expected; Explicit activation/enrollment approval; no live revisions applied

### Original sequence

New campaign; no original records to overwrite.

### Revised sequence

#### Day 1: A personal thank you (sms)

Hi [FirstName], it's [AgentName]. Thank you again for trusting me with your real estate journey. I hope everything is going wonderfully! Reply STOP to opt out.

#### Day 14: Your experience means so much (email)

Subject: A small favor, if you have a moment

Hi [FirstName],

It was a pleasure helping you with your real estate journey. If you feel comfortable sharing your honest experience in a Zillow review, I would be grateful for your feedback.

You can leave a review here:
[ZillowReviewLink]

Thank you again for your trust.

[AgentName]
[AgentPhone]
Reply if you prefer no further updates.
[BusinessAddress]

Conditional review request; latest review status and subscriber preference are required.

#### Day 30: Staying connected (voicemail)

Hi, this is [AgentName]. I wanted to say hello and thank you again for trusting me with your real estate journey. If you or someone you know could use real estate guidance, I'm happy to help. Please call me at [AgentPhone] whenever it is useful. Take care.

#### Day 45: A gentle review invitation (sms)

Hi [FirstName], if you feel comfortable sharing your experience, I would appreciate an honest Zillow review: [ZillowReviewLink] Thank you again. [AgentName]. Reply STOP to opt out.

Conditional review reminder; latest review status and subscriber preference are required.

#### Day 60: A resource worth sharing (email)

Subject: A helpful guide for your next chapter

Hi [FirstName],

The Buyer & Seller Planning Guide is attached for anyone considering a next move. If someone in your circle would like thoughtful real estate guidance, I would be grateful for an introduction.

And of course, I'm here for your questions too.

[AgentName]
[AgentPhone]
Reply if you prefer no further updates.
[BusinessAddress]

Required resource: buyer-seller-planning; review and attach the PDF before use.

#### Day 90: Relationships worth sharing (sms)

Hi [FirstName], it's [AgentName]. If someone you know is considering buying or selling, I'd be happy to be a resource. I'm a call or text away whenever it is helpful. Reply STOP to opt out.
