import type { CampaignDefinition } from "./types";
import { DEFAULT_CAMPAIGN } from "./mock-data";

export type ProductCampaignTemplate = CampaignDefinition & {
  templateKey: string;
  featured?: boolean;
};

/** Shared starter sequences — available to every workspace, not owned by one account. */
export const PRODUCT_CAMPAIGN_TEMPLATES: ProductCampaignTemplate[] = [
  {
    templateKey: "cold-lead-reengage",
    featured: true,
    id: "tpl-cold-lead-reengage",
    name: "Cold Lead Re-engagement",
    description:
      "Re-open conversations with cold or quiet leads using a light voicemail + SMS + email sequence, then a personal callback.",
    audience: "Cold / inactive leads",
    durationDays: 8,
    goals: [
      "Re-engage leads with no recent activity",
      "Get a reply or callback without sounding spammy",
      "Hand warm responses back to the agent",
    ],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: [
      {
        id: "cl-1",
        order: 1,
        type: "voicemail",
        title: "Warm check-in voicemail",
        description:
          "Hi — it's [Agent]. We connected a while back about your home plans. No pressure — just checking in to see if timing is better this season. Happy to help whenever you're ready.",
        dayLabel: "Day 1",
        timeLabel: "10:00 AM",
        status: "draft",
      },
      {
        id: "cl-2",
        order: 2,
        type: "sms",
        title: "Short SMS follow-up",
        description:
          "Hi [FirstName], it's [Agent]. Left you a quick voicemail — still exploring a move this year? Reply STOP to opt out.",
        dayLabel: "Day 1",
        timeLabel: "2:00 PM",
        status: "draft",
      },
      {
        id: "cl-3",
        order: 3,
        type: "email",
        title: "Value email",
        description:
          "Subject: Quick thought for you, [FirstName]. Short note with one useful market/neighborhood insight and a simple ask: open to a 10-minute catch-up?",
        dayLabel: "Day 3",
        timeLabel: "11:00 AM",
        status: "draft",
      },
      {
        id: "cl-4",
        order: 4,
        type: "sms",
        title: "Light nudge",
        description:
          "Hi [FirstName] — last note from me for now. If you want a quick market snapshot, just reply YES. Reply STOP to opt out.",
        dayLabel: "Day 6",
        timeLabel: "10:00 AM",
        status: "draft",
      },
      {
        id: "cl-5",
        order: 5,
        type: "callback",
        title: "Agent callback task",
        description:
          "If they replied or listened, call personally. If silent, mark complete and wait 30 days before another sequence.",
        dayLabel: "Day 8",
        timeLabel: "9:00 AM",
        status: "draft",
      },
    ],
  },
  {
    templateKey: "luxury-seller-follow-up",
    ...DEFAULT_CAMPAIGN,
    id: "tpl-luxury-seller-follow-up",
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: DEFAULT_CAMPAIGN.steps.map((s, i) => ({
      ...s,
      id: `ls-${i + 1}`,
      status: "draft" as const,
    })),
  },
];

export function instantiateTemplate(templateKey: string): CampaignDefinition | null {
  const tpl = PRODUCT_CAMPAIGN_TEMPLATES.find((t) => t.templateKey === templateKey);
  if (!tpl) return null;
  return {
    ...tpl,
    id: `campaign-${crypto.randomUUID()}`,
    steps: tpl.steps.map((step) => ({
      ...step,
      id: `step-${crypto.randomUUID()}`,
      status: "draft",
    })),
  };
}
