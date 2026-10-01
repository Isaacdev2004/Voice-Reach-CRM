import type { SeoLandingPageConfig } from "@/lib/seo/landing-pages";

export const SMALL_BUSINESS_PAGE: SeoLandingPageConfig = {
  slug: "real-estate-crm",
  path: "/real-estate-crm",
  title: "Simple CRM & Lead Follow-Up for Small Businesses",
  description:
    "ARI helps small business owners organize leads, automate follow-up, and stay connected with every opportunity — without enterprise CRM complexity.",
  h1: "A CRM That Keeps Your Leads Moving Even When You're Busy",
  eyebrow: "CRM for small business",
  intro:
    "Running a small business means wearing every hat. ARI gives you a simple CRM with automated SMS and email follow-up — so leads get a response even when you're with customers.",
  sections: [
    {
      h2: "Built for owners who do it all",
      paragraphs: [
        "Enterprise CRMs are overkill for a team of one to five. Spreadsheets break when leads pile up. ARI sits in the middle — organized contacts, automated follow-up, and a clear list of who to call today.",
      ],
    },
    {
      h2: "Automated follow-up without a marketing team",
      paragraphs: [
        "Set up SMS and email sequences once. New inquiries get instant acknowledgment; nurture campaigns keep prospects warm until they're ready to buy.",
      ],
      bullets: [
        "Contact management with notes and tags",
        "Automated SMS and email sequences",
        "Task reminders for personal follow-up",
        "Simple pipeline to track deal stages",
      ],
    },
    {
      h2: "Same engine, different positioning",
      paragraphs: [
        "ARI's core platform powers real estate agents today. Small business owners get the same follow-up automation — lead capture, nurture, and re-engagement — without Realtor-specific language on this page.",
        "For real estate-specific features, see our dedicated real estate CRM page.",
      ],
    },
  ],
  highlights: [
    { title: "Simple setup", body: "Live in 24–48 hours with guided onboarding." },
    { title: "Affordable plans", body: "Month-to-month billing, no long-term contracts." },
    { title: "Multi-channel", body: "SMS, email, and voicemail in one workflow." },
    { title: "Compliance tools", body: "Consent tracking and quiet hours built in." },
  ],
  faq: [
    {
      q: "Is ARI only for real estate?",
      a: "ARI is optimized for real estate agents but the core CRM and follow-up automation works for any small business that relies on leads and appointments.",
    },
    {
      q: "How is this different from HubSpot or Salesforce?",
      a: "ARI focuses on follow-up automation first — not enterprise marketing suites. It's simpler, faster to set up, and priced for solo owners and small teams.",
    },
    {
      q: "Can I import my existing contacts?",
      a: "Yes. CSV import is built in, and onboarding includes migration help for Founding members.",
    },
  ],
  relatedPages: [
    { href: "/lead-follow-up", label: "Automated lead follow-up" },
    { href: "/pricing", label: "Pricing & plans" },
    { href: "/real-estate-crm", label: "Real estate CRM" },
    { href: "/contact", label: "Contact us" },
  ],
};

/** Metadata path for small business page (distinct from slug typing). */
export const SMALL_BUSINESS_PATH = "/crm-for-small-business" as const;
