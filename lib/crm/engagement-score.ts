import { FEATURED_TEMPLATE_KEYS, PRODUCT_CAMPAIGN_TEMPLATES } from "@/lib/crm/campaign-templates";

/**
 * Engagement score weights from buyer-engagement-workflows-spec.md
 */
export const ENGAGEMENT_WEIGHTS = {
  email_open: 1,
  email_click: 3,
  reply: 10,
  text_reply: 10,
  call_answered: 10,
  tour_completed: 20,
  decay_14d: -5,
} as const;

export type EngagementEventKind = keyof typeof ENGAGEMENT_WEIGHTS;

export function scoreForEvent(kind: string): number {
  if (kind in ENGAGEMENT_WEIGHTS) {
    return ENGAGEMENT_WEIGHTS[kind as EngagementEventKind];
  }
  if (kind === "opened" || kind === "email_opened") return ENGAGEMENT_WEIGHTS.email_open;
  if (kind === "clicked") return ENGAGEMENT_WEIGHTS.email_click;
  if (kind === "replied" || kind === "sms_replied") return ENGAGEMENT_WEIGHTS.reply;
  if (kind === "listened" || kind === "voicemail_listened") return ENGAGEMENT_WEIGHTS.email_click;
  return 0;
}

export function featuredTemplates() {
  return PRODUCT_CAMPAIGN_TEMPLATES.filter((t) =>
    FEATURED_TEMPLATE_KEYS.includes(t.templateKey),
  );
}

/** Recommended install order for Kikzeny's Fiverr docs */
export const RECOMMENDED_INSTALL_ORDER = [
  "cold-lead-reengage",
  "long-term-buyer-nurture",
  "listing-alert-drip",
  "speed-to-lead",
  "engaged-no-tour",
  "post-tour-follow-up",
] as const;
