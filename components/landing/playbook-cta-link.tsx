"use client";

import Link from "next/link";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { trackMarketingEvent } from "@/lib/marketing/track";

type PlaybookCtaLinkProps = {
  className?: string;
  location?: string;
  label?: string;
};

export function PlaybookCtaLink({
  className = "",
  location = "landing",
  label = SITE_OFFER.playbook.cta,
}: PlaybookCtaLinkProps) {
  return (
    <Link
      href={SITE_OFFER.playbook.path}
      onClick={() => trackMarketingEvent("cta_click", { location, label: "playbook" })}
      className={`inline-flex items-center justify-center rounded-full border border-outline-variant/25 bg-ivory/80 px-6 py-3 text-[14px] font-semibold text-ink transition-colors hover:border-rose-gold/40 hover:bg-ivory ${className}`}
    >
      {label}
    </Link>
  );
}
