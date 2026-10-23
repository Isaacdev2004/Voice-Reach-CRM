import type { CampaignStepType } from "@/lib/crm/types";

export type CampaignLibraryStatus =
  | "draft"
  | "queued"
  | "sending"
  | "sent"
  | "partial"
  | "failed";

export const STATUS_BADGE: Record<
  CampaignLibraryStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-champagne text-taupe" },
  queued: { label: "Queued", className: "bg-violet-100 text-violet-800" },
  sending: { label: "Sending", className: "bg-sky-100 text-sky-900" },
  sent: { label: "Sent", className: "bg-sage-light text-emerald-muted" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-900" },
  failed: { label: "Failed", className: "bg-amber-100 text-amber-900" },
};

const CHANNEL_ICON: Record<string, string> = {
  email: "mail",
  sms: "sms",
  voicemail: "voicemail",
  callback: "phone_callback",
  avatar_video: "videocam",
  retargeting: "ads_click",
};

export function channelIcon(type: CampaignStepType | string): string {
  return CHANNEL_ICON[type] ?? "campaign";
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
