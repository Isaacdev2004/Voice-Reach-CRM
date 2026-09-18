export type PlanId = "starter" | "growth" | "pro" | "team";

export type PlanOption = {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  /** Display "From $X/mo" on landing */
  priceFrom?: boolean;
  /** Self-serve checkout vs contact sales */
  contactSales?: boolean;
  contactLimit: number | null;
  usersIncluded: number;
  smsIncluded: number;
  rvmIncluded: number;
  emailIncluded: number;
  featured?: boolean;
  cta: string;
  features: string[];
  smsOverage: number;
  rvmOverage: number;
};

/** Default pay-as-you-go rates (Starter + Growth overages) */
export const PAYG_RATES = {
  sms: 0.03,
  rvm: 0.1,
} as const;

/** Pro / Team volume overage rates */
export const PRO_OVERAGE_RATES = {
  sms: 0.025,
  rvm: 0.08,
} as const;

export function formatPaygSms(rate = PAYG_RATES.sms) {
  return `$${rate.toFixed(2)} per SMS`;
}

export function formatPaygRvm(rate = PAYG_RATES.rvm) {
  return `$${rate.toFixed(2)} per RVM drop`;
}

export function overageRatesForPlan(planId: PlanId) {
  if (planId === "pro" || planId === "team") return PRO_OVERAGE_RATES;
  return PAYG_RATES;
}

/**
 * ARI pricing tiers — optimized for conversion + margin guardrails.
 * Growth is the recommended plan at launch.
 */
export const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "starter",
    name: "Starter",
    description: "New / solo agent",
    price: 49,
    contactLimit: 1000,
    usersIncluded: 1,
    smsIncluded: 0,
    rvmIncluded: 0,
    emailIncluded: 1000,
    smsOverage: PAYG_RATES.sms,
    rvmOverage: PAYG_RATES.rvm,
    cta: "Start Free",
    features: [
      "Up to 1,000 contacts",
      "CRM + lead tracking",
      "Calendar, tasks & appointments",
      "Mortgage calculator",
      "1,000 emails included / mo",
      `SMS + RVM pay-as-you-go ($${PAYG_RATES.sms.toFixed(2)} SMS · $${PAYG_RATES.rvm.toFixed(2)} RVM)`,
      "1 user",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "Active producing agent",
    price: 99,
    contactLimit: 5000,
    usersIncluded: 1,
    smsIncluded: 750,
    rvmIncluded: 250,
    emailIncluded: 1000,
    smsOverage: PAYG_RATES.sms,
    rvmOverage: PAYG_RATES.rvm,
    featured: true,
    cta: "Start Free",
    features: [
      "Up to 5,000 contacts",
      "Everything in Starter",
      "750 SMS + 250 RVM included / mo",
      "Campaigns & newsletter automation",
      "Lead reactivation workflows",
      "Multi-step SMS + email + RVM drips",
      "1 user",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "High-volume agent / small team",
    price: 199,
    contactLimit: 15000,
    usersIncluded: 3,
    smsIncluded: 2000,
    rvmIncluded: 1000,
    emailIncluded: 5000,
    smsOverage: PRO_OVERAGE_RATES.sms,
    rvmOverage: PRO_OVERAGE_RATES.rvm,
    cta: "Start Free",
    features: [
      "Up to 15,000 contacts",
      "Everything in Growth",
      "2,000 SMS + 1,000 RVM included / mo",
      "Advanced automation & lead scoring",
      "Reporting & priority onboarding",
      "Up to 3 users",
      `Overages: $${PRO_OVERAGE_RATES.sms.toFixed(3)} SMS · $${PRO_OVERAGE_RATES.rvm.toFixed(2)} RVM`,
    ],
  },
  {
    id: "team",
    name: "Team",
    description: "Teams & brokerages",
    price: 299,
    priceFrom: true,
    contactSales: true,
    contactLimit: 30000,
    usersIncluded: 5,
    smsIncluded: 0,
    rvmIncluded: 0,
    emailIncluded: 10000,
    smsOverage: PRO_OVERAGE_RATES.sms,
    rvmOverage: PRO_OVERAGE_RATES.rvm,
    cta: "Contact Sales",
    features: [
      "30,000+ contacts (custom volume)",
      "Everything in Pro",
      "Pooled SMS + RVM by team size",
      "Shared workflows & admin reporting",
      "5 users included · add seats as needed",
      "Volume-priced custom overages",
      "Dedicated onboarding",
    ],
  },
];

/** Self-serve plans available in Stripe checkout */
export const CHECKOUT_PLAN_OPTIONS = PLAN_OPTIONS.filter((p) => !p.contactSales);

export function planById(id: string) {
  return PLAN_OPTIONS.find((plan) => plan.id === id);
}
