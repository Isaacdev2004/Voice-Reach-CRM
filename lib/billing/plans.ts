export type PlanId = "starter" | "growth" | "pro";

export type PlanOption = {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  contactLimit: number | null;
  /** Included SMS / month (0 = pay-as-you-go at PAYG_RATES.sms) */
  smsIncluded: number;
  /** Included ringless drops / month (0 = pay-as-you-go at PAYG_RATES.rvm) */
  rvmIncluded: number;
  /** Included email sends / month */
  emailIncluded: number;
  featured?: boolean;
  cta: string;
  features: string[];
};

/** Starter (and overage) usage rates confirmed with Kikzeny */
export const PAYG_RATES = {
  sms: 0.03,
  rvm: 0.1,
} as const;

export function formatPaygSms() {
  return `$${PAYG_RATES.sms.toFixed(2)} per SMS`;
}

export function formatPaygRvm() {
  return `$${PAYG_RATES.rvm.toFixed(2)} per RVM drop`;
}

/**
 * Matches Kikzeny's voice-reach-pricing-strategy PDF.
 * Higher tiers include everything below — features accumulate; limits increase.
 */
export const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Solo agent, getting off the ground",
    price: 49,
    contactLimit: 500,
    smsIncluded: 0,
    rvmIncluded: 0,
    emailIncluded: 1000,
    cta: "Get Started",
    features: [
      "Up to 500 client contacts",
      "Client tracking & notes",
      "Mortgage calculator",
      "Calendar, tasks & appointments",
      "Email campaigns — 1,000 sends/mo",
      `SMS — ${formatPaygSms()} (pay as you go)`,
      `Ringless voicemail — ${formatPaygRvm()}`,
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "Active agent running campaigns",
    price: 97,
    contactLimit: 2500,
    smsIncluded: 500,
    rvmIncluded: 250,
    emailIncluded: 1000,
    featured: true,
    cta: "Get Growth",
    features: [
      "Up to 2,500 client contacts",
      "Everything in Starter",
      "SMS campaigns — 500 included/mo",
      "Ringless voicemail — 250 drops/mo",
      "Call tracking & logging",
      "Newsletter builder & automation",
      "Multi-step SMS + email + RVM drips",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Team or high-volume operation",
    price: 197,
    contactLimit: null,
    smsIncluded: 2000,
    rvmIncluded: 1000,
    emailIncluded: 5000,
    cta: "Get Pro",
    features: [
      "Unlimited client contacts",
      "Everything in Growth",
      "SMS campaigns — 2,000 included/mo",
      "Ringless voicemail — 1,000 drops/mo",
      "Behavior-triggered automation",
      "Team / multi-user access",
      "Priority support & onboarding",
    ],
  },
];

export function planById(id: string) {
  return PLAN_OPTIONS.find((plan) => plan.id === id);
}
