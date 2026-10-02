export const PRODUCT_NAV_LINKS = [
  { href: "/real-estate-crm", label: "Real Estate CRM" },
  { href: "/lead-follow-up", label: "Lead Follow-Up" },
  { href: "/realtor-lead-follow-up", label: "Realtor Workflows" },
  { href: "/lead-reactivation", label: "Lead Reactivation" },
] as const;

export const FEATURE_NAV_LINKS = [
  { href: "/features/automated-follow-up", label: "Automated follow-up" },
  { href: "/features/lead-management", label: "Lead management" },
  { href: "/features/text-automation", label: "Text automation" },
  { href: "/features/pipeline-management", label: "Pipeline" },
] as const;

export const MARKETING_NAV_LINKS = [
  ...PRODUCT_NAV_LINKS,
  { href: "/features", label: "Features" },
  { href: "/resources", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const MARKETING_FOOTER_PRODUCT = PRODUCT_NAV_LINKS;

export const MARKETING_FOOTER_FEATURES = [
  { href: "/features", label: "All features" },
  ...FEATURE_NAV_LINKS,
] as const;

export const MARKETING_FOOTER_RESOURCES = [
  { href: "/resources", label: "Resource hub" },
  { href: "/resources/ultimate-real-estate-lead-follow-up-guide", label: "Lead follow-up guide" },
  { href: "/resources/best-crm-features-for-real-estate-agents", label: "Best CRM features" },
  { href: "/resources/how-to-reactivate-old-real-estate-leads", label: "Reactivate old leads" },
] as const;

export const MARKETING_FOOTER_COMPANY = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

export const MARKETING_FOOTER_LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/tcpa-consent", label: "TCPA Consent" },
  { href: "/acceptable-use", label: "Acceptable Use" },
  { href: "/refunds", label: "Refunds" },
  { href: "/dpa", label: "DPA" },
] as const;
