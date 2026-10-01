/** Additional feature pages — merged into FEATURE_PAGES in feature-pages.ts */
export const ADDITIONAL_FEATURE_PAGES = {
  "ringless-voicemail": {
    slug: "ringless-voicemail",
    path: "/features/ringless-voicemail",
    category: "Follow-up",
    title: "Ringless Voicemail for Real Estate Agents",
    description:
      "Send ringless voicemail drops to real estate leads with ARI — personalized voice messages in automated campaigns without interrupting prospects.",
    h1: "Ringless Voicemail That Gets Heard",
    eyebrow: "Ringless voicemail",
    intro:
      "Voicemail cuts through when texts get ignored. ARI delivers ringless voicemail (RVM) as part of your follow-up sequences — with scripts and AI voice you control.",
    sections: [
      {
        h2: "Voice follow-up without the cold call",
        paragraphs: [
          "Many leads won't answer unknown numbers but will listen to a voicemail on their own time. Ringless voicemail drops your message directly to voicemail — no phone ringing, no awkward interruption.",
          "Pair RVM with SMS and email in the same campaign so every lead gets the channel that works for them.",
        ],
      },
      {
        h2: "Built into campaigns and Voice Studio",
        paragraphs: [
          "Record or generate voice scripts in Voice Studio, approve the audio, and link each recording to a voicemail step in your automation sequence. Preview how each day sounds before you launch.",
        ],
        bullets: [
          "Voicemail steps in multi-day campaign sequences",
          "AI voice generation via ElevenLabs (optional)",
          "Per-step voice script editing without rebuilding the campaign",
          "Compliance-aware sending with consent and quiet hours",
        ],
      },
    ],
    highlights: [
      { title: "Sequence-ready", body: "Add RVM as a step alongside SMS and email." },
      { title: "Voice Studio", body: "Generate, approve, and link recordings per step." },
      { title: "Slybroadcast delivery", body: "Production ringless voicemail provider integration." },
      { title: "Logged on contact", body: "Every drop recorded on the lead timeline." },
    ],
    relatedProductHref: "/lead-follow-up",
    relatedProductLabel: "automated lead follow-up",
  },
  "voice-studio": {
    slug: "voice-studio",
    path: "/features/voice-studio",
    category: "Follow-up",
    title: "Voice Script Studio for Real Estate Campaigns",
    description:
      "Write, generate, and approve voice scripts for ringless voicemail in ARI Voice Studio — edit scripts per campaign step and preview before send.",
    h1: "Voice Scripts & AI Audio for Every Campaign Step",
    eyebrow: "Voice Studio",
    intro:
      "Your voicemail should sound like you — not a robot reading a bad template. Voice Studio lets you write scripts, generate audio, approve takes, and attach them to specific automation steps.",
    sections: [
      {
        h2: "Scripts that match your market",
        paragraphs: [
          "Draft personalized voicemail scripts for new leads, nurture touches, and reactivation. Use AI Assist to generate a first draft, then edit until it sounds like your voice and your market.",
        ],
      },
      {
        h2: "Approve before anything goes live",
        paragraphs: [
          "Every recording goes through an approval step before it can be linked to a live campaign — so nothing reaches leads until you've signed off.",
        ],
        bullets: [
          "Script editor with campaign-step linking",
          "AI text-to-speech generation (ElevenLabs)",
          "Approve and assign recordings per voicemail step",
          "Edit scripts on existing automation steps without rebuilding",
        ],
      },
    ],
    highlights: [
      { title: "Per-step scripts", body: "Different voicemail copy for day 1 vs. day 7." },
      { title: "AI drafts", body: "Claude helps write SMS, email, and voice copy." },
      { title: "Approval gate", body: "No accidental sends with unreviewed audio." },
      { title: "Campaign linking", body: "Connect approved audio directly to sequences." },
    ],
    relatedProductHref: "/features/ringless-voicemail",
    relatedProductLabel: "ringless voicemail",
  },
  "campaign-builder": {
    slug: "campaign-builder",
    path: "/features/campaign-builder",
    category: "Follow-up",
    title: "Real Estate Campaign Builder & Automation Sequences",
    description:
      "Build multi-step real estate campaigns in ARI — SMS, email, and ringless voicemail sequences with day-by-day previews and assign leads in one click.",
    h1: "Campaign Sequences That Run While You Work",
    eyebrow: "Campaign builder",
    intro:
      "Design follow-up once: day 0 text, day 1 email, day 3 voicemail, day 7 check-in. ARI's campaign builder shows each step, previews RVM days, and assigns contacts when you're ready to launch.",
    sections: [
      {
        h2: "Visual sequences, real channels",
        paragraphs: [
          "Drag-and-order steps across SMS, email, and ringless voicemail. Templates get you started; you customize copy, timing, and voice for your farm area or lead source.",
        ],
        bullets: [
          "Multi-step sequences with day offsets",
          "Assign contacts or segments to a campaign",
          "Per-day RVM preview in the sequence view",
          "Test run before going live",
        ],
      },
      {
        h2: "From template to live outreach",
        paragraphs: [
          "Start from proven follow-up templates, adjust scripts, connect Voice Studio recordings, and activate — your leads enter the sequence automatically.",
        ],
      },
    ],
    highlights: [
      { title: "Multi-channel", body: "SMS, email, and RVM in one workflow." },
      { title: "Templates", body: "Launch faster with pre-built sequences." },
      { title: "Assign & track", body: "See who is on day 3 of a 30-day nurture." },
      { title: "Editable mid-flight", body: "Update voice scripts without rebuilding." },
    ],
    relatedProductHref: "/real-estate-crm",
    relatedProductLabel: "real estate CRM",
  },
  "notes-and-strategy": {
    slug: "notes-and-strategy",
    path: "/features/notes-and-strategy",
    category: "Agent tools",
    title: "Client Notes & Strategy for Real Estate Agents",
    description:
      "Capture showing notes, buyer preferences, and follow-up strategy in ARI — linked to contacts so context is ready before every call.",
    h1: "Notes & Strategy Linked to Every Contact",
    eyebrow: "Notes & strategy",
    intro:
      "Stop digging through texts and random apps for what a buyer said at a showing. Notes & Strategy stores takeaways, preferences, and plan-of-action notes on the contact record — or as general strategy notes for your business.",
    sections: [
      {
        h2: "Context before every conversation",
        paragraphs: [
          "Log showing feedback, spouse preferences, timeline, and objections right after the appointment. When you call back weeks later, the note is waiting on their profile — not lost in your phone.",
        ],
        bullets: [
          "Notes linked to contacts or kept general",
          "Quick add from dashboard or contact profile",
          "Timestamped history you can scan before dialing",
          "Strategy notes for market plans and sphere touches",
        ],
      },
      {
        h2: "Turn notes into action",
        paragraphs: [
          "Pair notes with tasks and campaigns — a note about a Q2 move-in date becomes a scheduled nurture sequence and a reminder to check in next month.",
        ],
      },
    ],
    highlights: [
      { title: "Contact-linked", body: "Every note tied to the right lead." },
      { title: "Quick capture", body: "Add from Quick Create or contact page." },
      { title: "Strategy log", body: "General notes for business planning." },
      { title: "Call prep", body: "Review notes before outreach." },
    ],
    relatedProductHref: "/real-estate-crm",
    relatedProductLabel: "real estate CRM",
  },
  "mortgage-calculator": {
    slug: "mortgage-calculator",
    path: "/features/mortgage-calculator",
    category: "Agent tools",
    title: "Mortgage Calculator for Real Estate Agents",
    description:
      "Run buyer payment estimates in ARI with live rate context — share monthly payment breakdowns with clients during showings and follow-up.",
    h1: "Mortgage Calculator Built Into Your CRM",
    eyebrow: "Mortgage calculator",
    intro:
      "Answer \"What would my payment be?\" on the spot. ARI's mortgage calculator estimates principal, interest, taxes, and insurance — with rate context agents can reference in conversations and client emails.",
    sections: [
      {
        h2: "Payment math during the conversation",
        paragraphs: [
          "Adjust price, down payment, rate, and term to show buyers realistic monthly payments. Use it live on a call or after a showing when budget questions come up.",
        ],
        bullets: [
          "Purchase price, down payment, rate, and term inputs",
          "Monthly payment breakdown (PITI-style estimate)",
          "Rate context from market data feeds when available",
          "Copy results to share in email or text follow-up",
        ],
      },
      {
        h2: "Pair with Property Finder",
        paragraphs: [
          "Combine payment estimates with saved buyer criteria and property search links — so follow-up includes both numbers and listings that fit.",
        ],
      },
    ],
    highlights: [
      { title: "On-demand estimates", body: "No leaving ARI for a separate calculator site." },
      { title: "Client-ready numbers", body: "Share payment ranges in follow-up messages." },
      { title: "Rate awareness", body: "Reference current rate environment in consults." },
      { title: "Buyer conversations", body: "Move lookers toward qualified decisions." },
    ],
    relatedProductHref: "/features/property-finder",
    relatedProductLabel: "Property Finder",
  },
  "property-finder": {
    slug: "property-finder",
    path: "/features/property-finder",
    category: "Agent tools",
    title: "Property Finder for Buyer Lead Follow-Up",
    description:
      "Save buyer area and budget in ARI, generate property search links, and send curated listing follow-up tied to each contact.",
    h1: "Property Finder Linked to Your Buyers",
    eyebrow: "Property Finder",
    intro:
      "Know where each buyer wants to live and what they can spend. Property Finder stores preferred area and budget on the contact, builds search links, and helps you send relevant listing follow-up fast.",
    sections: [
      {
        h2: "Buyer criteria on the contact record",
        paragraphs: [
          "Select a contact, set their target neighborhood and budget, and save criteria to their profile. No more guessing which ZIP code they mentioned three weeks ago.",
        ],
      },
      {
        h2: "Search links you can send in seconds",
        paragraphs: [
          "Generate a property search link from saved criteria, copy it, and drop it into an SMS, email, or campaign step — perfect for post-showing follow-up or weekly listing updates.",
        ],
        bullets: [
          "Preferred area and budget per contact",
          "One-click search link generation",
          "Copy to clipboard for texts and emails",
          "Works alongside Notes & Strategy for showing context",
        ],
      },
    ],
    highlights: [
      { title: "Per-buyer criteria", body: "Area and budget saved on the contact." },
      { title: "Quick share", body: "Copy search links into any follow-up channel." },
      { title: "Campaign-ready", body: "Use in nurture emails and listing updates." },
      { title: "CRM-connected", body: "Criteria travels with the lead." },
    ],
    relatedProductHref: "/lead-follow-up",
    relatedProductLabel: "automated lead follow-up",
  },
  "calendar-and-tasks": {
    slug: "calendar-and-tasks",
    path: "/features/calendar-and-tasks",
    category: "CRM",
    title: "Calendar, Tasks & Showing Reminders for Agents",
    description:
      "Manage showings, follow-up tasks, and Google Calendar sync in ARI — see what is due today and tie every task to a contact.",
    h1: "Calendar & Tasks So Nothing Gets Missed",
    eyebrow: "Calendar & tasks",
    intro:
      "Appointments, call-backs, and showing prep live in one place. ARI Calendar and Tasks connect to your contacts — with Google Calendar sync when you connect Google in Settings.",
    sections: [
      {
        h2: "Your day in one view",
        paragraphs: [
          "See today's tasks, upcoming showings, and follow-up reminders alongside your pipeline. Click through to the contact record with full history before you walk in the door.",
        ],
        bullets: [
          "Task list with due dates and contact links",
          "Calendar view for appointments and blocks",
          "Google Calendar OAuth sync (Settings)",
          "Quick create tasks from contacts and dashboard",
        ],
      },
      {
        h2: "Automation plus personal touch",
        paragraphs: [
          "Campaigns handle repetitive outreach; tasks tell you when a lead needs a personal call, showing confirmation, or contract milestone check-in.",
        ],
      },
    ],
    highlights: [
      { title: "Contact-linked tasks", body: "Every to-do tied to a lead." },
      { title: "Calendar sync", body: "Google Calendar integration available." },
      { title: "Daily priorities", body: "Know who to call today." },
      { title: "Showing prep", body: "Review notes and criteria before appointments." },
    ],
    relatedProductHref: "/real-estate-crm",
    relatedProductLabel: "real estate CRM",
  },
  "ai-assistant": {
    slug: "ai-assistant",
    path: "/features/ai-assistant",
    category: "Agent tools",
    title: "AI Assistant for Real Estate Follow-Up Copy",
    description:
      "Draft SMS, email, and voice scripts with ARI's AI Assistant — powered by Claude to help agents write follow-up faster.",
    h1: "AI Assist for Scripts, Emails & Texts",
    eyebrow: "AI Assistant",
    intro:
      "Writer's block kills follow-up speed. ARI's built-in AI Assistant helps draft SMS, email, and voice scripts you can edit and drop into campaigns — so you launch outreach faster without sounding generic.",
    sections: [
      {
        h2: "Draft copy in seconds",
        paragraphs: [
          "Describe the lead situation — new Zillow inquiry, open-house follow-up, dormant sphere contact — and get a starting script you personalize before it sends.",
        ],
        bullets: [
          "Email, SMS, and script generation",
          "Edit before anything goes live",
          "Works with Voice Studio for audio generation",
          "Available from the dashboard AI sidebar",
        ],
      },
      {
        h2: "You stay in control",
        paragraphs: [
          "AI suggests; you approve. Every message and recording still goes through your review, compliance settings, and campaign rules.",
        ],
      },
    ],
    highlights: [
      { title: "Multi-channel drafts", body: "SMS, email, and voicemail scripts." },
      { title: "Fast iteration", body: "Tweak tone and details in seconds." },
      { title: "Campaign-ready", body: "Move drafts straight into sequences." },
      { title: "Always editable", body: "Nothing sends without your sign-off." },
    ],
    relatedProductHref: "/features/campaign-builder",
    relatedProductLabel: "campaign builder",
  },
  "analytics": {
    slug: "analytics",
    path: "/features/analytics",
    category: "CRM",
    title: "Real Estate CRM Analytics & Activity Tracking",
    description:
      "Track campaign performance, contact engagement, and outreach activity in ARI Analytics — see what's working in your follow-up.",
    h1: "Analytics That Show What's Working",
    eyebrow: "Analytics",
    intro:
      "Follow-up without feedback is guessing. ARI Analytics and Activity Logs show sends, engagement, and pipeline movement — so you know which campaigns and sources deserve more attention.",
    sections: [
      {
        h2: "Campaign and channel visibility",
        paragraphs: [
          "Review outreach activity across SMS, email, and voicemail. Activity Logs capture what was sent, when, and to whom — tied to each contact record.",
        ],
      },
      {
        h2: "Improve over time",
        paragraphs: [
          "See which sequences produce replies and which lead sources fill your pipeline — then double down on what converts.",
        ],
        bullets: [
          "Dashboard analytics overview",
          "Detailed activity log per account",
          "Engagement signals on contacts",
          "Audit trail for compliance review",
        ],
      },
    ],
    highlights: [
      { title: "Activity logs", body: "Full send history for accountability." },
      { title: "Engagement tracking", body: "See who is responding." },
      { title: "Source insights", body: "Compare lead sources over time." },
      { title: "Compliance audit", body: "TCPA-aware logging built in." },
    ],
    relatedProductHref: "/real-estate-crm",
    relatedProductLabel: "real estate CRM",
  },
  "automation-workflows": {
    slug: "automation-workflows",
    path: "/features/automation-workflows",
    category: "Follow-up",
    title: "Automation Workflows & Rules for Real Estate",
    description:
      "Configure automation rules in ARI to trigger follow-up actions based on lead behavior, pipeline stage, and timing.",
    h1: "Automation Rules Beyond Basic Sequences",
    eyebrow: "Automation workflows",
    intro:
      "Campaigns handle scheduled outreach. Automation workflows add rules — when a lead moves stages, goes quiet, or hits a milestone, ARI can trigger the next action automatically.",
    sections: [
      {
        h2: "Rules that match your process",
        paragraphs: [
          "Define workflows that reflect how you actually sell — nurture paths for cold leads, accelerated sequences for hot portal inquiries, and re-engagement when someone stalls.",
        ],
      },
      {
        h2: "Less manual babysitting",
        paragraphs: [
          "Set the logic once and let ARI enforce consistency across your pipeline — so every lead gets the same high standard of follow-up even when you're slammed.",
        ],
      },
    ],
    highlights: [
      { title: "Workflow rules", body: "Trigger actions from lead behavior." },
      { title: "Stage-based logic", body: "Different paths for different pipeline stages." },
      { title: "Consistent execution", body: "Same process for every lead." },
      { title: "Pairs with campaigns", body: "Rules and sequences work together." },
    ],
    relatedProductHref: "/features/campaign-builder",
    relatedProductLabel: "campaign builder",
  },
  "dotloop-integration": {
    slug: "dotloop-integration",
    path: "/features/dotloop-integration",
    category: "Integrations",
    title: "Dotloop Integration for Real Estate Transactions",
    description:
      "Connect Dotloop to ARI to align transaction workflows with your CRM pipeline — OAuth secure connection from Settings.",
    h1: "Dotloop Connected to Your CRM",
    eyebrow: "Dotloop integration",
    intro:
      "Leads live in ARI; transactions live in Dotloop. Connect your Dotloop account from Settings so transaction and contact workflows stay aligned as deals move from nurture to under contract.",
    sections: [
      {
        h2: "Secure OAuth connection",
        paragraphs: [
          "Agents connect their own Dotloop account from Workspace Settings — no shared passwords, revocable access, and tokens stored securely per user.",
        ],
      },
      {
        h2: "CRM + transactions in one workflow",
        paragraphs: [
          "ARI focuses on lead follow-up and pipeline; Dotloop remains the system of record for loops and documents. The integration bridges prospecting and closing without duplicate data entry.",
        ],
      },
    ],
    highlights: [
      { title: "OAuth connect", body: "One-click setup from Settings." },
      { title: "Per-agent auth", body: "Each user connects their Dotloop account." },
      { title: "Pipeline alignment", body: "Lead context meets transaction stage." },
      { title: "Revocable access", body: "Disconnect anytime from Settings." },
    ],
    relatedProductHref: "/real-estate-crm",
    relatedProductLabel: "real estate CRM",
  },
  "google-calendar": {
    slug: "google-calendar",
    path: "/features/google-calendar",
    category: "Integrations",
    title: "Google Calendar Sync for Real Estate Agents",
    description:
      "Sync Google Calendar with ARI — connect in Settings and keep showings, tasks, and follow-up appointments aligned.",
    h1: "Google Calendar Sync Built In",
    eyebrow: "Google Calendar",
    intro:
      "Your calendar shouldn't fight your CRM. Connect Google Calendar in Settings and keep appointments visible alongside contacts, tasks, and campaign activity.",
    sections: [
      {
        h2: "Connect in one minute",
        paragraphs: [
          "OAuth sign-in from Workspace Settings — authorize once and ARI can create and reflect calendar events tied to your workflow.",
        ],
      },
      {
        h2: "Showings and follow-ups in sync",
        paragraphs: [
          "Campaign calendar steps and task reminders work better when your Google Calendar is connected — fewer double-bookings and missed appointments.",
        ],
      },
    ],
    highlights: [
      { title: "OAuth secure", body: "Standard Google sign-in flow." },
      { title: "Settings connect", body: "Enable from Workspace integrations." },
      { title: "Event creation", body: "Calendar steps in campaigns when connected." },
      { title: "Agent-friendly", body: "Works with the calendar you already use." },
    ],
    relatedProductHref: "/features/calendar-and-tasks",
    relatedProductLabel: "calendar & tasks",
  },
  "client-email-updates": {
    slug: "client-email-updates",
    path: "/features/client-email-updates",
    category: "Follow-up",
    title: "Client Email Updates & Newsletter Campaigns",
    description:
      "Send market updates, newsletters, and nurture emails to real estate clients through ARI email campaigns — draft with AI, add to sequences, or send to segments.",
    h1: "Email Updates & Newsletters for Your Database",
    eyebrow: "Email campaigns",
    intro:
      "Stay in touch with past clients and active leads through email — market updates, newsletters, listing announcements, and nurture content. Build emails in campaigns, use AI Assist for drafts, and send to the contacts who need to hear from you.",
    sections: [
      {
        h2: "Newsletter-style email in your CRM",
        paragraphs: [
          "There is no separate newsletter app to learn. Email steps live inside the same campaign builder as SMS and voicemail — so a monthly market update or listing blast is just another step in your workflow.",
        ],
        bullets: [
          "Email steps in multi-day campaigns",
          "One-time or recurring nurture sequences",
          "AI-drafted copy you edit before send",
          "Contact segments and tags for who receives what",
        ],
      },
      {
        h2: "Share tools output with clients",
        paragraphs: [
          "Copy mortgage calculator results, property search links, and note summaries into email follow-up — send useful content quickly after showings or consults, then track sends on the contact record.",
        ],
      },
    ],
    highlights: [
      { title: "Campaign email", body: "Newsletters and updates via email steps." },
      { title: "AI drafts", body: "Write faster with AI Assist." },
      { title: "Copy & send", body: "Share calculator and search links easily." },
      { title: "Tracked history", body: "Every send logged on the contact." },
    ],
    relatedProductHref: "/features/email-automation",
    relatedProductLabel: "email automation",
  },
};
