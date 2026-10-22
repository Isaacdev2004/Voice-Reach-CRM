"use client";

import Image from "next/image";
import Link from "next/link";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  DASHBOARD_SECTION_CARD,
  DASHBOARD_SECTION_HEADER,
  DASHBOARD_SECTION_SUBTITLE,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard/layout";
import { getRotatingResourceArticle } from "@/lib/seo/resource-articles";
import { useEffect, useState, type ReactNode } from "react";

type PulseCard = {
  badge: "Trending" | "Performance" | "Insight";
  headline: string;
  body: string;
  href?: string;
  meta?: string;
};

type ResponseLift = {
  headline: string;
  subline: string;
  href: string;
};

const MONTH_TRENDS: (PulseCard & { href: string; meta?: string })[] = [
  {
    badge: "Trending",
    headline: "Winter buyers are still touring",
    body: "Serious shoppers don’t pause in Q1 — re-engage cold leads with a market snapshot.",
    href: "/dashboard/campaigns#campaign-builder",
    meta: "Open campaign builder →",
  },
  {
    badge: "Trending",
    headline: "Spring luxury market heating up",
    body: "Buyer demand for higher-end listings typically rises — re-engage past clients now.",
    href: "/dashboard/campaigns",
    meta: "Browse playbooks →",
  },
  {
    badge: "Trending",
    headline: "Summer listing photos matter more",
    body: "Longer days and more showings — refresh listing visuals before your next launch.",
    href: "/dashboard/properties",
    meta: "Open Property Finder →",
  },
  {
    badge: "Trending",
    headline: "Fall is for past-client check-ins",
    body: "Relocation and school-year moves pick up. A short voicemail or SMS keeps you top of mind.",
    href: "/dashboard/campaigns",
    meta: "Install a re-engagement playbook →",
  },
];

function PulseBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-champagne/90 px-3 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-rose-gold-deep">
      {children}
    </span>
  );
}

function PulseTile({
  href,
  className,
  newTab,
  children,
}: {
  href?: string;
  className?: string;
  newTab?: boolean;
  children: ReactNode;
}) {
  const styles = cn(
    "dashboard-pulse-tile flex h-full min-h-[140px] flex-col rounded-xl border border-outline-variant/12 bg-ivory p-4 transition-[box-shadow,border-color] duration-200 hover:border-outline-variant/20 hover:shadow-[0_8px_24px_-12px_rgba(26,22,18,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-gold/40 motion-reduce:transition-none",
    className,
  );
  if (href) {
    if (newTab || href.startsWith("http")) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cn("block", styles)}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cn("block", styles)}>
        {children}
      </Link>
    );
  }
  return <div className={styles}>{children}</div>;
}

function DeliveryDonut({ percent }: { percent: number | null }) {
  const p = Math.min(100, Math.max(0, percent ?? 0));
  return (
    <div
      className="relative h-[72px] w-[72px] shrink-0 rounded-full"
      style={{
        background: `conic-gradient(#b38c69 ${p * 3.6}deg, #e8e0d8 ${p * 3.6}deg)`,
      }}
      aria-hidden
    >
      <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-ivory">
        <span className="text-[20px] font-semibold tabular-nums text-ink">
          {percent !== null ? `${Math.round(p)}%` : "—"}
        </span>
      </div>
    </div>
  );
}

