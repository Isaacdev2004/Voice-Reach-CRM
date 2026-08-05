import type { CampaignDefinition, CampaignStep } from "./types";
import { DEFAULT_CAMPAIGN } from "./mock-data";

export type ProductCampaignTemplate = CampaignDefinition & {
  templateKey: string;
  featured?: boolean;
  category?: "buyer" | "seller" | "sphere" | "general";
  /** When creating from template, optionally create an automation rule */
  automation?: {
    name: string;
    description: string;
    triggerType: "lead_inactive" | "contact_added" | "engagement_score" | "manual";
    triggerConfig?: Record<string, unknown>;
  };
};

function draftSteps(
  steps: Omit<CampaignStep, "id" | "status">[],
): CampaignStep[] {
  return steps.map((s, i) => ({
    ...s,
    id: `step-${i + 1}`,
    status: "draft" as const,
  }));
}

/** Shared starter sequences — available to every workspace. */
export const PRODUCT_CAMPAIGN_TEMPLATES: ProductCampaignTemplate[] = [
  {
    templateKey: "cold-lead-reengage",
    featured: true,
    category: "buyer",
    id: "tpl-cold-lead-reengage",
    name: "Cold Lead Re-engagement",
    description:
      "21-day multi-channel re-open for quiet leads: value email → SMS → ringless voicemail → opt-down → monthly nurture.",
    audience: "Cold / inactive buyers (14+ days quiet)",
    durationDays: 21,
    goals: [
      "Re-engage leads with no recent activity",
      "Get a reply without sounding spammy",
      "Hand warm responses back to the agent",
    ],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    automation: {
      name: "Start cold lead re-engagement",
      description: "When a lead is inactive 14+ days, enroll in Cold Lead Re-engagement.",
      triggerType: "lead_inactive",
      triggerConfig: { daysInactive: 14 },
    },
    steps: draftSteps([
      {
        order: 1,
        type: "email",
        title: "Market update (value-first)",
        description:
          "Subject: A quick look at [Market] this week\n\nHi [FirstName],\n\nNo ask — just a short market snapshot for your area. Inventory and pricing have shifted a bit, and I thought you'd want the numbers without another \"just checking in.\"\n\nIf useful, I can send a saved-search digest tailored to what you were looking at before.\n\nWarmly,\n[Agent]",
        dayLabel: "Day 1",
        timeLabel: "10:00 AM",
      },
      {
        order: 2,
        type: "sms",
        title: "Search-status SMS",
        description:
          "Hi [FirstName] — still exploring a move this season, or has timing changed? One-word reply is perfect. — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 3",
        timeLabel: "11:00 AM",
      },
      {
        order: 3,
        type: "voicemail",
        title: "Warm availability voicemail",
        description:
          "Hi [FirstName], it's [Agent]. We connected a while back about your home plans. No pressure — just checking in to see if timing is better this season. Happy to help whenever you're ready.",
        dayLabel: "Day 7",
        timeLabel: "10:00 AM",
      },
      {
        order: 4,
        type: "email",
        title: "Opt-down / should I pause?",
        description:
          "Subject: Should I pause outreach, [FirstName]?\n\nHi [FirstName],\n\nI don't want to fill your inbox if the timing isn't right. Would you rather I:\n1) Pause for now, or\n2) Keep sending occasional market updates only?\n\nJust reply 1 or 2 — either is perfectly fine.\n\n[Agent]",
        dayLabel: "Day 14",
        timeLabel: "10:00 AM",
      },
      {
        order: 5,
        type: "callback",
        title: "Move to monthly nurture",
        description:
          "If still quiet: set lead_status = nurture and add to Long-term Buyer Nurture. If they replied or listened, call personally within 24 hours.",
        dayLabel: "Day 21",
        timeLabel: "9:00 AM",
      },
    ]),
  },
  {
    templateKey: "speed-to-lead",
    featured: true,
    category: "buyer",
    id: "tpl-speed-to-lead",
    name: "Speed-to-Lead Instant Response",
    description:
      "Highest-ROI inbound sequence: SMS under a minute, email in 2 minutes, then Day 1 / 3 / 5 follow-ups if no reply.",
    audience: "New inbound leads (Zillow, Realtor.com, form, FB ads)",
    durationDays: 5,
    goals: [
      "Respond before competitors",
      "Qualify intent fast",
      "Book a call or showing",
    ],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    automation: {
      name: "Speed-to-lead on new contact",
      description: "When a new contact is added, enroll in Speed-to-Lead.",
      triggerType: "contact_added",
      triggerConfig: {},
    },
    steps: draftSteps([
      {
        order: 1,
        type: "sms",
        title: "Instant SMS (<60s)",
        description:
          "Hi [FirstName]! This is [Agent] — I just saw your inquiry. Great timing. I have a few similar listings to share right now. Can I send them over, or is there a better time to connect? Reply STOP to opt out.",
        dayLabel: "Day 1",
        timeLabel: "Immediate",
      },
      {
        order: 2,
        type: "email",
        title: "Instant email (<2 min)",
        description:
          "Subject: I found homes matching your search — [FirstName]\n\nHi [FirstName],\n\nThanks for reaching out! I'm [Agent], your local real estate specialist.\n\nI want to make sure you don't miss out. Here's what I can do in the next 15 minutes:\n→ Send a shortlist of 3–5 similar homes (including some not yet widely listed)\n→ Answer questions about neighborhood, schools, or pricing\n→ Set up instant alerts for new matches\n\nIs now a good time for a quick 10-minute call?\n\nTalk soon,\n[Agent]",
        dayLabel: "Day 1",
        timeLabel: "Immediate +2m",
      },
      {
        order: 3,
        type: "callback",
        title: "Agent call task",
        description:
          "Call [FirstName] within 15 minutes. Log outcome. If answered, cancel remaining sequence.",
        dayLabel: "Day 1",
        timeLabel: "Immediate +5m",
      },
      {
        order: 4,
        type: "email",
        title: "Day 1 follow-up (no reply)",
        description:
          "Subject: Still searching? 3 homes worth seeing\n\nHi [FirstName],\n\nI wanted to follow up in case my first message got buried.\n\nI pulled three options that match what you were looking at and wanted to share them before they're gone. No pressure — just good options in front of you.\n\nIf any catch your eye, I can get you in for a showing as early as tomorrow.\n\n[Agent]",
        dayLabel: "Day 2",
        timeLabel: "10:00 AM",
      },
      {
        order: 5,
        type: "sms",
        title: "Day 3 nurture SMS",
        description:
          "Hey [FirstName], [Agent] again. Still looking? A strong new option just hit your criteria. Want a showing? — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 3",
        timeLabel: "11:00 AM",
      },
      {
        order: 6,
        type: "sms",
        title: "Day 5 breakup text",
        description:
          "Hi [FirstName], I don't want to keep bugging you — just wanted to make sure you have my number if you ever need a local expert. No pressure at all. Wishing you the best! — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 5",
        timeLabel: "10:00 AM",
      },
    ]),
  },
  {
    templateKey: "listing-alert-drip",
    featured: true,
    category: "buyer",
    id: "tpl-listing-alert-drip",
    name: "Listing Alert Drip",
    description:
      "Ongoing buyer nurture with weekly value, high-match SMS style alerts, monthly check-in, and a 60-day re-engage nudge. Works with or without live IDX.",
    audience: "Active buyers with a search criteria / saved search",
    durationDays: 60,
    goals: [
      "Stay top of mind during a long search",
      "Drive showings from new matches",
      "Avoid spammy check-ins",
    ],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: draftSteps([
      {
        order: 1,
        type: "email",
        title: "Weekly matching homes digest",
        description:
          "Subject: New matches for your search this week\n\nHi [FirstName],\n\nHere are the strongest new listings that fit what we've been watching together. I've highlighted what stands out on each.\n\nReply with any address you want a deeper look at — or \"tour\" and I'll set times.\n\n[Agent]",
        dayLabel: "Day 1",
        timeLabel: "9:00 AM",
      },
      {
        order: 2,
        type: "sms",
        title: "High-match alert SMS",
        description:
          "Hi [FirstName] — strong match just hit your criteria. Want details or a showing this week? — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 3",
        timeLabel: "10:00 AM",
      },
      {
        order: 3,
        type: "sms",
        title: "Price-drop style nudge",
        description:
          "[FirstName], a home on your watchlist had a meaningful update. Want me to send the new numbers? — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 14",
        timeLabel: "11:00 AM",
      },
      {
        order: 4,
        type: "email",
        title: "Monthly check-in",
        description:
          "Subject: Quick pulse on your home search\n\nHi [FirstName],\n\nIt's been about a month — has anything shifted on budget, neighborhood, or timing? I can tighten alerts so you only see what still fits.\n\nOne reply is enough.\n\n[Agent]",
        dayLabel: "Day 30",
        timeLabel: "10:00 AM",
      },
      {
        order: 5,
        type: "sms",
        title: "60-day re-engage",
        description:
          "Hi [FirstName] — still want listing alerts, or should I pause for now? Reply YES to keep them or PAUSE to stop. — [Agent]",
        dayLabel: "Day 60",
        timeLabel: "10:00 AM",
      },
    ]),
  },
  {
    templateKey: "long-term-buyer-nurture",
    featured: true,
    category: "buyer",
    id: "tpl-long-term-buyer-nurture",
    name: "Long-term Buyer Nurture",
    description:
      "6–18 month value cadence for cold/long-timeline buyers: market education, neighborhood stories, financing tips, and soft re-engage gates.",
    audience: "Cold / long-term buyers (6+ month timeline)",
    durationDays: 180,
    goals: [
      "Stay useful for months without pressure",
      "Build trust before they're ready",
      "Catch them when timing flips",
    ],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: draftSteps([
      {
        order: 1,
        type: "email",
        title: "Market education",
        description:
          "Subject: What buyers should watch this month\n\nHi [FirstName],\n\nA quick, no-pressure briefing on inventory, pricing, and what smart buyers are doing right now in our market.\n\nIf you want this tailored to a specific neighborhood, reply with the area.\n\n[Agent]",
        dayLabel: "Day 1",
        timeLabel: "10:00 AM",
      },
      {
        order: 2,
        type: "email",
        title: "Neighborhood spotlight",
        description:
          "Subject: Neighborhood spotlight worth knowing\n\nHi [FirstName],\n\nHere's a short look at a neighborhood clients often ask about — lifestyle, schools, and what recent sales suggest.\n\nHappy to compare it to anywhere else on your list.\n\n[Agent]",
        dayLabel: "Day 14",
        timeLabel: "10:00 AM",
      },
      {
        order: 3,
        type: "sms",
        title: "Quarterly soft SMS",
        description:
          "Hi [FirstName] — still planning a move in the next year? I can keep quiet updates coming, or pause anytime. — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 30",
        timeLabel: "11:00 AM",
      },
      {
        order: 4,
        type: "email",
        title: "Financing / timing tip",
        description:
          "Subject: One timing tip most buyers miss\n\nHi [FirstName],\n\nWhether you're 3 months or 18 months out, a little prep now (pre-approval, must-haves vs nice-to-haves) makes the search much calmer later.\n\nWant a simple checklist?\n\n[Agent]",
        dayLabel: "Day 45",
        timeLabel: "10:00 AM",
      },
      {
        order: 5,
        type: "email",
        title: "Inventory / opportunity note",
        description:
          "Subject: A quiet opportunity in the market\n\nHi [FirstName],\n\nOccasionally a listing fits long-term buyers even if they're not \"actively touring\" yet. Here's what I'm seeing and why it might matter later.\n\nNo rush — just keeping you informed.\n\n[Agent]",
        dayLabel: "Day 90",
        timeLabel: "10:00 AM",
      },
      {
        order: 6,
        type: "sms",
        title: "90-day re-engage gate",
        description:
          "Hi [FirstName], checking if home-search timing has changed. Reply READY, LATER, or PAUSE. — [Agent]",
        dayLabel: "Day 90",
        timeLabel: "2:00 PM",
      },
      {
        order: 7,
        type: "email",
        title: "6-month relationship note",
        description:
          "Subject: Still here when you're ready\n\nHi [FirstName],\n\nJust a note that I'm still happy to be your local resource — market questions, neighborhood intel, or a quiet first tour when timing is right.\n\nWhenever you're ready,\n[Agent]",
        dayLabel: "Day 180",
        timeLabel: "10:00 AM",
      },
    ]),
  },
  {
    templateKey: "engaged-no-tour",
    featured: true,
    category: "buyer",
    id: "tpl-engaged-no-tour",
    name: "Engaged — No Tour Yet",
    description:
      "For buyers who open/click but haven't toured: reference what they engaged with, offer a low-friction next step, then a soft call ask.",
    audience: "Engaged buyers (score ≥5) with zero tours",
    durationDays: 14,
    goals: [
      "Convert soft engagement into a tour or call",
      "Address objections without pressure",
      "Fall back to cold nurture if silent",
    ],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    automation: {
      name: "Engaged buyer — no tour",
      description: "When engagement score is high and no tour yet, start Engaged — No Tour Yet.",
      triggerType: "engagement_score",
      triggerConfig: { minScore: 5, requireNoTours: true },
    },
    steps: draftSteps([
      {
        order: 1,
        type: "sms",
        title: "Personal listing reference",
        description:
          "Hi [FirstName] — saw you were looking at a listing that fits. Want details or a short showing window this week? — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 1",
        timeLabel: "Immediate",
      },
      {
        order: 2,
        type: "email",
        title: "Video / virtual tour offer",
        description:
          "Subject: Prefer a FaceTime walkthrough first?\n\nHi [FirstName],\n\nIf an in-person tour feels like a big step, I can do a quick video walkthrough so you only visit the homes that truly fit.\n\nWant me to set one up?\n\n[Agent]",
        dayLabel: "Day 3",
        timeLabel: "10:00 AM",
      },
      {
        order: 3,
        type: "email",
        title: "What to know before touring",
        description:
          "Subject: What to know before you tour\n\nHi [FirstName],\n\nA short guide covering timing, financing questions buyers often wait too long to ask, and how to walk a home with clarity.\n\nWhen you're ready, I'll only show you the right ones.\n\n[Agent]",
        dayLabel: "Day 6",
        timeLabel: "10:00 AM",
      },
      {
        order: 4,
        type: "callback",
        title: "10-min call ask",
        description:
          "Soft ask: 10-minute call so you only show the right homes. Create task if no reply after this step.",
        dayLabel: "Day 8",
        timeLabel: "9:00 AM",
      },
      {
        order: 5,
        type: "sms",
        title: "Route back to cold if silent",
        description:
          "Hi [FirstName] — I'll ease up for now and keep you on quiet market updates. Ping me anytime. — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 14",
        timeLabel: "10:00 AM",
      },
    ]),
  },
  {
    templateKey: "post-tour-follow-up",
    featured: true,
    category: "buyer",
    id: "tpl-post-tour-follow-up",
    name: "Post-Tour Follow-up & Offer Push",
    description:
      "72-hour high-intent sequence after a showing: thank-you, comps, offer strategy, urgency — then agent task.",
    audience: "Buyers who completed at least one tour",
    durationDays: 7,
    goals: [
      "Capture feedback while memory is fresh",
      "Move toward offer or next tour",
      "Surface objections fast",
    ],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: draftSteps([
      {
        order: 1,
        type: "sms",
        title: "Same-day thank-you",
        description:
          "Hi [FirstName] — thank you for touring today. What stood out most (or didn't)? One reply helps me narrow the next options. — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 1",
        timeLabel: "Same day",
      },
      {
        order: 2,
        type: "email",
        title: "Comp analysis",
        description:
          "Subject: How today's tour compares\n\nHi [FirstName],\n\nHere's a quick comparison of the home we saw versus 2–3 nearby comps — price, condition, and what recent sales suggest.\n\nIf you want to write an offer or see a similar option, I can move quickly.\n\n[Agent]",
        dayLabel: "Day 2",
        timeLabel: "10:00 AM",
      },
      {
        order: 3,
        type: "sms",
        title: "Offer strategy nudge",
        description:
          "[FirstName] — if you're leaning toward an offer, I can outline a clean strategy (price, contingencies, timing) in 10 minutes. Want that? — [Agent]",
        dayLabel: "Day 3",
        timeLabel: "11:00 AM",
      },
      {
        order: 4,
        type: "email",
        title: "Objection isolator / next step",
        description:
          "Subject: Was it price, location, or the home itself?\n\nHi [FirstName],\n\nTotally fine if today wasn't the one. Knowing whether it was price, location, or the property helps me only bring you better fits.\n\nReply with whichever fits — or tell me what you'd change.\n\n[Agent]",
        dayLabel: "Day 5",
        timeLabel: "10:00 AM",
      },
      {
        order: 5,
        type: "callback",
        title: "Agent personal follow-up",
        description:
          "If no reply: call personally. If silent after this, route to Cold Lead / Long-term Nurture.",
        dayLabel: "Day 7",
        timeLabel: "9:00 AM",
      },
    ]),
  },
  {
    templateKey: "luxury-seller-follow-up",
    category: "seller",
    id: "tpl-luxury-seller-follow-up",
    name: DEFAULT_CAMPAIGN.name,
    description: DEFAULT_CAMPAIGN.description,
    audience: DEFAULT_CAMPAIGN.audience,
    durationDays: DEFAULT_CAMPAIGN.durationDays,
    goals: DEFAULT_CAMPAIGN.goals,
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: DEFAULT_CAMPAIGN.steps.map((s, i) => ({
      ...s,
      id: `ls-${i + 1}`,
      status: "draft" as const,
    })),
  },
  {
    templateKey: "seller-valuation-follow-up",
    category: "seller",
    id: "tpl-seller-valuation",
    name: "Seller Home Valuation Follow-up",
    description:
      "14-day CMA / valuation follow-up: email + SMS + video + breakup for sellers who requested a home value.",
    audience: "Sellers who requested a CMA / AVM / valuation",
    durationDays: 14,
    goals: ["Convert valuation requests into listing appointments", "Stay consultative"],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: draftSteps([
      {
        order: 1,
        type: "email",
        title: "CMA delivery",
        description:
          "Subject: Your home value snapshot\n\nHi [FirstName],\n\nAttached/linked is a clear look at where your home sits in today's market — comps, timing, and what buyers are responding to.\n\nHappy to walk through it on a short call.\n\n[Agent]",
        dayLabel: "Day 1",
        timeLabel: "10:00 AM",
      },
      {
        order: 2,
        type: "sms",
        title: "Day 1 SMS",
        description:
          "Hi [FirstName] — sent your home value snapshot. Want a 10-min walkthrough this week? — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 1",
        timeLabel: "2:00 PM",
      },
      {
        order: 3,
        type: "email",
        title: "Market stats",
        description:
          "Subject: What sellers in your area are seeing\n\nHi [FirstName],\n\nA few local stats that matter if you're weighing timing — days on market, list-to-sale ratio, and buyer demand.\n\n[Agent]",
        dayLabel: "Day 3",
        timeLabel: "10:00 AM",
      },
      {
        order: 4,
        type: "email",
        title: "Video / personal note",
        description:
          "Subject: A quick personal note on your home\n\nHi [FirstName],\n\nI recorded a short note on positioning and next steps if you decide to list. No pressure — just clarity.\n\n[Agent]",
        dayLabel: "Day 7",
        timeLabel: "10:00 AM",
      },
      {
        order: 5,
        type: "sms",
        title: "Breakup",
        description:
          "Hi [FirstName] — I'll pause follow-ups for now. If listing timing opens up later, I'm here. — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 14",
        timeLabel: "10:00 AM",
      },
    ]),
  },
  {
    templateKey: "open-house-follow-up",
    category: "buyer",
    id: "tpl-open-house",
    name: "Open House Follow-up",
    description:
      "7-day sequence after open-house sign-in: same-day SMS, photo email, similar homes, market note, call task.",
    audience: "Open house sign-ins",
    durationDays: 7,
    goals: ["Convert visitors while memory is fresh", "Offer similar homes"],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: draftSteps([
      {
        order: 1,
        type: "sms",
        title: "Same-day SMS",
        description:
          "Hi [FirstName] — thanks for coming by the open house today. What did you think? I can send details or similar options. — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 1",
        timeLabel: "Same day",
      },
      {
        order: 2,
        type: "email",
        title: "Photo / details email",
        description:
          "Subject: Details from today's open house\n\nHi [FirstName],\n\nGlad you stopped by. Here's a recap of the home plus answers to questions visitors usually ask.\n\nWant a private second look?\n\n[Agent]",
        dayLabel: "Day 2",
        timeLabel: "10:00 AM",
      },
      {
        order: 3,
        type: "email",
        title: "Similar homes",
        description:
          "Subject: Similar homes you may like\n\nHi [FirstName],\n\nIf that open house wasn't quite right, here are 2–3 similar options worth a look.\n\n[Agent]",
        dayLabel: "Day 3",
        timeLabel: "10:00 AM",
      },
      {
        order: 4,
        type: "callback",
        title: "Call task",
        description: "Personal follow-up call. Ask feedback and next-tour interest.",
        dayLabel: "Day 7",
        timeLabel: "9:00 AM",
      },
    ]),
  },
  {
    templateKey: "past-client-anniversary",
    category: "sphere",
    id: "tpl-past-client",
    name: "Past Client Anniversary & Referral",
    description:
      "Relationship cadence after closing: thank-you, 90-day check-in, equity note, anniversary, soft referral ask.",
    audience: "Past clients (closed transactions)",
    durationDays: 365,
    goals: ["Stay top of mind", "Earn referrals", "Catch refinance / move-up moments"],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: draftSteps([
      {
        order: 1,
        type: "email",
        title: "7-day thank you",
        description:
          "Subject: Still cheering for your new chapter\n\nHi [FirstName],\n\nJust a note to say congratulations again — and I'm here if anything comes up as you settle in.\n\n[Agent]",
        dayLabel: "Day 7",
        timeLabel: "10:00 AM",
      },
      {
        order: 2,
        type: "sms",
        title: "90-day check-in",
        description:
          "Hi [FirstName] — how is the new place treating you? Anything I can help with? — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 90",
        timeLabel: "11:00 AM",
      },
      {
        order: 3,
        type: "email",
        title: "Equity / market update",
        description:
          "Subject: A quick look at your home's market\n\nHi [FirstName],\n\nThought you'd appreciate a simple update on how homes like yours are performing nearby.\n\n[Agent]",
        dayLabel: "Day 180",
        timeLabel: "10:00 AM",
      },
      {
        order: 4,
        type: "email",
        title: "Anniversary + soft referral",
        description:
          "Subject: Happy home-iversary\n\nHi [FirstName],\n\nOne year in — congratulations. If a friend or family member ever needs a trusted local agent, I'm honored to help.\n\n[Agent]",
        dayLabel: "Day 365",
        timeLabel: "10:00 AM",
      },
    ]),
  },
  {
    templateKey: "pre-approval-push",
    category: "buyer",
    id: "tpl-pre-approval",
    name: "Pre-approval Push",
    description:
      "Short sequence for interested buyers who aren't pre-approved yet — lender intro, why it matters, lost-offer story.",
    audience: "Buyers with intent, not yet pre-approved",
    durationDays: 7,
    goals: ["Remove financing friction", "Introduce trusted lender", "Prepare for showings"],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: draftSteps([
      {
        order: 1,
        type: "email",
        title: "Lender intro",
        description:
          "Subject: A simple next step before touring\n\nHi [FirstName],\n\nWhen you're ready to tour seriously, a pre-approval makes everything smoother. I can intro a trusted local lender who treats clients well — no pressure.\n\nWant the intro?\n\n[Agent]",
        dayLabel: "Day 1",
        timeLabel: "10:00 AM",
      },
      {
        order: 2,
        type: "sms",
        title: "Why it matters",
        description:
          "Hi [FirstName] — pre-approval often means stronger offers and clearer budgets. Want me to connect you? — [Agent] Reply STOP to opt out.",
        dayLabel: "Day 3",
        timeLabel: "11:00 AM",
      },
      {
        order: 3,
        type: "email",
        title: "Lost-offer story",
        description:
          "Subject: Why strong buyers still lose homes\n\nHi [FirstName],\n\nSometimes the difference isn't the offer price — it's how ready the buyer looks on paper. Happy to help you get that piece in place before the right home shows up.\n\n[Agent]",
        dayLabel: "Day 5",
        timeLabel: "10:00 AM",
      },
    ]),
  },
];

export function getTemplate(templateKey: string): ProductCampaignTemplate | undefined {
  return PRODUCT_CAMPAIGN_TEMPLATES.find((t) => t.templateKey === templateKey);
}

export function instantiateTemplate(templateKey: string): CampaignDefinition | null {
  const tpl = getTemplate(templateKey);
  if (!tpl) return null;
  return {
    ...tpl,
    id: `campaign-${crypto.randomUUID()}`,
    steps: tpl.steps.map((step) => ({
      ...step,
      id: `step-${crypto.randomUUID()}`,
      status: "draft",
    })),
  };
}

export const FEATURED_TEMPLATE_KEYS = PRODUCT_CAMPAIGN_TEMPLATES.filter((t) => t.featured).map(
  (t) => t.templateKey,
);
