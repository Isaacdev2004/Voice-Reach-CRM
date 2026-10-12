"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  channelIcon,
  STATUS_BADGE,
  type CampaignLibraryStatus,
} from "@/lib/campaigns/library-ui";
import type { CampaignStepType } from "@/lib/crm/types";

export type CampaignLibraryCardProps = {
  href: string;
  name: string;
  description: string;
  imageSrc: string;
  status: CampaignLibraryStatus;
  pinned?: boolean;
  contactCount: number;
  durationLabel: string;
  lastEdited: string;
  channels: CampaignStepType[];
  onClick?: () => void;
  className?: string;
};

export function CampaignLibraryCard({
  href,
  name,
  description,
  imageSrc,
  status,
  pinned = false,
  contactCount,
  durationLabel,
  lastEdited,
  channels,
  onClick,
  className,
}: CampaignLibraryCardProps) {
  const badge = STATUS_BADGE[status];
  const inner = (
    <>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-champagne">
        <Image src={imageSrc} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="(max-width: 768px) 100vw, 320px" />
        <span
          className={cn(
            "absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4 pt-3">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 font-serif text-[17px] font-semibold leading-snug text-ink group-hover:text-rose-gold-deep">
            {name}
          </h3>
          {pinned ? (
            <Icon name="push_pin" className="shrink-0 text-[18px] text-rose-gold-deep" filled />
          ) : null}
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-text">{description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {channels.slice(0, 5).map((ch) => (
            <span
              key={ch}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-champagne/80 text-taupe"
              title={ch}
            >
              <Icon name={channelIcon(ch)} className="text-[16px]" />
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant/10 pt-3 text-[11px] text-taupe">
          <span>{contactCount.toLocaleString()} contacts</span>
          <span className="truncate">{durationLabel}</span>
        </div>
        <p className="mt-1 text-[11px] text-taupe">Last edited {lastEdited}</p>
      </div>
    </>
  );

  const cardClass = cn(
    "group flex h-full flex-col overflow-hidden rounded-2xl border border-outline-variant/15 bg-ivory shadow-sm transition-shadow hover:shadow-card",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cardClass, "text-left")}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}

export function CampaignLibraryListRow({
  href,
  name,
  status,
  lastEdited,
  contactCount,
}: Pick<CampaignLibraryCardProps, "href" | "name" | "status" | "lastEdited" | "contactCount">) {
  const badge = STATUS_BADGE[status];
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-2xl border border-outline-variant/15 bg-ivory px-4 py-3 transition-shadow hover:shadow-nav"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{name}</p>
        <p className="text-[12px] text-taupe">
          {contactCount.toLocaleString()} contacts · Last edited {lastEdited}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
          badge.className,
        )}
      >
        {badge.label}
      </span>
    </Link>
  );
}