function parsePercentValue(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace(/%/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

export function MarketingPulse() {
  const [cards, setCards] = useState<PulseCard[]>([]);
  const [deliveryRate, setDeliveryRate] = useState<number | null>(null);
  const [rangeLabel, setRangeLabel] = useState("Last 30 days");
  const [responseLift, setResponseLift] = useState<ResponseLift>({
    headline: "—",
    subline: "Engagement vs prior 30 days",
    href: "/dashboard/analytics",
  });
  const [hasLiveAnalytics, setHasLiveAnalytics] = useState(false);

  useEffect(() => {
    const quarter = Math.floor(new Date().getMonth() / 3);
    const trend = MONTH_TRENDS[quarter];
    const article = getRotatingResourceArticle();

    void (async () => {
      let performance: PulseCard = {
        badge: "Performance",
        headline: "Delivery success rate",
        body: "Launch a campaign to start tracking delivery here.",
        href: "/dashboard/campaigns#campaign-builder",
        meta: "Create a campaign →",
      };
      let rate: number | null = null;

      try {
        const analyticsRes = await fetch("/api/analytics?range=30d");
        const analytics = (await analyticsRes.json().catch(() => ({}))) as {
          kpis?: { id?: string; label?: string; value?: string; change?: string }[];
          rangeLabel?: string;
          fromLiveData?: boolean;
        };

        setRangeLabel(analytics.rangeLabel ?? "Last 30 days");
        setHasLiveAnalytics(Boolean(analytics.fromLiveData));

        const kpis = analytics.kpis ?? [];
        const deliveryKpi = kpis.find((k) => k.id === "delivery" || /delivery/i.test(k.label ?? ""));
        if (deliveryKpi?.value) {
          const num = parsePercentValue(deliveryKpi.value);
          if (num !== null) rate = num;
          performance = {
            badge: "Performance",
            headline: deliveryKpi.label ?? "Delivery success rate",
            body: `Last 30 days: ${deliveryKpi.value}. Tap for full analytics.`,
            href: "/dashboard/analytics?range=30d",
            meta: "View analytics →",
          };
        }

        const engagementKpi = kpis.find((k) => k.id === "conversion" || /engagement rate/i.test(k.label ?? ""));
        if (engagementKpi) {
          const change = engagementKpi.change?.trim();
          const showChange =
            change && change !== "-" && change !== "—" && !/^[\s-]+$/.test(change);
          setResponseLift({
            headline: showChange ? change.replace(/\s+/g, "") : engagementKpi.value ?? "—",
            subline: showChange
              ? "Engagement change vs prior 30 days"
              : (engagementKpi.label ?? "Engagement rate"),
            href: "/dashboard/analytics?range=30d",
          });
        }
      } catch {
        // keep defaults
      }

      setDeliveryRate(rate);
      setCards([
        trend,
        performance,
        {
          badge: "Insight",
          headline: article.title,
          body: article.description,
          href: article.path,
          meta: `Read guide · ${article.readTimeMinutes} min`,
        },
      ]);
    })();
  }, []);

  const trendCard = cards.find((c) => c.badge === "Trending");
  const perfCard = cards.find((c) => c.badge === "Performance");
  const insightCard = cards.find((c) => c.badge === "Insight");

  return (
    <LuxuryCard padding="md" className={cn("h-full", DASHBOARD_SECTION_CARD)}>
      <div className={DASHBOARD_SECTION_HEADER}>
        <div>
          <h2 className={cn(DASHBOARD_SECTION_TITLE, "dashboard-section-heading")}><Icon name="trending_up" />Marketing Pulse</h2>
          <p className={DASHBOARD_SECTION_SUBTITLE}>
            Trends, performance, and curated insights for your outreach
          </p>
        </div>
        <Link
          href="/dashboard/analytics?range=30d"
          className="flex items-center gap-1.5 rounded-full border border-outline-variant/15 bg-cream/60 px-3 py-1.5 text-[11px] font-medium text-taupe transition-colors hover:border-rose-gold/25 hover:text-rose-gold-deep"
        >
          <Icon name="calendar_today" className="text-[15px] text-rose-gold-deep" />
          {rangeLabel}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PulseTile href={trendCard?.href} className="dashboard-pulse-trend">
          <div className="dashboard-pulse-trend-copy">
          {trendCard ? (
            <>
              <PulseBadge>{trendCard.badge}</PulseBadge>
              <p className="mt-2.5 text-[15px] font-semibold leading-snug text-ink">{trendCard.headline}</p>
              {trendCard.body ? (
                <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-slate-text">{trendCard.body}</p>
              ) : null}
              {trendCard.meta ? (
                <p className="mt-auto pt-2 text-[12px] font-medium text-rose-gold-deep">{trendCard.meta}</p>
              ) : null}
            </>
          ) : (
            <p className="text-taupe">Loading…</p>
          )}
          </div>
          <div className="dashboard-pulse-trend-photo">
            <Image src="/brand/heroes/properties.jpg" alt="Sunlit luxury residence surrounded by greenery" fill className="object-cover" sizes="(max-width: 767px) 100vw, 400px" />
            {hasLiveAnalytics && responseLift.headline !== "—" ? (
              <div className="dashboard-pulse-response">
                <strong>{responseLift.headline}</strong>
                <p>{responseLift.subline}</p>
              </div>
            ) : null}
          </div>
        </PulseTile>

        <PulseTile href={perfCard?.href}>
          {perfCard ? (
            <>
              <PulseBadge>{perfCard.badge}</PulseBadge>
              <div className="mt-2.5 flex flex-1 items-center gap-3">
                <DeliveryDonut percent={hasLiveAnalytics ? deliveryRate : null} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{perfCard.headline}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-text line-clamp-3">
                    {perfCard.body}
                  </p>
                  {perfCard.meta ? (
                    <p className="mt-1.5 text-[12px] font-medium text-rose-gold-deep">{perfCard.meta}</p>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </PulseTile>


        {insightCard ? (
          <PulseTile href={insightCard.href} newTab className="bg-champagne/25">
            <PulseBadge>{insightCard.badge}</PulseBadge>
            <p className="mt-2.5 text-[15px] font-semibold leading-snug text-ink">{insightCard.headline}</p>
            <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-slate-text line-clamp-4">
              {insightCard.body}
            </p>
            {insightCard.meta ? (
              <p className="mt-auto pt-2 text-[12px] font-medium text-rose-gold-deep">{insightCard.meta}</p>
            ) : null}
          </PulseTile>
        ) : null}
      </div>
    </LuxuryCard>
  );
}
