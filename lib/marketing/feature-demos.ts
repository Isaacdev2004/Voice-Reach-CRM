import type { FeaturePageSlug } from "@/lib/seo/feature-pages";
export type ProductDemo = {kind:"contacts"|"sequence"|"assistant"|"calendar"|"notes"|"property"|"finance"|"voice"|"analytics"|"integration";intro:string;title:string;cta:string;steps:string[];labels:string[];details:string[];related:FeaturePageSlug[]};
/** Illustrative public-only content. No customer records, provider calls, enrollment or persistence. */
export const FEATURE_DEMOS = {
  "lead-management": {
    "kind": "contacts",
    "title": "Every relationship, a clear next step.",
    "cta": "See How Lead Management Works",
    "steps": [
      "New lead",
      "Organized contact",
      "Next appointment"
    ],
    "labels": [
      "New inquiry · Avery Bennett",
      "Buyer preferences, in one place",
      "A personal follow-up, prepared"
    ],
    "details": [
      "Avery is a synthetic buyer looking for a coastal home. Add contacts manually or import an authorized CSV.",
      "Keep the contact’s stage, preferences and notes together before choosing an outreach sequence.",
      "Review the contact’s history, then plan an appointment or follow-up task."
    ],
    "related": [
      "pipeline-management",
      "campaign-builder",
      "ai-assistant"
    ],
    "intro": "Bring contacts, preferences and conversation history together. Turn a scattered database into a clear plan for the next personal touch."
  },
  "pipeline-management": {
    "kind": "contacts",
    "title": "See the relationship behind each stage.",
    "cta": "Explore the Contact Journey",
    "steps": [
      "Review stages",
      "Choose a contact",
      "Plan next steps"
    ],
    "labels": [
      "New lead → Follow-up → Appointment",
      "Avery Bennett · Follow-up",
      "Prepare for the next conversation"
    ],
    "details": [
      "Lifecycle stages help organize attention; they do not establish a buyer’s intent.",
      "Read saved contact details and activity before changing a stage.",
      "Create the next task or appointment. Stage changes alone do not authorize outreach."
    ],
    "related": [
      "lead-management",
      "notifications",
      "campaign-builder"
    ],
    "intro": "See where each relationship stands, review the contact behind the stage and choose a considered next step."
  },
  "automated-follow-up": {
    "kind": "sequence",
    "title": "A thoughtful sequence, at your pace.",
    "cta": "Explore a Follow-Up Sequence",
    "steps": [
      "Choose audience",
      "Prepare sequence",
      "Review before launch"
    ],
    "labels": [
      "A focused audience",
      "Email, SMS and voicemail",
      "Review comes first"
    ],
    "details": [
      "Choose eligible contacts from your own CRM.",
      "Prepare messages and delays across supported channels.",
      "Review content, recipients, consent, providers and plan access before activation."
    ],
    "related": [
      "campaign-builder",
      "lead-management",
      "voice-studio"
    ],
    "intro": "Prepare a consistent rhythm of email, SMS and voicemail follow-up. Review the audience, content and timing before activation."
  },
  "campaign-builder": {
    "kind": "sequence",
    "title": "Build the follow-up you would want to receive.",
    "cta": "Explore a Follow-Up Sequence",
    "steps": [
      "Audience",
      "Sequence",
      "Review"
    ],
    "labels": [
      "Buyer follow-up · Illustrative draft",
      "Three considered touchpoints",
      "Ready for your review"
    ],
    "details": [
      "Start with a clear audience and purpose.",
      "Arrange an email, SMS and voicemail script with deliberate timing.",
      "A draft is not an enrollment or a send. Activation requires a separate decision."
    ],
    "related": [
      "text-automation",
      "email-automation",
      "voice-studio"
    ],
    "intro": "Build a sequence around the relationship. Prepare each message, choose deliberate timing and review before launch."
  },
  "text-automation": {
    "kind": "sequence",
    "title": "A small message. A personal opening.",
    "cta": "Explore an SMS Step",
    "steps": [
      "Personalize",
      "Set timing",
      "Check eligibility"
    ],
    "labels": [
      "A simple buyer check-in",
      "Timing that respects the recipient",
      "Consent before communication"
    ],
    "details": [
      "Review merge fields and make the message sound like you.",
      "Combine an SMS step with other supported campaign steps.",
      "Opt-outs, suppression, consent and provider setup still apply."
    ],
    "related": [
      "campaign-builder",
      "lead-management",
      "automation-workflows"
    ],
    "intro": "Prepare concise, personal SMS steps alongside your other outreach. Keep consent, timing and opt-outs in view."
  },
  "email-automation": {
    "kind": "sequence",
    "title": "Give your relationships room to grow.",
    "cta": "Explore an Email Sequence",
    "steps": [
      "Draft email",
      "Add follow-up",
      "Review"
    ],
    "labels": [
      "A useful introduction",
      "A considered follow-up",
      "Review the complete sequence"
    ],
    "details": [
      "Prepare a subject and message with meaningful context.",
      "Choose appropriate delays alongside SMS or voicemail steps.",
      "Review the content and recipient eligibility before activation."
    ],
    "related": [
      "client-email-updates",
      "campaign-builder",
      "ai-assistant"
    ],
    "intro": "Give clients useful information and a reason to stay connected. Prepare personalized email steps within a reviewed campaign."
  },
  "client-email-updates": {
    "kind": "assistant",
    "title": "Keep clients informed, in your own words.",
    "cta": "Explore a Client Update Draft",
    "steps": [
      "Supply context",
      "Prepare draft",
      "Personalize"
    ],
    "labels": [
      "Agent brief",
      "An illustrative email draft",
      "Your final review"
    ],
    "details": [
      "Provide verified information you want included in the update.",
      "Supported AI drafting requires a configured provider and authorized access.",
      "Confirm every fact and personalize the wording. This demonstration sends nothing."
    ],
    "related": [
      "ai-assistant",
      "email-automation",
      "notes-and-strategy"
    ],
    "intro": "Turn verified client context into a thoughtful update. Use supported drafting tools, then review every detail in your own voice."
  },
  "ringless-voicemail": {
    "kind": "voice",
    "title": "Prepare a voice message worth hearing.",
    "cta": "Explore a Voicemail Script",
    "steps": [
      "Write script",
      "Review audio",
      "Review assignment"
    ],
    "labels": [
      "A warm, concise introduction",
      "Listen to the exact recording",
      "Assign only after approval"
    ],
    "details": [
      "Draft a short script with accurate contact information.",
      "Record or upload audio in your account; supported generation requires configuration.",
      "An approved recording and eligible campaign step are required. Playback is not proof of delivery."
    ],
    "related": [
      "voice-studio",
      "campaign-builder",
      "analytics"
    ],
    "intro": "Prepare a personal voicemail script and review the exact recording before campaign assignment. Delivery requires configured providers and eligible recipients."
  },
  "voice-studio": {
    "kind": "voice",
    "title": "The right words. Your personal voice.",
    "cta": "See Voice Studio in Action",
    "steps": [
      "Write",
      "Record & review",
      "Approve"
    ],
    "labels": [
      "A script you can make your own",
      "Your recording, reviewed",
      "Approval belongs to the agent"
    ],
    "details": [
      "Try editing this synthetic script. Changes stay in this browser view.",
      "Record or upload in Voice Studio; provider-dependent tools require setup.",
      "Review the exact version before assignment. Script changes do not replace approved audio."
    ],
    "related": [
      "ringless-voicemail",
      "ai-assistant",
      "campaign-builder"
    ],
    "intro": "Write a script, record or upload audio and review the version you want to use. Keep creative preparation separate from campaign approval."
  },
  "lead-reactivation": {
    "kind": "sequence",
    "title": "A fresh reason to reconnect.",
    "cta": "Explore a Reactivation Draft",
    "steps": [
      "Review contacts",
      "Prepare check-in",
      "Choose next step"
    ],
    "labels": [
      "Revisit dormant relationships",
      "A relevant, respectful check-in",
      "Decide how to follow up"
    ],
    "details": [
      "Review existing CRM records rather than assuming new interest.",
      "Prepare a considered sequence appropriate to the contact’s history.",
      "Verify consent and eligibility before any enrollment or sending."
    ],
    "related": [
      "lead-management",
      "campaign-builder",
      "analytics"
    ],
    "intro": "Revisit the relationships already in your CRM. Use their history to prepare a relevant, respectful reason to reconnect."
  },
  "calendar-and-tasks": {
    "kind": "calendar",
    "title": "Make space for what matters today.",
    "cta": "See Your Day in Action",
    "steps": [
      "Appointments",
      "Priorities",
      "Next steps"
    ],
    "labels": [
      "A clear view of your day",
      "Keep important work visible",
      "A task with context"
    ],
    "details": [
      "Review appointments in MyARI’s internal calendar.",
      "Bring task deadlines and follow-ups into your plan.",
      "Review the associated contact and record your next action."
    ],
    "related": [
      "notifications",
      "notes-and-strategy",
      "google-calendar"
    ],
    "intro": "Bring appointments, task deadlines and personal follow-up into one clear day. Keep the right contact context close at hand."
  },
  "notes-and-strategy": {
    "kind": "notes",
    "title": "From a useful thought to a clear next step.",
    "cta": "See Notes & Strategy in Action",
    "steps": [
      "Capture",
      "Organize",
      "Plan"
    ],
    "labels": [
      "Buyer consultation · Synthetic note",
      "Context for the conversation",
      "A reviewable checklist"
    ],
    "details": [
      "Try writing in this demo note. No content is saved or transmitted.",
      "Use supported contact links and templates in your account. Advanced associations depend on the deployed version.",
      "Turn agreed next steps into a working checklist; create CRM tasks using the tools available to your account."
    ],
    "related": [
      "lead-management",
      "notifications",
      "calendar-and-tasks"
    ],
    "intro": "Capture what matters, connect supported CRM context and prepare your next steps. Give useful ideas a place in your working day."
  },
  "property-finder": {
    "kind": "property",
    "title": "Start with the buyer. Refine the search.",
    "cta": "Explore Saved Buyer Criteria",
    "steps": [
      "Save criteria",
      "External search",
      "Personal follow-up"
    ],
    "labels": [
      "Avery’s ideal next home",
      "Continue to permitted external results",
      "Share thoughtfully"
    ],
    "details": [
      "Review location, budget, bedrooms and saved buyer preferences.",
      "MyARI prepares an external Zillow search. This demo does not load listings or scrape property data.",
      "Review results and choose a supported sharing or follow-up action. No IDX feed or automatic interest tracking is implied."
    ],
    "related": [
      "lead-management",
      "campaign-builder",
      "mortgage-calculator"
    ],
    "intro": "Save buyer preferences and prepare tailored external Zillow searches. Keep the search connected to the contact and your personal follow-up."
  },
  "mortgage-calculator": {
    "kind": "finance",
    "title": "Bring the numbers into the conversation.",
    "cta": "Explore the Mortgage Calculator",
    "steps": [
      "Assumptions",
      "Payment estimate",
      "Compare & report"
    ],
    "labels": [
      "Start with clear assumptions",
      "An illustrative monthly payment",
      "A more informed discussion"
    ],
    "details": [
      "Adjust the example purchase price below; no lender data is fetched.",
      "Principal and interest use a 30-year fixed-rate illustration, with separate illustrative taxes and insurance.",
      "Compare supported scenarios and review a client-ready report in your account. Estimates are not quotes or approvals."
    ],
    "related": [
      "property-finder",
      "lead-management",
      "notes-and-strategy"
    ],
    "intro": "Explore payment assumptions, compare supported financing scenarios and prepare client-ready estimates. Clear illustrations, without pretending to be lender quotes."
  },
  "ai-assistant": {
    "kind": "assistant",
    "title": "Your ideas. A thoughtful starting point.",
    "cta": "Watch MyARI Assistant",
    "steps": [
      "Agent prompt",
      "Illustrative draft",
      "Review & revise"
    ],
    "labels": [
      "Agent: Prepare a buyer follow-up",
      "MyARI: Here is a draft to review",
      "You decide what happens next"
    ],
    "details": [
      "Supply a clear brief and authorized CRM context.",
      "Drafting and campaign-proposal capabilities vary by authorized account, deployed version and provider setup.",
      "Verify details and request revisions before using a draft. The public demo calls no AI provider."
    ],
    "related": [
      "campaign-builder",
      "notes-and-strategy",
      "lead-management"
    ],
    "intro": "Start with a clear brief. Use the drafting and planning tools available to your authorized account, then review and refine the result."
  },
  "analytics": {
    "kind": "analytics",
    "title": "Clarity from the activity you can verify.",
    "cta": "Explore Campaign Reporting",
    "steps": [
      "Activity",
      "Delivery evidence",
      "Follow-up"
    ],
    "labels": [
      "Illustrative campaign activity",
      "Separate submission from delivery",
      "A decision informed by records"
    ],
    "details": [
      "Example metrics show recorded activity, not customer outcomes.",
      "Delivery depends on actual provider events. Missing evidence stays unavailable.",
      "Use verified records to decide where attention is needed. Opens and clicks do not establish buyer intent."
    ],
    "related": [
      "campaign-builder",
      "lead-management",
      "notifications"
    ],
    "intro": "Understand recorded campaign activity and available delivery evidence. Use the supporting records to decide what needs attention."
  },
  "notifications": {
    "kind": "calendar",
    "title": "Give the next important action a place.",
    "cta": "Explore Tasks & Reminders",
    "steps": [
      "Review",
      "Prioritize",
      "Act"
    ],
    "labels": [
      "Today’s follow-up list",
      "A deadline with an owner",
      "Return with the right context"
    ],
    "details": [
      "Review recorded tasks and available notifications.",
      "Choose the work that needs attention today.",
      "Open the relevant contact or appointment. Notification delivery depends on configuration and preferences."
    ],
    "related": [
      "calendar-and-tasks",
      "lead-management",
      "notes-and-strategy"
    ],
    "intro": "Keep due tasks and follow-up priorities visible. Move from a reminder to the relevant contact, appointment or next action."
  },
  "automation-workflows": {
    "kind": "sequence",
    "title": "Consistency, with considered controls.",
    "cta": "Explore a Supported Workflow",
    "steps": [
      "Choose steps",
      "Set delays",
      "Review controls"
    ],
    "labels": [
      "Supported timed campaign steps",
      "A deliberate pace",
      "Activation is a separate decision"
    ],
    "details": [
      "Use implemented email, SMS and voicemail campaign steps.",
      "Review timing, quiet hours and recipient eligibility.",
      "No unsupported triggers or autonomous actions are implied. Sending requires setup and explicit activation."
    ],
    "related": [
      "campaign-builder",
      "automated-follow-up",
      "analytics"
    ],
    "intro": "Arrange supported campaign steps and deliberate delays. Keep recipient eligibility, review and activation under agent control."
  },
  "google-calendar": {
    "kind": "integration",
    "title": "Connect your calendar, on your terms.",
    "cta": "Explore Calendar Connection Steps",
    "steps": [
      "Configure",
      "Authorize",
      "Verify"
    ],
    "labels": [
      "Google Calendar integration checklist",
      "Your account authorizes access",
      "Verify connection and sync"
    ],
    "details": [
      "Google OAuth credentials and the correct callback must be configured.",
      "The subscriber grants the configured scopes through Google.",
      "Confirm status and a successful sync in your account. This public demonstration is not a connected Google session."
    ],
    "related": [
      "calendar-and-tasks",
      "notifications",
      "lead-management"
    ],
    "intro": "Bring an authorized Google Calendar connection into your planning workflow. Configuration, subscriber consent and successful sync must be verified."
  },
  "dotloop-integration": {
    "kind": "integration",
    "title": "Keep transaction context close at hand.",
    "cta": "Explore Integration Requirements",
    "steps": [
      "Configure",
      "Authorize",
      "Verify access"
    ],
    "labels": [
      "Dotloop connection requirements",
      "Subscriber authorization",
      "Confirm supported transaction access"
    ],
    "details": [
      "Configured OAuth credentials and approved integration access are required.",
      "Authorize the correct subscriber account before accessing transaction information.",
      "Verify available records and permissions in the account. No live Dotloop connection, document transfer or signature is demonstrated."
    ],
    "related": [
      "lead-management",
      "notes-and-strategy",
      "mortgage-calculator"
    ],
    "intro": "Keep transaction planning connected to your CRM. Review the configuration, authorization and access requirements for a supported Dotloop connection."
  }
} satisfies Record<FeaturePageSlug,ProductDemo>;
