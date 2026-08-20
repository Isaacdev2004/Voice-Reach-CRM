export type PlanId = "starter" | "growth" | "pro";

export type PlanOption = {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  contactLimit: number | null;
  smsIncluded: number;
  rvmIncluded: number;
  featured?: boolean;
  cta: string;
  features: string[];
};

export const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Solo agent, getting off the ground",
    price: 49,
    contactLimit: 500,
    smsIncluded: 0,
    rvmIncluded: 0,
    cta: "Get Started",
    features: [
      "Up to 500 contacts",
      "Client tracking & notes",
      "Mortgage calculator",
      "Calendar, tasks & appointments",
      "Email — 1,000 sends/mo",
      "SMS & voicemail — pay as you go",
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
    featured: true,
    cta: "Get Growth",
    features: [
      "Up to 2,500 contacts",
      "Everything in Starter",
      "500 SMS / month included",
      "250 ringless voicemails / month",
      "Multi-step SMS + email + RVM drips",
      "Call tracking & logging",
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
    cta: "Get Pro",
    features: [
      "Unlimited contacts",
      "Everything in Growth",
      "2,000 SMS / month included",
      "1,000 ringless voicemails / month",
      "Team / multi-user access",
      "Priority support & onboarding",
    ],
  },
];

export function planById(id: string) {
  return PLAN_OPTIONS.find((plan) => plan.id === id);
}
