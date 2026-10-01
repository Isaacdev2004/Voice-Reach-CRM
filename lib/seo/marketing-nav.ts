export const PRODUCT_NAV_LINKS = [
  { href: "/real-estate-crm", label: "Real Estate CRM" },
  { href: "/lead-follow-up", label: "Lead Follow-Up" },
  { href: "/lead-reactivation", label: "Lead Reactivation" },
] as const;

export const MARKETING_NAV_LINKS = [
  ...PRODUCT_NAV_LINKS,
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const MARKETING_FOOTER_PRODUCT = PRODUCT_NAV_LINKS;

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
