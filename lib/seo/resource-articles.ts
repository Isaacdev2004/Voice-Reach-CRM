export type ResourceArticleSlug =
  | "ultimate-real-estate-lead-follow-up-guide"
  | "how-many-times-follow-up-real-estate-lead"
  | "10-lead-follow-up-texts-that-start-conversations"
  | "best-crm-features-for-real-estate-agents"
  | "how-to-follow-up-facebook-real-estate-leads"
  | "how-to-reactivate-old-real-estate-leads"
  | "real-estate-crm-vs-spreadsheet"
  | "why-real-estate-leads-go-cold"
  | "how-quickly-should-realtors-respond-to-leads"
  | "30-day-real-estate-lead-follow-up-plan";

export type ResourceArticleSection = {
  h2?: string;
  h3?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type ResourceArticle = {
  slug: ResourceArticleSlug;
  path: `/resources/${ResourceArticleSlug}`;
  title: string;
  description: string;
  publishedAt: string;
  readTimeMinutes: number;
  category: string;
  sections: ResourceArticleSection[];
  productLinks: Array<{ href: string; anchor: string }>;
};

const PRODUCT_LINKS = {
  crm: { href: "/real-estate-crm", anchor: "real estate CRM for agents" },
  followUp: { href: "/lead-follow-up", anchor: "automated lead follow-up software" },
  reactivation: { href: "/lead-reactivation", anchor: "lead reactivation software" },
  pricing: { href: "/pricing", anchor: "ARI CRM pricing" },
  texts: { href: "/features/text-automation", anchor: "automated text follow-up" },
  pipeline: { href: "/features/pipeline-management", anchor: "sales pipeline management" },
} as const;

export const RESOURCE_ARTICLES: Record<ResourceArticleSlug, ResourceArticle> = {
  "ultimate-real-estate-lead-follow-up-guide": {
    slug: "ultimate-real-estate-lead-follow-up-guide",
    path: "/resources/ultimate-real-estate-lead-follow-up-guide",
    title: "The Ultimate Real Estate Lead Follow-Up Guide",
    description:
      "A complete guide to real estate lead follow-up — response time, touchpoint cadence, channels, scripts, and systems that convert more leads into clients.",
    publishedAt: "2026-10-01",
    readTimeMinutes: 12,
    category: "Lead follow-up",
    productLinks: [PRODUCT_LINKS.crm, PRODUCT_LINKS.followUp, PRODUCT_LINKS.pricing],
    sections: [
      {
        h2: "Why follow-up is the highest-leverage skill in real estate",
        paragraphs: [
          "Agents spend thousands on lead generation — Zillow, Facebook ads, open houses, sphere marketing — yet most deals are lost after the first contact. The problem usually isn't lead volume; it's inconsistent follow-up.",
          "Speed, persistence, and relevance win. This guide covers the systems top producers use to respond fast, nurture patiently, and re-engage leads who went quiet — without spending your entire day texting.",
        ],
      },
      {
        h2: "The 5-minute rule: speed-to-lead",
        paragraphs: [
          "When a buyer or seller inquiry comes in, your odds of connecting drop sharply after the first few minutes. Aim to acknowledge every new lead within five minutes — even if the full conversation happens later.",
          "Automated text follow-up makes this realistic. A personalized first SMS can fire while you're in a showing, buying you time for a proper call when you're free.",
        ],
      },
      {
        h2: "How many times should you follow up?",
        paragraphs: [
          "Most agents stop after one or two attempts. Research on sales follow-up consistently shows that the majority of conversions happen after the fifth touch or later — yet most reps quit far sooner.",
          "A practical cadence for new real estate leads: Day 0 (instant text + call), Day 1 (email), Day 3 (text check-in), Day 7 (voicemail or video text), Day 14 (value-add email), Day 30 (re-engagement). Adjust based on lead temperature and source.",
        ],
        bullets: [
          "Hot portal leads: prioritize phone within 5 minutes",
          "Open-house sign-ins: follow up same day with personal note",
          "Sphere contacts: longer nurture, less urgency",
          "Old leads: reactivation sequence, not the same cadence as new inquiries",
        ],
      },
      {
        h2: "Choose the right channel",
        paragraphs: [
          "Text for speed. Email for depth. Voicemail for persistence without interruption. The best agents combine channels rather than relying on one.",
          "A real estate CRM with automated follow-up lets you orchestrate SMS, email, and ringless voicemail in one sequence — so you're not copy-pasting between apps.",
        ],
      },
      {
        h2: "Build a system, not a habit",
        paragraphs: [
          "Willpower fails when you're busy. Systems scale. Document your cadence, load it into your CRM, and let automation handle the repetitive touches while you focus on conversations.",
          "Track every interaction on the contact record. When a lead replies three weeks later, you need context — not a blank screen.",
        ],
      },
      {
        h2: "Put it into practice with ARI",
        paragraphs: [
          "ARI was built around this exact workflow: capture leads, automate follow-up, surface who needs a personal call, and re-engage dormant contacts. Start with a 14-day free trial and white-glove setup to import your database and launch your first campaign.",
        ],
      },
    ],
  },
  "best-crm-features-for-real-estate-agents": {
    slug: "best-crm-features-for-real-estate-agents",
    path: "/resources/best-crm-features-for-real-estate-agents",
    title: "Best CRM Features for Real Estate Agents",
    description:
      "The CRM features that matter most for Realtors — pipeline management, automated follow-up, lead import, compliance, and integrations that actually get used.",
    publishedAt: "2026-10-01",
    readTimeMinutes: 9,
    category: "CRM",
    productLinks: [PRODUCT_LINKS.crm, PRODUCT_LINKS.pipeline, PRODUCT_LINKS.followUp],
    sections: [
      {
        h2: "Not all CRMs are built for real estate",
        paragraphs: [
          "Generic sales CRMs force agents to adapt their workflow to software designed for B2B SaaS. Real estate CRM features should reflect how agents actually work: portal leads, showings, listings, sphere nurture, and long sales cycles.",
        ],
      },
      {
        h2: "Must-have feature #1: Automated follow-up",
        paragraphs: [
          "The single most valuable CRM feature for agents is automated lead follow-up — SMS, email, and voicemail sequences that run without manual effort. If your CRM only stores contacts, you're still doing the hard work by hand.",
        ],
      },
      {
        h2: "Must-have feature #2: Visual pipeline",
        paragraphs: [
          "You need to see every lead's stage at a glance — new inquiry, appointment set, active buyer, under contract. Pipeline management tied to tasks and automation beats a spreadsheet every time.",
        ],
      },
      {
        h2: "Must-have feature #3: Easy lead import",
        paragraphs: [
          "If onboarding takes weeks, you'll never migrate. CSV import, white-glove migration, and integrations with lead sources (Zillow exports, open-house tools) are essential.",
        ],
        bullets: [
          "Bulk CSV import",
          "Lead source tracking",
          "Tags and segmentation",
          "Full communication history per contact",
        ],
      },
      {
        h2: "Must-have feature #4: Compliance tools",
        paragraphs: [
          "TCPA, DNC scrubbing, consent tracking, and quiet hours aren't optional for agents who text and call at scale. Your CRM should make compliance the default, not an afterthought.",
        ],
      },
      {
        h2: "Must-have feature #5: Lead reactivation",
        paragraphs: [
          "Your old leads are your cheapest source of new business. CRM features for reactivation — segmented campaigns, reply detection, and pipeline re-entry — separate serious platforms from contact databases.",
        ],
      },
      {
        h2: "What to look for in ARI",
        paragraphs: [
          "ARI combines all five: automated multi-channel follow-up, real estate pipeline stages, white-glove import, compliance gates, and built-in lead reactivation. Explore our feature pages or start a free trial to see it in action.",
        ],
      },
    ],
  },
  "how-to-reactivate-old-real-estate-leads": {
    slug: "how-to-reactivate-old-real-estate-leads",
    path: "/resources/how-to-reactivate-old-real-estate-leads",
    title: "How to Reactivate Old Real Estate Leads",
    description:
      "Step-by-step guide to reactivating dormant real estate leads — segmentation, messaging, channels, and timing that restart conversations without spamming.",
    publishedAt: "2026-10-01",
    readTimeMinutes: 10,
    category: "Lead reactivation",
    productLinks: [PRODUCT_LINKS.reactivation, PRODUCT_LINKS.followUp, PRODUCT_LINKS.texts],
    sections: [
      {
        h2: "Your database is an asset you're probably ignoring",
        paragraphs: [
          "Most agents focus entirely on new leads while hundreds of past inquiries sit untouched. Lead reactivation — reaching back out to dormant contacts — often delivers higher conversion rates than cold portal leads because trust was already started.",
        ],
      },
      {
        h2: "Step 1: Segment before you send",
        paragraphs: [
          "Don't blast your entire database with one message. Segment by last contact date, lead source, neighborhood interest, and buyer vs. seller. A lead from 90 days ago needs a different tone than one from 18 months ago.",
        ],
        bullets: [
          "0–6 months dormant: casual check-in",
          "6–12 months: market update angle",
          "12+ months: re-introduction with value",
          "Past clients: referral and anniversary touches",
        ],
      },
      {
        h2: "Step 2: Use a multi-touch sequence",
        paragraphs: [
          "One text isn't reactivation. Plan 3–5 touches over two weeks: SMS check-in, email with market insight, ringless voicemail, then a prompt for you to call responders personally.",
        ],
      },
      {
        h2: "Step 3: Make it personal, not promotional",
        paragraphs: [
          "Lead with relevance — a neighborhood sale, a rate update, a simple 'still thinking about moving?' — not a generic sales pitch. Personalization beats volume.",
        ],
      },
      {
        h2: "Step 4: Route responders immediately",
        paragraphs: [
          "When a dormant lead replies, they should jump to the top of your priority list. Tag them, move them to an active pipeline stage, and call within the hour.",
        ],
      },
      {
        h2: "Step 5: Automate reactivation in your CRM",
        paragraphs: [
          "Manual reactivation doesn't scale. ARI's lead reactivation feature lets you segment dormant contacts, launch multi-channel campaigns, and auto-surface responders — so you focus on conversations, not mail merges.",
        ],
      },
    ],
  },
  "how-many-times-follow-up-real-estate-lead": {
    slug: "how-many-times-follow-up-real-estate-lead",
    path: "/resources/how-many-times-follow-up-real-estate-lead",
    title: "How Many Times Should You Follow Up With a Real Estate Lead?",
    description:
      "Research-backed guidance on follow-up frequency for real estate leads — how many touches, which channels, and when to stop.",
    publishedAt: "2026-10-02",
    readTimeMinutes: 6,
    category: "Lead follow-up",
    productLinks: [PRODUCT_LINKS.followUp, PRODUCT_LINKS.crm],
    sections: [
      {
        h2: "Most agents quit too early",
        paragraphs: [
          "The average agent contacts a lead two or three times before moving on. Yet most conversions require far more persistence — often 6–12 touches across multiple channels over several weeks.",
        ],
      },
      {
        h2: "Recommended touchpoint count by lead type",
        paragraphs: ["Adjust based on temperature, but these ranges work as starting points:"],
        bullets: [
          "Hot portal inquiry: 8–12 touches in first 14 days",
          "Warm referral: 5–8 touches over 30 days",
          "Open-house sign-in: 6–10 touches over 21 days",
          "Cold sphere contact: 4–6 touches over 60 days",
        ],
      },
      {
        h2: "Vary the channel, not just the count",
        paragraphs: [
          "Repeating the same phone call daily annoys people. Mix SMS, email, voicemail, and personal calls. Automation handles the repetition; you handle the replies.",
        ],
      },
      {
        h2: "When to stop",
        paragraphs: [
          "Stop when they opt out, explicitly say no, or after your defined sequence ends with no response. Move them to a long-term nurture or annual reactivation — don't delete them.",
        ],
      },
    ],
  },
  "10-lead-follow-up-texts-that-start-conversations": {
    slug: "10-lead-follow-up-texts-that-start-conversations",
    path: "/resources/10-lead-follow-up-texts-that-start-conversations",
    title: "10 Real Estate Lead Follow-Up Texts That Start Conversations",
    description:
      "Copy-ready SMS templates for real estate lead follow-up — first response, nurture, and re-engagement texts that feel personal and get replies.",
    publishedAt: "2026-10-02",
    readTimeMinutes: 7,
    category: "Scripts",
    productLinks: [PRODUCT_LINKS.texts, PRODUCT_LINKS.followUp],
    sections: [
      {
        h2: "Texts that sound human get replies",
        paragraphs: [
          "Avoid robotic templates. Use the lead's name, reference their inquiry, and ask one clear question. These ten scripts are starting points — customize for your market and voice.",
        ],
      },
      {
        h2: "First response (speed-to-lead)",
        bullets: [
          "Hi [Name], this is [Agent] — saw your inquiry on [source]. Are you still looking in [area]? Happy to send a few matches today.",
          "Hey [Name], got your message about [property/area]. When's a good time for a quick 5-min call?",
          "[Name], thanks for reaching out! Quick question — are you pre-approved or still exploring?",
        ],
      },
      {
        h2: "Nurture check-ins",
        bullets: [
          "Hi [Name], a home just listed on [street] that matches what you described. Want the details?",
          "Hey [Name], still thinking about [buying/selling] in [area]? No pressure — just checking in.",
          "[Name], rates shifted this week. Want a quick update on what that means for your search?",
        ],
      },
      {
        h2: "Re-engagement",
        bullets: [
          "Hi [Name], we spoke a while back about [area]. Still on your radar or should I close the file?",
          "Hey [Name], a neighbor on [street] just sold above asking. Made me think of you — still interested?",
          "[Name], I've helped a few buyers in [area] this month. Want me to keep you on my update list?",
        ],
      },
      {
        h2: "Automate the first touch, personalize the rest",
        paragraphs: [
          "Load these templates into ARI's text automation for instant first responses, then personalize follow-ups when leads reply. See our automated text follow-up feature for details.",
        ],
      },
    ],
  },
  "how-to-follow-up-facebook-real-estate-leads": {
    slug: "how-to-follow-up-facebook-real-estate-leads",
    path: "/resources/how-to-follow-up-facebook-real-estate-leads",
    title: "How to Follow Up With Facebook Real Estate Leads",
    description:
      "Convert Facebook and Meta ad leads with fast follow-up, CRM import, and automated SMS sequences built for social lead gen.",
    publishedAt: "2026-10-03",
    readTimeMinutes: 7,
    category: "Lead sources",
    productLinks: [PRODUCT_LINKS.followUp, PRODUCT_LINKS.crm],
    sections: [
      {
        h2: "Facebook leads go cold faster than almost any source",
        paragraphs: [
          "Meta leads often come from casual scrollers — not people actively searching on Zillow. Speed and persistence matter even more. Respond within minutes and plan a longer nurture sequence.",
        ],
      },
      {
        h2: "Import leads immediately",
        paragraphs: [
          "Export from Meta Lead Ads or Zapier into your CRM the same day. Every hour of delay costs conversions. ARI supports CSV import and onboarding-assisted setup.",
        ],
      },
      {
        h2: "Use a Facebook-specific cadence",
        paragraphs: ["These leads often need more education and trust-building:"],
        bullets: [
          "Instant SMS acknowledging their form submission",
          "Day 1: email with buyer/seller guide",
          "Day 3: text with market insight for their area",
          "Day 7: invitation to short phone consult",
          "Day 14: social proof (recent closings, reviews)",
        ],
      },
      {
        h2: "Track ROI by source",
        paragraphs: [
          "Tag every Facebook lead in your CRM so you know cost-per-conversation and cost-per-close — not just cost-per-lead.",
        ],
      },
    ],
  },
  "real-estate-crm-vs-spreadsheet": {
    slug: "real-estate-crm-vs-spreadsheet",
    path: "/resources/real-estate-crm-vs-spreadsheet",
    title: "Real Estate CRM vs. Spreadsheet: When Should You Switch?",
    description:
      "Signs you've outgrown spreadsheets for lead management — and what a real estate CRM like ARI adds that Excel and Google Sheets can't.",
    publishedAt: "2026-10-03",
    readTimeMinutes: 6,
    category: "CRM",
    productLinks: [PRODUCT_LINKS.crm, PRODUCT_LINKS.pipeline],
    sections: [
      {
        h2: "Spreadsheets work until they don't",
        paragraphs: [
          "A spreadsheet is fine for your first dozen leads. Once you're buying portal leads, running ads, and juggling showings, manual tracking breaks down — leads get missed, follow-up is inconsistent, and history lives in scattered texts.",
        ],
      },
      {
        h2: "Five signs it's time to switch",
        bullets: [
          "You can't remember who you called last week",
          "Leads sit untouched for days after inquiry",
          "Your 'CRM' is a mix of Notes, texts, and Excel tabs",
          "You have no automated first response",
          "Reactivating old leads feels impossible",
        ],
      },
      {
        h2: "What a CRM adds",
        paragraphs: [
          "A real estate CRM centralizes contacts, automates follow-up, tracks pipeline stages, and logs every interaction. The switch pays for itself when one recovered lead covers months of subscription.",
        ],
      },
    ],
  },
  "why-real-estate-leads-go-cold": {
    slug: "why-real-estate-leads-go-cold",
    path: "/resources/why-real-estate-leads-go-cold",
    title: "Why Real Estate Leads Go Cold — and How to Prevent It",
    description:
      "The top reasons real estate leads stop responding — slow follow-up, wrong channel, no nurture system — and how to fix each one.",
    publishedAt: "2026-10-04",
    readTimeMinutes: 7,
    category: "Lead follow-up",
    productLinks: [PRODUCT_LINKS.followUp, PRODUCT_LINKS.reactivation],
    sections: [
      {
        h2: "Leads rarely go cold because they're not interested",
        paragraphs: [
          "Most leads go cold because follow-up stopped too soon, response was too slow, or the agent disappeared after the first conversation. The interest was real — the system wasn't.",
        ],
      },
      {
        h2: "Reason #1: Slow response",
        paragraphs: ["Portal and ad leads expect instant acknowledgment. Delay beyond 30 minutes and they've often contacted another agent."],
      },
      {
        h2: "Reason #2: Not enough touches",
        paragraphs: ["Two calls and a text isn't a follow-up system. Plan 8–12 touches over two weeks for new inquiries."],
      },
      {
        h2: "Reason #3: No long-term nurture",
        paragraphs: ["Leads who aren't ready this month still need monthly touches. Without nurture, they forget you exist."],
      },
      {
        h2: "Reason #4: No reactivation",
        paragraphs: ["Leads from six months ago still have value. Reactivation campaigns restart conversations that manual effort never reaches."],
      },
      {
        h2: "The fix: systematize follow-up",
        paragraphs: [
          "Automate first response, run nurture sequences, set reminders for personal calls, and re-engage dormant contacts quarterly. ARI handles all four in one platform.",
        ],
      },
    ],
  },
  "how-quickly-should-realtors-respond-to-leads": {
    slug: "how-quickly-should-realtors-respond-to-leads",
    path: "/resources/how-quickly-should-realtors-respond-to-leads",
    title: "How Quickly Should Realtors Respond to Online Leads?",
    description:
      "Data-backed response time benchmarks for real estate leads — why minutes matter and how automation makes speed-to-lead achievable.",
    publishedAt: "2026-10-04",
    readTimeMinutes: 5,
    category: "Lead follow-up",
    productLinks: [PRODUCT_LINKS.texts, PRODUCT_LINKS.followUp],
    sections: [
      {
        h2: "Minutes, not hours",
        paragraphs: [
          "Industry studies consistently show contact rates drop dramatically after the first five minutes. For paid portal and ad leads, treat under-five-minute response as the standard — not the exception.",
        ],
      },
      {
        h2: "What 'response' means",
        paragraphs: [
          "A response doesn't have to be a 30-minute consultation. An automated text — 'Hi [Name], got your inquiry, I'll call you in 20 minutes' — counts and buys critical time.",
        ],
      },
      {
        h2: "How to hit 5 minutes every time",
        paragraphs: [
          "You can't manually respond to every lead in showings. Automated SMS on lead import is the only scalable solution. Configure instant first text in ARI and follow up personally when you're available.",
        ],
      },
    ],
  },
  "30-day-real-estate-lead-follow-up-plan": {
    slug: "30-day-real-estate-lead-follow-up-plan",
    path: "/resources/30-day-real-estate-lead-follow-up-plan",
    title: "A 30-Day Real Estate Lead Follow-Up Plan",
    description:
      "A day-by-day follow-up plan for new real estate leads — texts, emails, calls, and voicemails mapped across 30 days.",
    publishedAt: "2026-10-05",
    readTimeMinutes: 8,
    category: "Lead follow-up",
    productLinks: [PRODUCT_LINKS.followUp, PRODUCT_LINKS.crm, PRODUCT_LINKS.pricing],
    sections: [
      {
        h2: "A plan beats improvisation",
        paragraphs: [
          "This 30-day cadence works for new buyer and seller inquiries. Adjust timing for lead temperature, but having a documented plan prevents leads from slipping through.",
        ],
      },
      {
        h2: "Week 1: Speed and connection",
        bullets: [
          "Day 0: Instant SMS + call attempt within 5 minutes",
          "Day 1: Email with intro and next steps",
          "Day 2: Second call attempt + voicemail",
          "Day 3: Text check-in with one question",
          "Day 5: Email with relevant listing or market data",
          "Day 7: Call + text combo",
        ],
      },
      {
        h2: "Week 2: Value and persistence",
        bullets: [
          "Day 10: Market update email",
          "Day 12: Ringless voicemail",
          "Day 14: Text — offer brief phone consult",
        ],
      },
      {
        h2: "Weeks 3–4: Nurture or reclassify",
        bullets: [
          "Day 18: Email with social proof (review, closing story)",
          "Day 21: Text check-in",
          "Day 25: Voicemail",
          "Day 30: Final touch — 'Should I close your file or keep sending updates?'",
        ],
      },
      {
        h2: "Automate the plan in ARI",
        paragraphs: [
          "Load this cadence as an automated sequence in ARI. You handle replies; the system handles timing. Start your 14-day free trial with white-glove setup to launch your first 30-day campaign.",
        ],
      },
    ],
  },
};

export const RESOURCE_ARTICLE_SLUGS = Object.keys(RESOURCE_ARTICLES) as ResourceArticleSlug[];

/** Cornerstone articles published in Week 3. */
export const CORNERSTONE_ARTICLE_SLUGS: ResourceArticleSlug[] = [
  "ultimate-real-estate-lead-follow-up-guide",
  "best-crm-features-for-real-estate-agents",
  "how-to-reactivate-old-real-estate-leads",
];
