import type { PlanId } from "./plans";

/** Public plan capability definitions — keep aligned with pricing page and in-app limits. */
export const PLAN_ENTITLEMENTS: Record<
  PlanId,
  {
    campaigns: string;
    sms: string;
    rvm: string;
    email: string;
    automation: string;
    scoring?: string;
  }
> = {
  starter: {
    campaigns:
      "CRM, pipeline, and tasks. Individual SMS/RVM sends on pay-as-you-go — not included multi-step campaign allotments.",
    sms: "Pay-as-you-go SMS ($0.03 each). Manual sends and one-off texts from the contact record.",
    rvm: "Pay-as-you-go ringless voicemail ($0.10 each). Manual or single-step drops.",
    email: "Up to 1,000 emails per month included. Suitable for individual and bulk sends from the CRM.",
    automation: "Calendar, tasks, and pipeline reminders. Multi-step drip campaigns and reactivation workflows start on Growth.",
  },
  growth: {
    campaigns:
      "Full campaign builder with multi-step SMS, email, and ringless voicemail sequences plus newsletter-style sends.",
    sms: "750 SMS included per month, then pay-as-you-go overage.",
    rvm: "250 ringless voicemail drops included per month, then pay-as-you-go overage.",
    email: "1,000 emails included per month for sequences and updates.",
    automation:
      "Multi-step drips, lead reactivation workflows, and scheduled campaign sequences across SMS, email, and RVM.",
  },
  pro: {
    campaigns: "Everything in Growth with higher included messaging volume and advanced automation rules.",
    sms: "2,000 SMS included per month, then reduced overage rates.",
    rvm: "1,000 ringless voicemail drops included per month, then reduced overage rates.",
    email: "5,000 emails included per month.",
    automation:
      "Advanced automation rules (triggers from pipeline stage and contact events) plus multi-step campaigns.",
    scoring:
      "Engagement scoring surfaces contacts with recent replies, opens, or activity so you know who to call next.",
  },
  team: {
    campaigns: "Everything in Pro with pooled messaging and shared workflows for brokerages.",
    sms: "Custom pooled SMS volume by team size.",
    rvm: "Custom pooled RVM volume by team size.",
    email: "10,000+ emails included (custom volume available).",
    automation: "Shared automation rules, admin reporting, and team onboarding.",
    scoring: "Team-level engagement signals and reporting.",
  },
};

export const ENGAGEMENT_SCORING_DEFINITION =
  "Engagement scoring highlights contacts with recent replies, message activity, or pipeline movement — helping you prioritize personal follow-up. Available on Pro and Team.";
