import type { CampaignStepType } from "@/lib/crm/types";
import { PRODUCT_CAMPAIGN_TEMPLATES } from "@/lib/crm/campaign-templates";

export type CampaignLibraryStatus =
  | "draft"
  | "queued"
  | "sending"
  | "sent"
  | "partial"
  | "failed";

export const CAMPAIGN_HERO_IMAGES = [
  "/brand/heroes/campaigns.jpg",
  "/brand/heroes/contacts.jpg",
  "/brand/heroes/properties.jpg",
  "/brand/heroes/dashboard.jpg",
  "/brand/heroes/tasks.jpg",
  "/brand/heroes/notes.jpg",
  "/brand/heroes/mortgage.jpg",
  "/brand/heroes/calendar.jpg",
] as const;

export const CAMPAIGN_LIBRARY_FOLDERS = [
  { id: "buyer", name: "Buyer Nurture", count: 5 },
  { id: "seller", name: "Seller Campaigns", count: 2 },
  { id: "past", name: "Past Clients", count: 3 },
  { id: "commercial", name: "Commercial", count: 2 },
] as const;

export const STATUS_BADGE: Record<
  CampaignLibraryStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-champagne text-taupe" },
  queued: { label: "Queued", className: "bg-violet-100 text-violet-800" },
  sending: { label: "Sending", className: "bg-sky-100 text-sky-900" },
  sent: { label: "Active", className: "bg-sage-light text-emerald-muted" },
  partial: { label: "Paused", className: "bg-amber-100 text-amber-900" },
  failed: { label: "Paused", className: "bg-amber-100 text-amber-900" },
};

const CHANNEL_ICON: Record<string, string> = {
  email: "mail",
  sms: "sms",
  voicemail: "voicemail",
  callback: "phone_callback",
  avatar_video: "videocam",
  retargeting: "ads_click",
};

export function heroImageForIndex(index: number): string {
  return CAMPAIGN_HERO_IMAGES[index % CAMPAIGN_HERO_IMAGES.length];
}

export function heroImageForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 1)) % 997;
  return heroImageForIndex(hash);
}

export function templateForCampaignName(name: string) {
  return PRODUCT_CAMPAIGN_TEMPLATES.find(
    (t) => t.name.toLowerCase() === name.toLowerCase(),
  );
}

export function channelsFromTemplate(name: string): CampaignStepType[] {
  const tpl = templateForCampaignName(name);
  if (!tpl) return ["email", "sms", "voicemail"];
  const seen = new Set<CampaignStepType>();
  for (const step of tpl.steps) {
    if (step.type !== "retargeting") seen.add(step.type);
  }
  return [...seen];
}

export function channelIcon(type: CampaignStepType | string): string {
  return CHANNEL_ICON[type] ?? "campaign";
}

export function demoContactCount(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  return 40 + (hash % 200);
}

export function formatLastEdited(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}
