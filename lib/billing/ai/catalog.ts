import { planById } from "@/lib/billing/plans";
export const AI_LIMITS = {
  plus: {
    requests: 200,
    message_drafts: 100,
    campaign_drafts: 5,
    tasks: 75,
    calendar_events: 25,
    documents: 5,
    transcription_seconds: 1800,
    sapphire_seconds: 300,
    workflows: 10,
  },
  pro: {
    requests: 600,
    message_drafts: 350,
    campaign_drafts: 15,
    tasks: 250,
    calendar_events: 100,
    documents: 15,
    transcription_seconds: 5400,
    sapphire_seconds: 1200,
    workflows: 40,
  },
} as const;
export type AiTier = keyof typeof AI_LIMITS;
export type AiCapability = keyof typeof AI_LIMITS.plus;
export const AI_CAPABILITY_LABELS: Record<AiCapability, string> = {
  requests: "AI requests",
  message_drafts: "SMS/email drafts",
  campaign_drafts: "New campaign drafts",
  tasks: "AI-created tasks/reminders",
  calendar_events: "AI-created events",
  documents: "Premium flyers/documents",
  transcription_seconds: "Transcription seconds",
  sapphire_seconds: "Sapphire audio seconds",
  workflows: "Multi-step workflows",
};
export const AI_LAUNCH_PLANS = [
  { id: "starter", name: "Starter AI", monthly: 65 },
  { id: "growth", name: "Growth AI", monthly: 115 },
  { id: "pro", name: "Pro AI", monthly: 215 },
] as const;
/** AI Plus is included in a replacement base subscription, never an add-on. */
export const AI_PLUS_MONTHLY_DIFFERENCE = 16;
export const AI_MONITORING_THRESHOLDS = { plus: 5, pro: 12 } as const;
export const AI_PLAN_VERSION = "ai-launch-v1";
export const launchPlan = (id: string) =>
  AI_LAUNCH_PLANS.find((p) => p.id === id);
export function underlyingCrm(id: string) {
  const p = planById(id);
  if (!p || p.contactSales) throw Error("Unsupported underlying CRM plan");
  return p;
}
