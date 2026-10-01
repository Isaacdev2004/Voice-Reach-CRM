export type SeoPageSlug =
  | "real-estate-crm"
  | "lead-follow-up"
  | "realtor-lead-follow-up"
  | "lead-reactivation";

export type SeoLandingPageConfig = {
  slug: SeoPageSlug;
  path: `/${SeoPageSlug}`;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  sections: Array<{
    h2: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
  highlights: Array<{ title: string; body: string }>;
  faq: Array<{ q: string; a: string }>;
  relatedPages: Array<{ href: string; label: string }>;
};

const SHARED_RELATED = [
  { href: "/real-estate-crm", label: "Real estate CRM" },
  { href: "/lead-follow-up", label: "Automated lead follow-up" },
  { href: "/realtor-lead-follow-up", label: "Realtor lead follow-up" },
  { href: "/lead-reactivation", label: "Lead reactivation" },
  { href: "/pricing", label: "Pricing & plans" },
] as const;

export const SEO_LANDING_PAGES: Record<SeoPageSlug, SeoLandingPageConfig> = {
  "real-estate-crm": {
    slug: "real-estate-crm",
    path: "/real-estate-crm",
    title: "Real Estate CRM for Agents & Realtors",
    description:
      "ARI is a real estate CRM built for agents who need organized pipelines, automated follow-up, and clear next steps — not another spreadsheet. Start your 14-day free trial.",
    h1: "A Real Estate CRM Built to Keep Leads Moving",
    eyebrow: "Real estate CRM for agents",
    intro:
      "Most real estate CRMs store contacts. ARI helps you act on them — with a simple pipeline, automated outreach, and reminders so no lead goes cold after the first conversation.",
    sections: [
      {
        h2: "Your leads deserve more than a database",
        paragraphs: [
          "Agents pay for Zillow leads, open-house sign-ins, sphere referrals, and past clients — then lose deals because follow-up is inconsistent. Spreadsheets and generic CRMs make it easy to log a name but hard to know who to call today.",
          "ARI is a real estate CRM designed around the work agents actually do: capture leads, follow up fast, nurture over time, and re-engage when someone goes quiet. Everything lives in one place — contacts, pipeline stages, campaign history, and tasks — so you spend less time chasing data and more time in conversations that close.",
        ],
      },
      {
        h2: "Pipeline visibility without the complexity",
        paragraphs: [
          "See every lead's stage at a glance. Move contacts through your sales pipeline as they respond, schedule showings, or go under contract. ARI surfaces who needs attention next so you're never guessing which lead to prioritize.",
        ],
        bullets: [
          "Centralized contact records with notes, tags, and full communication history",
          "Pipeline stages tailored to real estate workflows",
          "Tasks and reminders tied to each lead — not buried in a separate app",
          "Import from CSV, Zillow exports, and onboarding-assisted migrations",
        ],
      },
      {
        h2: "Follow-up built into the CRM — not bolted on",
        paragraphs: [
          "The best real estate CRM doesn't stop at storage. ARI connects your pipeline to automated SMS, email, and ringless voicemail campaigns so new leads get a response in minutes, not days. You control the message, timing, and consent rules — ARI handles the repetition.",
          "Whether you're nurturing buyer inquiries, following up on listing appointments, or staying in touch with your sphere, automated lead follow-up runs in the background while you show homes and write offers.",
        ],
      },
      {
        h2: "Built for agents who want to grow",
        paragraphs: [
          "Solo agents and small teams use ARI to replace sticky notes, scattered inboxes, and manual texting. White-glove onboarding helps you import your database and launch your first campaign within 24–48 hours.",
          "If you're comparing CRM for agents options, look for one that combines organization with action. ARI is purpose-built for real estate lead follow-up — not adapted from a generic sales tool.",
        ],
      },
    ],
    highlights: [
      {
        title: "One CRM for every lead source",
        body: "Zillow, Realtor.com, referrals, open houses — import and organize them in a single pipeline.",
      },
      {
        title: "Automated outreach",
        body: "SMS, email, and ringless voicemail sequences keep leads warm without manual copy-paste.",
      },
      {
        title: "Compliance-aware campaigns",
        body: "DNC scrubbing, consent tracking, and quiet hours help you outreach responsibly.",
      },
      {
        title: "White-glove setup",
        body: "Founding members get lead import and first-campaign configuration included.",
      },
    ],
    faq: [
      {
        q: "How is ARI different from other real estate CRMs?",
        a: "Most CRMs focus on contact storage. ARI is built around automated lead follow-up — pipeline, campaigns, and reminders work together so leads keep moving toward a conversation.",
      },
      {
        q: "Can I import my existing contacts?",
        a: "Yes. CSV import is built in, and Founding 100 onboarding includes white-glove import — we load your database and configure your first follow-up campaign.",
      },
      {
        q: "Does ARI work for teams and brokerages?",
        a: "ARI supports solo agents today with Team pricing for brokerages. Contact us for a live walkthrough and volume pricing.",
      },
      {
        q: "How long does setup take?",
        a: "Most agents are live within 24–48 hours. We handle lead import, pipeline setup, and your first automated sequence during onboarding.",
      },
      {
        q: "Is there a free trial?",
        a: "Yes — 14 days free for Founding 100 members. Add a card to start; you won't be charged until the trial ends.",
      },
    ],
    relatedPages: SHARED_RELATED.filter((p) => p.href !== "/real-estate-crm"),
  },
  "lead-follow-up": {
    slug: "lead-follow-up",
    path: "/lead-follow-up",
    title: "Automated Lead Follow-Up Software",
    description:
      "Turn lead follow-up into an automatic system with ARI — SMS, email, and ringless voicemail sequences for real estate agents. Never let a lead go cold again.",
    h1: "Turn Lead Follow-Up Into an Automatic System",
    eyebrow: "Automated lead follow-up",
    intro:
      "Speed wins in real estate. ARI sends personalized follow-up the moment a lead comes in — and keeps nurturing them until they're ready to talk, tour, or make an offer.",
    sections: [
      {
        h2: "Why manual follow-up fails",
        paragraphs: [
          "You're in a showing when a hot Zillow lead comes in. By the time you text back three hours later, they've already booked with another agent. Manual follow-up doesn't scale — and even the best agents drop balls when pipelines get full.",
          "Automated lead follow-up software solves the timing problem. ARI responds instantly with a message you control, then continues a thoughtful sequence over days and weeks. Leads feel personal attention; you get your time back.",
        ],
      },
      {
        h2: "Multi-channel follow-up that feels human",
        paragraphs: [
          "Different leads respond to different channels. ARI lets you combine SMS, email, and ringless voicemail in one campaign — so you're not relying on a single touchpoint that gets ignored.",
        ],
        bullets: [
          "Instant SMS response when a new lead hits your pipeline",
          "Email sequences for longer-form nurture and market updates",
          "Ringless voicemail for agents who want voice without interrupting",
          "Quiet hours and consent gates so outreach stays compliant",
        ],
      },
      {
        h2: "Lead nurturing on autopilot",
        paragraphs: [
          "Not every lead is ready to buy or sell this month. Lead nurturing keeps you top-of-mind until timing aligns. ARI runs scheduled check-ins, market touches, and re-engagement prompts — automatically — while you focus on clients who are active now.",
          "Every touch is logged on the contact record, so when a lead replies six weeks later, you have full context — no digging through texts or old emails.",
        ],
      },
      {
        h2: "Know who to call next",
        paragraphs: [
          "Automation doesn't mean losing control. ARI highlights leads who replied, clicked, or went quiet — so your manual outreach goes to the highest-intent opportunities. Follow-up software should make you more effective, not replace the relationship.",
        ],
      },
    ],
    highlights: [
      {
        title: "Instant first response",
        body: "Reach new leads in minutes with automated SMS — while you're in appointments.",
      },
      {
        title: "Drip sequences",
        body: "Build multi-step campaigns that nurture over days, weeks, or months.",
      },
      {
        title: "Full activity history",
        body: "Every message, reply, and campaign step lives on the contact record.",
      },
      {
        title: "Editable scripts",
        body: "Update voice scripts and message copy without rebuilding entire campaigns.",
      },
    ],
    faq: [
      {
        q: "Will automated follow-up sound robotic?",
        a: "You write the messages and control timing. ARI delivers them consistently — many agents personalize templates with merge fields for a natural tone.",
      },
      {
        q: "What channels does ARI support?",
        a: "SMS via Twilio, email delivery, and ringless voicemail. Combine them in one automated sequence.",
      },
      {
        q: "Is automated texting compliant?",
        a: "ARI includes DNC scrubbing, consent tracking, quiet hours, and TCPA-aware campaign gates. You control who gets contacted.",
      },
      {
        q: "Can I pause automation for a specific lead?",
        a: "Yes. Pause campaigns, move leads to manual follow-up, or adjust sequences anytime from the contact record.",
      },
      {
        q: "How do I get started?",
        a: "Sign up for a 14-day free trial. Founding members get white-glove setup — we import leads and configure your first follow-up campaign.",
      },
    ],
    relatedPages: SHARED_RELATED.filter((p) => p.href !== "/lead-follow-up"),
  },
  "realtor-lead-follow-up": {
    slug: "realtor-lead-follow-up",
    path: "/realtor-lead-follow-up",
    title: "Real Estate Lead Follow-Up Software for Realtors",
    description:
      "Follow up with every real estate lead automatically — SMS, email, and voicemail sequences built for Realtors. ARI helps you nurture leads and close more deals.",
    h1: "Follow Up With Every Real Estate Lead—Automatically",
    eyebrow: "Realtor lead follow-up",
    intro:
      "Realtors juggle dozens of active leads across buyer searches, listing inquiries, and sphere outreach. ARI makes sure every lead gets consistent follow-up — even when you're back-to-back with showings.",
    sections: [
      {
        h2: "The follow-up gap costs Realtors deals",
        paragraphs: [
          "Industry data consistently shows that most leads go to the agent who responds first. Yet most Realtors still rely on memory, sticky notes, and sporadic texting — especially for leads that aren't hot today but might be ready next quarter.",
          "Realtor lead follow-up software closes that gap. ARI ensures every inquiry gets an immediate response and a structured nurture path, so you're the agent who stays in touch — not the one they forgot.",
        ],
      },
      {
        h2: "Designed for how Realtors actually work",
        paragraphs: [
          "ARI isn't a generic sales automation tool repackaged for real estate. Campaigns, pipeline stages, and messaging templates reflect Realtor workflows — buyer consults, listing appointments, open-house follow-up, and sphere touches.",
        ],
        bullets: [
          "Buyer and seller pipeline stages with clear next actions",
          "Open-house and portal-lead follow-up sequences",
          "Sphere and past-client nurture campaigns",
          "Reminders when a lead goes quiet — so you re-engage at the right moment",
        ],
      },
      {
        h2: "Lead nurturing that builds trust over time",
        paragraphs: [
          "Real estate is a relationship business. Lead nurturing isn't about blasting promotions — it's about showing up consistently with value. ARI helps Realtors send market updates, check-ins, and personalized touches on a schedule that keeps you top-of-mind without feeling spammy.",
          "When a lead is finally ready to move, you're the obvious choice — because you never disappeared.",
        ],
      },
      {
        h2: "From first touch to signed contract",
        paragraphs: [
          "Follow-up doesn't stop after the first conversation. ARI tracks the full journey — initial outreach, nurture touches, showing reminders, and re-engagement for leads who ghost. Your CRM and follow-up system work as one, so nothing falls through the cracks.",
        ],
      },
    ],
    highlights: [
      {
        title: "Portal lead response",
        body: "Instant follow-up when Zillow or Realtor.com leads hit your inbox.",
      },
      {
        title: "Sphere nurture",
        body: "Stay in touch with past clients and referrals on autopilot.",
      },
      {
        title: "Task-driven workflow",
        body: "Reminders tell you exactly who needs a personal call today.",
      },
      {
        title: "Real estate CRM included",
        body: "Pipeline, contacts, and campaigns in one platform — no juggling apps.",
      },
    ],
    faq: [
      {
        q: "Is ARI only for buyer leads?",
        a: "No. ARI supports buyer inquiries, seller leads, open-house follow-up, sphere nurture, and past-client re-engagement.",
      },
      {
        q: "How fast can I respond to new leads?",
        a: "Instantly. Automated SMS can fire within minutes of import — often while you're still in a showing.",
      },
      {
        q: "Do I need technical skills to set up campaigns?",
        a: "No. Founding members get white-glove setup — we configure your first campaigns during onboarding. The visual sequence builder makes edits easy afterward.",
      },
      {
        q: "Can I use my own phone number?",
        a: "Yes. ARI integrates with Twilio so you can send SMS from a dedicated business line.",
      },
      {
        q: "What does it cost?",
        a: "Plans start with a 14-day free trial. See our pricing page for Starter, Growth, and Pro tiers — Growth is recommended for active agents.",
      },
    ],
    relatedPages: SHARED_RELATED.filter((p) => p.href !== "/realtor-lead-follow-up"),
  },
  "lead-reactivation": {
    slug: "lead-reactivation",
    path: "/lead-reactivation",
    title: "Lead Reactivation Software — Turn Old Leads Into Opportunities",
    description:
      "Your old leads aren't dead. ARI's lead reactivation campaigns re-engage dormant contacts with SMS, email, and voicemail — turning past inquiries into new conversations.",
    h1: "Your Old Leads Aren't Dead. Start the Conversation Again.",
    eyebrow: "Lead reactivation",
    intro:
      "Most agents sit on hundreds of contacts who inquired months ago but never converted. Lead reactivation turns that dormant database into your lowest-cost source of new business.",
    sections: [
      {
        h2: "The hidden gold in your CRM",
        paragraphs: [
          "You already paid for those Zillow leads, open-house sign-ins, and website inquiries. Many went quiet — not because they weren't interested, but because life got in the way or follow-up stopped too soon.",
          "Lead reactivation is the practice of reaching back out to old leads with a fresh, relevant message. It's one of the highest-ROI activities in real estate — no new ad spend, just conversations restarted.",
        ],
      },
      {
        h2: "Systematic re-engagement, not one-off blasts",
        paragraphs: [
          "A single mass text isn't reactivation — it's spam. ARI runs structured re-engagement campaigns that feel personal: a check-in SMS, a market update email, a voicemail touch, then a prompt for you to call the responders.",
        ],
        bullets: [
          "Segment dormant leads by source, stage, or last contact date",
          "Multi-step reactivation sequences across SMS, email, and RVM",
          "Automatic tagging when a lead replies or re-enters your pipeline",
          "Compliance tools so reactivation stays within consent rules",
        ],
      },
      {
        h2: "Turn cold leads into warm conversations",
        paragraphs: [
          "When an old lead responds to a reactivation campaign, ARI moves them back into your active pipeline and creates a task for personal follow-up. You focus on the leads who raised their hand — not the ones who stayed silent.",
          "Agents regularly report that reactivated leads convert at higher rates than cold portal inquiries, because trust was already started months ago.",
        ],
      },
      {
        h2: "Old lead follow-up on autopilot",
        paragraphs: [
          "Set a reactivation campaign once and let it run against new segments as your database grows. ARI handles scheduling, delivery, and logging — you handle the conversations that come back.",
          "Pair reactivation with your ongoing nurture campaigns so leads never go fully cold again.",
        ],
      },
    ],
    highlights: [
      {
        title: "Database reactivation",
        body: "Upload or tag dormant contacts and launch a re-engagement sequence in minutes.",
      },
      {
        title: "Smart segmentation",
        body: "Target leads by last activity, source, or pipeline stage — not everyone gets the same message.",
      },
      {
        title: "Reply detection",
        body: "Responders automatically surface for personal follow-up.",
      },
      {
        title: "Full history preserved",
        body: "See every past touch before you pick up the phone.",
      },
    ],
    faq: [
      {
        q: "How old can leads be for reactivation?",
        a: "There's no hard limit. Many agents successfully re-engage leads from 6–18 months ago. Message tone should match how long it's been since last contact.",
      },
      {
        q: "Is reactivation compliant?",
        a: "ARI scrubs against DNC lists and respects consent records. Always ensure you have appropriate consent for the channel you're using.",
      },
      {
        q: "What response rates should I expect?",
        a: "Rates vary by market and list quality, but reactivation typically outperforms cold outreach because leads already know your name.",
      },
      {
        q: "Can I reactivate my entire database at once?",
        a: "We recommend segmented batches — by neighborhood, lead source, or date — for better deliverability and more relevant messaging.",
      },
      {
        q: "Does ARI help set up reactivation campaigns?",
        a: "Yes. Founding member onboarding includes configuring your first reactivation sequence alongside your new-lead follow-up.",
      },
    ],
    relatedPages: SHARED_RELATED.filter((p) => p.href !== "/lead-reactivation"),
  },
};

export const SEO_PAGE_SLUGS = Object.keys(SEO_LANDING_PAGES) as SeoPageSlug[];
