export const LEGAL_ROUTES = {
  terms: "/terms",
  privacy: "/privacy",
  smsConsent: "/sms-consent",
  tcpaConsent: "/tcpa-consent",
  acceptableUse: "/acceptable-use",
  refunds: "/refunds",
  dpa: "/dpa",
} as const;

export const LEGAL_RELATED = {
  terms: [
    { href: LEGAL_ROUTES.privacy, label: "Privacy policy" },
    { href: LEGAL_ROUTES.acceptableUse, label: "Acceptable Use Policy" },
    { href: LEGAL_ROUTES.tcpaConsent, label: "TCPA & Do-Not-Call Policy" },
    { href: LEGAL_ROUTES.refunds, label: "Refund & cancellation policy" },
  ],
  privacy: [
    { href: LEGAL_ROUTES.terms, label: "Terms of Service" },
    { href: LEGAL_ROUTES.dpa, label: "Data Processing Agreement" },
    { href: LEGAL_ROUTES.tcpaConsent, label: "TCPA & Do-Not-Call Policy" },
    { href: LEGAL_ROUTES.smsConsent, label: "SMS consent & opt-in" },
  ],
  smsConsent: [
    { href: LEGAL_ROUTES.tcpaConsent, label: "TCPA & Do-Not-Call Policy" },
    { href: LEGAL_ROUTES.privacy, label: "Privacy policy" },
    { href: LEGAL_ROUTES.terms, label: "Terms of Service" },
  ],
  tcpaConsent: [
    { href: LEGAL_ROUTES.smsConsent, label: "SMS consent & opt-in" },
    { href: LEGAL_ROUTES.acceptableUse, label: "Acceptable Use Policy" },
    { href: LEGAL_ROUTES.terms, label: "Terms of Service" },
  ],
  acceptableUse: [
    { href: LEGAL_ROUTES.terms, label: "Terms of Service" },
    { href: LEGAL_ROUTES.tcpaConsent, label: "TCPA & Do-Not-Call Policy" },
    { href: LEGAL_ROUTES.privacy, label: "Privacy policy" },
  ],
  refunds: [
    { href: LEGAL_ROUTES.terms, label: "Terms of Service" },
    { href: LEGAL_ROUTES.privacy, label: "Privacy policy" },
  ],
  dpa: [
    { href: LEGAL_ROUTES.privacy, label: "Privacy policy" },
    { href: LEGAL_ROUTES.terms, label: "Terms of Service" },
  ],
} as const;
