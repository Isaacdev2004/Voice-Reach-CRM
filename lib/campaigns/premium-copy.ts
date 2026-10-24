/** Review-only wording; never imported by delivery or template installation. */
export const COPY: Record<string, string[]> = {
  "cold-lead-reengage": [
    "A fresh look at your home search|Would an updated look at homes in {{area}} be useful? Tell me what has changed in your timing or priorities, and I can help you decide on a practical next step.",
    "Hi [FirstName], [Agent] here. Are you still considering a move in [City], or has your timing changed? Either answer helps me tailor the follow-up.",
    "Hi [FirstName], this is [Agent] with [Brokerage]. I’m available if you would like to revisit your real estate plans or talk through the market in [City]. No pressure—please reach out whenever the timing suits you.",
    "Would you like me to keep in touch?|I want these updates to be useful. Would you prefer an occasional market note, a pause, or a different kind of help? You can contact me directly with your preference.",
    "Review this contact’s response and preferences. If appropriate and authorized, propose a nurture plan for agent approval; do not change lifecycle stages or enroll another sequence automatically.",
  ],
  "speed-to-lead": [
    "Hi [FirstName], this is [Agent] with [Brokerage]. Thanks for getting in touch. What would be most helpful right now—property details, search guidance, or a quick conversation?",
    "How can I help with your search?|Thank you for reaching out. What are your priorities for {{area}}? Share your preferred timing and must-haves, and I can help you identify a useful next step.",
    "Review the inquiry, confirm the actual property and source, and arrange a personal follow-up. Do not claim a call or listing review has already happened.",
    "A quick follow-up on your search|I wanted to make sure you have a way to reach me. Would you like help comparing properties, refining your criteria, or planning a tour? I’m happy to work at your pace.",
    "Hi {{first_name}}, {{agent_name}} here. Has anything changed in your search priorities for {{area}}? I’m available if you would like help with the next step.",
    "Hi [FirstName], I’ll give you some space for now. If you would like help with your real estate plans later, you’re welcome to reach out. —[Agent]",
  ],
  "listing-alert-drip": [
    "Keeping your property search focused|Are your location, budget, and must-haves still the same? Let me know what matters most, and I can help you review suitable properties without filling your inbox with irrelevant options.",
    "Hi [FirstName], would a fresh look at properties that fit your priorities be useful? Let me know whether you prefer details by message or a quick conversation. —[Agent]",
    "Hi [FirstName], are there any homes you would like me to check on? Send an address or tell me what has changed in your search. —[Agent]",
    "Has your home search changed?|Would you like to adjust your preferred neighborhoods, budget, or timing? A brief reply will help me keep future recommendations relevant.",
    "Hi [FirstName], would you like occasional search updates, or would you prefer a pause? You can let me know what works best. —[Agent]",
  ],
  "long-term-buyer-nurture": [
    "Planning a move at your pace|A little preparation can make a future move easier. What would be useful to explore first: neighborhoods, a realistic timeline, or the steps involved in buying?",
    "Which neighborhoods are on your list?|If you are comparing areas, tell me what matters most in your day-to-day life. I can help you find reliable information and questions to consider without assuming one neighborhood is right for you.",
    "Hi [FirstName], is a move still part of your longer-term plans? I can keep in touch occasionally or give you space—whichever is more useful. —[Agent]",
    "A simple way to prepare for a future move|Even with a longer timeline, listing your must-haves and understanding financing options can bring clarity. Would a short preparation checklist help?",
    "Keeping your options in view|Have your priorities or timing changed? I can help you review options when you are ready, without rushing a decision.",
    "Hi [FirstName], how is your planning going? Let me know if you would like help, a later follow-up, or a pause. —[Agent]",
    "Here when you are ready|I’m happy to be a resource whenever your next move comes into focus. You can reach out with a market question, a property you are considering, or a change in plans.",
  ],
  "engaged-no-tour": [
    "Hi [FirstName], would a brief conversation or a tour help you narrow your search? Let me know what would feel useful at this stage. —[Agent]",
    "Would a walkthrough help?|If you would rather explore a home remotely before arranging an in-person visit, I can help check what walkthrough options are available for a property you choose.",
    "A few questions before your next tour|Before touring, it helps to be clear about your must-haves, financing questions, and what you want to learn from the visit. Is there anything you would like to talk through first?",
    "Review the contact’s actual engagement and reply history. Offer a short conversation if appropriate; do not infer that a specific listing was viewed.",
    "Hi [FirstName], I’ll ease up on follow-ups for now. If you would like to revisit your search, you are welcome to reach out anytime. —[Agent]",
  ],
  "post-tour-follow-up": [
    "Hi [FirstName], what stood out to you about [PropertyAddress]? Your thoughts on what worked—and what didn’t—will help me plan the next step with you. —[Agent]",
    "Your thoughts after the tour|What questions would you like to explore about {{property_address}}? We can review available information together before you decide whether it is worth pursuing.",
    "Hi [FirstName], would it help to talk through [PropertyAddress] or compare it with other options? There is no need to rush a decision. —[Agent]",
    "Considering your next step|If you are still thinking about {{property_address}}, I can help you check current information and discuss your options. Any availability or offer activity should be verified before you act.",
    "Hi [FirstName], was there anything about [PropertyAddress] that didn’t fit your priorities? Your feedback will help me refine the next search. —[Agent]",
    "Review tour feedback and current listing information. Agree on the next step personally; do not move the contact to another campaign without authorization.",
  ],
  "luxury-seller-follow-up": [
    "Hi [FirstName], this is [Agent] with [Brokerage]. I’m available if you would like to discuss your selling plans, questions about the process, or what a thoughtful next step might look like. Please reach out whenever it suits you.",
    "Prepare a personal video invitation only if an approved video workflow exists. Otherwise create an internal follow-up task; do not mark a video as delivered.",
    "A thoughtful next step for your selling plans|What would help you feel clearer about a possible sale: understanding the process, discussing timing, or arranging a property review? I’m happy to start with your questions.",
    "Hi [FirstName], would a short conversation about your selling plans be useful? I’m happy to work around your priorities and timing. —[Agent]",
    "Review authorized marketing options with the agent. No social retargeting integration is configured; do not send this instruction to a contact.",
    "Arrange a personal follow-up if the contact wants to discuss selling. Check current consent, reply history, and preferences first.",
  ],
  "seller-valuation-follow-up": [
    "Would a home-value review be useful?|If you are weighing a sale, I can help arrange a review of your property and relevant local information. Would you prefer to start with a short conversation about your goals?",
    "Hi [FirstName], would you like to discuss a home-value review or ask a question about selling? Let me know what would be helpful. —[Agent]",
    "Questions about the local selling market?|Which questions are most important to you—pricing, preparation, or timing? I can help gather relevant, current information rather than make assumptions about your property.",
    "Your plans come first|There is no need to decide on a sale before you have the information you need. I’m available to discuss your options or explain the next steps whenever you are ready.",
    "Hi [FirstName], I’ll pause these follow-ups for now. If you want to revisit your selling plans later, you’re welcome to reach out. —[Agent]",
  ],
  "open-house-follow-up": [
    "Hi [FirstName], thank you for visiting. What did you think of the home? I’m happy to help with a question or discuss a possible next step. —[Agent]",
    "Following up after your visit|Was there anything you wanted to revisit or ask about the home? I can help check the details that matter most to you.",
    "Refining your next property search|If the home wasn’t quite right, what would you like to change in the next search? Share a few priorities, and I can help you consider suitable options.",
    "Review verified visit feedback and ask whether a personal follow-up would be useful. Confirm the correct property and event date before referring to them.",
  ],
  "past-client-anniversary": [
    "Here for your next chapter|It was a pleasure working with you. If a homeownership question comes up, I’m happy to point you toward useful information or discuss a future real estate need.",
    "Hi [FirstName], how are things going with your home? If a real estate question comes up, I’m happy to help. —[Agent]",
    "A resource for your homeownership questions|Would an updated look at local real estate information be useful? Let me know what you would like to understand, and I can help you find relevant, current details.",
    "Keeping in touch|I hope homeownership is treating you well. I’m here if you have a real estate question, and I would be happy to help someone you choose to introduce. Thank you for staying in touch.",
  ],
  "pre-approval-push": [
    "A useful step before a serious home search|Understanding financing options can help you plan a comfortable budget. If you would like, I can help you identify questions to discuss with a licensed lender. Would that be useful?",
    "Hi [FirstName], would a conversation with a licensed lender help clarify your budget and financing options? I can help with an introduction if you would like one. —[Agent]",
    "Feeling prepared for the next step|When you are ready, having financing questions answered can make evaluating homes less stressful. There is no obligation to move forward before you feel informed.",
  ],
};
export function proposedDescription(type: string, copy: string) {
  if (type === "email") {
    const [subject, ...body] = copy.split("|");
    return `Subject: ${subject}\n\nHi [FirstName],\n\n${body.join("|")}\n\n[Agent]\n[AgentPhone] | [Brokerage]\n\nIf you prefer not to receive updates, please contact me directly.`;
  }
  return type === "sms" ? `${copy} Reply STOP to opt out.` : copy;
}
