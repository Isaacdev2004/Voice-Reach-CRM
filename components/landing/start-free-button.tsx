"use client";

import Link from "next/link";
import type { PlanId } from "@/lib/billing/plans";
import { primaryTrialCta } from "@/lib/marketing/site-offer";
import { trackMarketingEvent } from "@/lib/marketing/track";

type StartFreeButtonProps = {
  className?: string;
  variant?: "primary" | "light" | "outline";
  label?: string;
  location?: string;
  planId?: PlanId;
  showArrow?: boolean;
};

export function StartFreeButton({
  className = "",
  variant = "primary",
  label = primaryTrialCta(),
  location = "landing",
  planId = "growth",
  showArrow = false,
}: StartFreeButtonProps) {
  const styles =
    variant === "light"
      ? "bg-ivory text-ink hover:opacity-95"
      : variant === "outline"
        ? "border-2 border-rose-gold bg-transparent text-rose-gold-deep hover:bg-rose-gold/5"
        : "bg-rose-gold text-ivory shadow-card hover:opacity-95";

  return (
    <Link
      href={`/checkout?plan=${planId}`}
      onClick={() =>
        trackMarketingEvent("start_trial_click", { location, label: label.toLowerCase(), plan: planId })
      }
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-8 py-3 text-[14px] font-bold uppercase tracking-wide transition-all active:scale-[0.98] ${styles} ${className}`}
    >
      <span>{label}</span>
      {showArrow ? (
        <span aria-hidden className="text-[1.05em] leading-none">
          →
        </span>
      ) : null}
    </Link>
  );
}
