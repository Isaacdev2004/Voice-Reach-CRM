import type { ActivityTone } from "@/lib/activity/types";
import { cn } from "@/lib/cn";

export function toneIconClass(tone: ActivityTone): string {
  switch (tone) {
    case "success":
      return "bg-sage-light text-emerald-muted";
    case "warning":
      return "bg-champagne text-bronze";
    case "error":
      return "bg-error/10 text-error";
    case "accent":
      return "bg-rose-gold/20 text-rose-gold-deep";
    default:
      return "bg-champagne text-taupe";
  }
}

export function toneTitleClass(tone: ActivityTone, alert?: boolean): string {
  if (alert || tone === "error") return "text-error";
  if (tone === "accent") return "text-rose-gold-deep";
  return "text-ink";
}

export function activityRowClass(alert?: boolean, unread?: boolean): string {
  return cn(
    "flex cursor-pointer gap-4 px-5 py-4 transition-colors hover:bg-champagne/50",
    alert && "bg-error/[0.04]",
    unread && "border-l-2 border-rose-gold-deep bg-ivory/80",
  );
}
