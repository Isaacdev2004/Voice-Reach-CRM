import { CRM_COMPARISON_TABLE, SITE_OFFER } from "@/lib/marketing/site-offer";

export type SeoPageSlug =
  | "real-estate-crm"
  | "lead-follow-up"
  | "realtor-lead-follow-up"
  | "lead-reactivation";

export type SeoLandingPageConfig = {
  slug: string;
  path: string;
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
  comparisonTable?: typeof CRM_COMPARISON_TABLE;
};

const SHARED_RELATED = [
  { href: "/real-estate-crm", label: "Real estate CRM" },
  { href: "/lead-follow-up", label: "Lead follow-up system" },
  { href: "/realtor-lead-follow-up", label: "Realtor workflows" },
  { href: "/lead-reactivation", label: "Lead reactivation" },
  { href: "/features/automated-follow-up", label: "Automated follow-up (product)" },
  { href: "/pricing", label: "Pricing & plans" },
] as const;

const { trialDays, whiteGlove, compliance, leadIntake, integrations } = SITE_OFFER;

export const SEO_LANDING_PAGES: Record<SeoPageSlug, SeoLandingPageConfig> = {
  "real-estate-crm": {
    slug: "real-estate-crm",
    path: "/real-estate-crm",
    title: "Real Estate CRM for Agents & Realtors",
    description:
      "ARI is the real estate CRM that helps you follow up automatically by text, email, and voicemail - while keeping every lead, conversation, task, and next step in one place.",
    h1: "A Real Estate CRM That Keeps Every Lead Moving",
    eyebrow: "Real estate CRM for agents",
    intro:
      "ARI is the real estate CRM that helps you follow up automatically by text, email, and voicemail - while keeping every lead, conversation, task, and next step in one place. Spend less time remembering who to contact. Spend more time talking to people who are ready to move.",
    sections: [
      {
        h2: "Your CRM shouldn't just store leads. It should help you work them.",
        paragraphs: [
          "You pay for Zillow leads. You collect names at open houses. You meet prospects through referrals, your sphere, and past clients. Then real life happens.",
          "A showing runs long. A listing needs attention. A buyer calls. A lead you meant to text today becomes a lead you remember two weeks from now.",
          `ARI is built around one simple idea: ${SITE_OFFER.primaryPromise} Your contacts, pipeline, communication history, tasks, and automated follow-up live together - so you can see what's happening and know exactly where to focus.`,
        ],
      },
      {
        h2: "Follow-up happens even when you're busy",
        paragraphs: [
          "New leads rarely go cold because an agent intentionally ignores them. They go cold because follow-up becomes another thing to remember. ARI helps keep the conversation going on the schedule you configure.",
          "You control the messaging, timing, and campaign rules. ARI handles the repetition. You step in when there's a real conversation to have.",
        ],
        bullets: [
          "SMS - Send timely texts without manually copying, pasting, and setting reminders.",
          "Email - Nurture prospects over days, weeks, or months with automated email follow-up.",
          "Ringless voicemail - Add another touchpoint without turning every follow-up into another phone call.",
        ],
      },
      {
        h2: "Open ARI and know who needs attention",
        paragraphs: [
          "No digging through spreadsheets. No scrolling through old text threads. No wondering which leads you forgot.",
          "ARI gives you a simple real estate pipeline that shows where every opportunity stands and what should happen next.",
        ],
        bullets: [
          "New leads and active conversations",
          "Buyers and sellers you're nurturing",
          "Appointments, showings, and prospects who have gone quiet",
          "Each contact keeps notes, tags, history, tasks, and campaign activity together",
        ],
      },
      {
        h2: "Built around the way real estate leads actually behave",
        paragraphs: [
          `New internet lead - ${leadIntake.portalIntake} You take over when the prospect engages.`,
          "Open-house lead - Import sign-ins, tag them by property or event, and start a follow-up sequence while the conversation is still fresh.",
          "Old database lead - Organize and reactivate dormant contacts with structured, segmented outreach instead of one-by-one manual texting.",
          "Sphere and past clients - Create consistent touches that help you stay visible to the people most likely to refer you or work with you again.",
        ],
      },
      {
        h2: "Switching CRMs shouldn't become another project",
        paragraphs: [
          `${whiteGlove.detail} ${whiteGlove.setupWindow}`,
          `Current integrations: ${integrations.connected.map((i) => i.label).join(" and ")}. Import via ${integrations.importSources.slice(0, 3).join(", ")}, and more.`,
        ],
        bullets: [
          "Lead import - We help bring your existing contact database into ARI.",
          "Pipeline setup - We configure a workflow that fits how you manage buyers, sellers, and prospects.",
          "Your first follow-up campaign - We help get your initial automated sequence ready to run.",
        ],
      },
      {
        h2: "The leads you already have may be your biggest opportunity",
        paragraphs: [
          "Agents spend heavily generating leads, while many databases contain months or years of people who were never followed up with consistently. ARI helps you systematically reconnect with eligible prospects using consent-aware, segmented workflows.",
          "See our dedicated lead reactivation page for a full workflow.",
        ],
      },
    ],
    highlights: [
      {
        title: "One place for every lead",
        body: "Contacts from CSV import, exports, referrals, and open houses in one pipeline.",
      },
      {
        title: "Automated follow-up",
        body: "Multi-step SMS, email, and ringless voicemail campaigns on your schedule.",
      },
      {
        title: compliance.featureLabel,
        body: compliance.shortNote,
      },
      {
        title: "White-glove setup",
        body: whiteGlove.detail,
      },
    ],
    comparisonTable: CRM_COMPARISON_TABLE,
    faq: [
      {
        q: "How is ARI different from other real estate CRMs?",
        a: "ARI is built around lead follow-up. Pipeline, communication history, tasks, and automated outreach work together so leads keep moving toward a conversation.",
      },
      {
        q: "Can I import my existing contacts?",
        a: "Yes. CSV import is available, and onboarding assistance can help migrate an existing database.",
      },
      {
        q: "Do I need to replace my current CRM?",
        a: "Not necessarily. Some agents use ARI as the lead-management and follow-up layer while keeping another system for other workflows.",
      },
      {
        q: "Will ARI automatically contact people without my control?",
        a: "You decide which campaigns to use, who enters them, the messages they receive, and when outreach occurs. ARI automates the execution of the workflow you configure.",
      },
      {
        q: "How long does setup take?",
        a: whiteGlove.setupWindow,
      },
      {
        q: "Is there a free trial?",
        a: `Yes - ${trialDays} days free. ${SITE_OFFER.cardRequiredNote}. You won't be charged until the trial ends.`,
      },
    ],
    relatedPages: SHARED_RELATED.filter((p) => p.href !== "/real-estate-crm"),
  },
  "lead-follow-up": {
    slug: "lead-follow-up",
    path: "/lead-follow-up",
    title: "Real Estate Lead Follow-Up System & Software",
    description:
      "Why real estate follow-up fails - and how ARI operationalizes a system where every lead gets a next step through SMS, email, and ringless voicemail.",
    h1: "A Real Estate Follow-Up System That Works Even When You're Busy",
    eyebrow: "Lead follow-up system",
    intro:
      "ARI gives agents a repeatable follow-up system across SMS, email, and voicemail - so every lead has a clear next step.",
    sections: [
      {
        h2: "The follow-up problem is a systems problem",
        paragraphs: [
          "Agents don't lose deals because they don't care. They lose deals because follow-up depends on memory, sticky notes, and scattered inboxes - especially when showings, listings, and client calls fill the day.",
          "Speed matters, but so does persistence. Research on sales follow-up consistently shows that most conversions happen after multiple touches - yet most outreach stops after one or two attempts.",
        ],
      },
      {
        h2: "What an ideal follow-up system does",
        paragraphs: ["A follow-up system should answer four questions for every lead:"],
        bullets: [
          "Did we acknowledge the inquiry quickly?",
          "Is there a planned next touch - not just a hope to call later?",
          "Can we see every prior message without searching apps?",
          "Do we know when a human conversation should replace automation?",
        ],
      },
      {
        h2: "How ARI operationalizes follow-up",
        paragraphs: [
          leadIntake.qualified,
          "You build multi-step campaigns across SMS, email, and ringless voicemail. ARI runs the schedule; you handle replies and high-intent conversations.",
        ],
      },
      {
        h2: "Compliance-aware by design",
        paragraphs: [
          compliance.shortNote,
          "ARI includes consent tracking, suppression/DNC tools, and quiet-hour controls - but your legal basis for outreach remains your responsibility.",
        ],
      },
    ],
    highlights: [
      {
        title: "System, not slogans",
        body: "Follow-up as a repeatable workflow - not a daily scramble.",
      },
      {
        title: "Multi-channel",
        body: "SMS, email, and ringless voicemail in one sequence.",
      },
      {
        title: "Full history",
        body: "Every touch logged on the contact record.",
      },
      {
        title: whiteGlove.shortLine,
        body: whiteGlove.detail,
      },
    ],
    faq: [
      {
        q: "Can ARI automate follow-up across SMS, email, and voicemail?",
        a: "Yes. Build multi-step sequences that mix channels on the schedule you configure. Replies surface on the contact record so you can take over with full context.",
      },
      {
        q: "Will automated follow-up sound robotic?",
        a: "You write the messages and control timing. Merge fields personalize templates for a natural tone.",
      },
      {
        q: "What channels does ARI support?",
        a: `SMS via Twilio, email delivery, and ringless voicemail via Slybroadcast - combinable in one sequence.`,
      },
      {
        q: "How does ARI support responsible SMS outreach?",
        a: `${compliance.shortNote} See our TCPA and acceptable use policies for details.`,
      },
      {
        q: "How do I get started?",
        a: `Start a ${trialDays}-day free trial. ${whiteGlove.shortLine.toLowerCase()} - ${whiteGlove.detail.toLowerCase()}`,
      },
    ],
    relatedPages: SHARED_RELATED.filter((p) => p.href !== "/lead-follow-up"),
  },
  "realtor-lead-follow-up": {
    slug: "realtor-lead-follow-up",
    path: "/realtor-lead-follow-up",
    title: "Realtor Lead Follow-Up Workflows & Scripts",
    description:
      "Realtor-specific follow-up workflows for Zillow leads, open houses, buyer consults, and sphere nurture - with the scripts and cadences agents actually use.",
    h1: "Realtor Follow-Up Workflows That Match How You Work",
    eyebrow: "Realtor-specific workflows",
    intro:
      "From portal leads and open houses to listing appointments and past clients, ARI helps automate the follow-up workflows Realtors use every day.",
    sections: [
      {
        h2: "Portal lead workflow (Zillow, Realtor.com, website)",
        paragraphs: [
          leadIntake.smsTiming,
          "Recommended cadence: Day 0 - acknowledgment SMS + call attempt when you're free. Day 1 - email with value. Day 3 - short check-in text. Day 7 - voicemail or personal call prompt.",
        ],
        bullets: [
          leadIntake.enrollmentFlow,
          "Import portal exports or add leads manually after inquiry",
          "Tag by source and property interest",
          "Assign to a speed-to-lead campaign you control",
        ],
      },
      {
        h2: "Open-house follow-up",
        paragraphs: [
          "Open-house leads go cold fast if follow-up waits until Monday. Import sign-ins the same day, reference the property they toured, and ask one clear question to start a conversation.",
        ],
        bullets: [
          "Tag by property address or neighborhood",
          "Same-day SMS while interest is fresh",
          "Follow-up task for personal call within 48 hours",
        ],
      },
      {
        h2: "Buyer consult & listing appointment nurture",
        paragraphs: [
          "Not every lead is ready to transact this month. Sphere and past-client touches keep you visible without feeling promotional - market snapshots, check-ins, and seasonal reminders on a schedule.",
        ],
      },
      {
        h2: "When to take over from automation",
        paragraphs: [
          "Automation handles repetition; you handle relationships. When a lead replies, books a showing, or asks a specific question, ARI surfaces them for personal follow-up with full context on the contact record.",
        ],
      },
    ],
    highlights: [
      {
        title: "Portal lead cadence",
        body: "Structured touches for Zillow and Realtor.com inquiries after import.",
      },
      {
        title: "Open-house same-day",
        body: "Tag by property and follow up while memory is fresh.",
      },
      {
        title: "Sphere nurture",
        body: "Scheduled check-ins for referrals and past clients.",
      },
      {
        title: "Realtor pipeline",
        body: "Buyer, seller, and nurture stages in one CRM.",
      },
    ],
    faq: [
      {
        q: "Can ARI handle different follow-up sequences for different lead sources?",
        a: "Yes. Create different workflows for portal leads, open houses, buyers, sellers, sphere contacts, and other segments.",
      },
      {
        q: "Do portal leads sync automatically?",
        a: leadIntake.portalIntake,
      },
      {
        q: "How fast can I respond to new leads?",
        a: leadIntake.smsTiming,
      },
      {
        q: "Do I need technical skills to set up campaigns?",
        a: `${whiteGlove.shortLine}. We configure your first campaigns during onboarding; the visual builder makes edits easy afterward.`,
      },
      {
        q: "What does it cost?",
        a: `Plans start with a ${trialDays}-day free trial. See pricing for Starter, Growth, and Pro tiers.`,
      },
    ],
    relatedPages: SHARED_RELATED.filter((p) => p.href !== "/realtor-lead-follow-up"),
  },
  "lead-reactivation": {
    slug: "lead-reactivation",
    path: "/lead-reactivation",
    title: "Lead Reactivation Software - Turn Old Leads Into Opportunities",
    description:
      "Re-engage dormant real estate contacts with segmented SMS, email, and voicemail campaigns - using leads you already paid for instead of buying new ones.",
    h1: "Your Old Leads Aren't Dead. Start the Conversation Again.",
    eyebrow: "Lead reactivation",
    intro:
      "Most agents sit on hundreds of contacts who inquired months ago but never converted. Lead reactivation turns that dormant database into your lowest-cost source of new conversations - when done with segmentation and consent-aware outreach.",
    sections: [
      {
        h2: "The opportunity already sitting in your database",
        paragraphs: [
          "You already paid for those Zillow leads, open-house sign-ins, and website inquiries. Many went quiet - not because they weren't interested, but because life got in the way or follow-up stopped too soon.",
          "Lead reactivation is structured re-engagement with a fresh, relevant message - not a one-off mass blast.",
        ],
      },
      {
        h2: "A concrete reactivation workflow",
        paragraphs: ["A practical reactivation sequence:"],
        bullets: [
          "Segment by last contact date, source, or neighborhood - not your entire database at once",
          "Day 1 - short check-in SMS referencing their original inquiry",
          "Day 4 - email with market update or value-add content",
          "Day 8 - ringless voicemail touch (where appropriate consent exists)",
          "Day 12 - task for personal call to responders",
        ],
      },
      {
        h2: "Turn cold leads into warm conversations",
        paragraphs: [
          "When an old lead responds, ARI moves them back into your active pipeline and creates a task for personal follow-up. You focus on the leads who raised their hand.",
          "Results vary by market, list quality, and time since last contact - reactivation typically works best when trust was already started.",
        ],
      },
      {
        h2: "Compliance qualification",
        paragraphs: [
          compliance.shortNote,
          "Before reactivating a list, confirm you have appropriate consent for the channel you use. ARI provides suppression/DNC tools and consent records - but list eligibility is fact-specific.",
        ],
      },
    ],
    highlights: [
      {
        title: "Database segmentation",
        body: "Filter dormant contacts before you reach out.",
      },
      {
        title: "Multi-touch sequences",
        body: "SMS, email, and voicemail in one reactivation campaign.",
      },
      {
        title: "Reply routing",
        body: "Responders surface for personal calls.",
      },
      {
        title: "Full history",
        body: "See every past touch before you re-engage.",
      },
    ],
    faq: [
      {
        q: "How old can leads be for reactivation?",
        a: "There's no hard limit. Many agents re-engage leads from 6–18 months ago. Message tone should match how long it's been since last contact.",
      },
      {
        q: "How does ARI support responsible reactivation outreach?",
        a: `${compliance.shortNote} Always ensure appropriate consent for your channel and list.`,
      },
      {
        q: "What response rates should I expect?",
        a: "Rates vary by market and list quality. We recommend segmented batches and relevant messaging rather than broad blasts.",
      },
      {
        q: "Can I reactivate my entire database at once?",
        a: "We recommend segmented batches - by neighborhood, lead source, or date - for better deliverability and more relevant messaging.",
      },
      {
        q: "Does ARI help set up reactivation campaigns?",
        a: `${whiteGlove.shortLine}. Onboarding can include configuring your first reactivation sequence alongside new-lead follow-up.`,
      },
    ],
    relatedPages: SHARED_RELATED.filter((p) => p.href !== "/lead-reactivation"),
  },
};

export const SEO_PAGE_SLUGS = Object.keys(SEO_LANDING_PAGES) as SeoPageSlug[];
