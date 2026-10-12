"use client";

import Image from "next/image";
import Link from "next/link";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { getRotatingResourceArticle } from "@/lib/seo/resource-articles";
import { useEffect, useState, type ReactNode } from "react";

type PulseCard = {
  badge: "Trending" | "Performance" | "Insight";
  headline: string;
  body: string;
  href?: string;
  meta?: string;
};

const MONTH_TRENDS: { headline: string; body: string }[] = [
  {
    headline: "Winter buyers are still touring",
    body: "Serious shoppers don’t pause in Q1 — re-engage cold leads with a market snapshot.",
  },
  {
    headline: "Spring luxury market heating up",
    body: "Buyer demand for higher-end listings typically rises — re-engage past clients now.",
  },
  {
    headline: "Summer listing photos matter more",
    body: "Longer days and more showings — refresh listing visuals before your next launch.",
  },
  {
    headline: "Fall is for past-client check-ins",
    body: "Relocation and school-year moves pick up. A short voicemail or SMS keeps you top of mind.",
  },
];

function PulseBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-[#f4e6dc] px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-gold-deep">
      {children}
    </span>
  );
}

function DeliveryDonut({ percent }: { percent: number }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div
      className="relative mx-auto h-[88px] w-[88px] rounded-full"
      style={{
        background: `conic-gradient(var(--color-emerald-muted, #5c8a6a) ${p * 3.6}deg, #e8e0d8 ${p * 3.6}deg)`,
      }}
      aria-hidden
    >
      <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-ivory">
        <span className="font-serif text-[22px] font-semibold text-ink">{Math.round(p)}%</span>
      </div>
    </div>
  );
}

export function MarketingPulse() {
  const [cards, setCards] = useState<PulseCard[]>([]);
  const [deliveryRate, setDeliveryRate] = useState(92);
  const [rangeLabel, setRangeLabel] = useState("Last 30 days");

  useEffect(() => {
    const quarter = Math.floor(new Date().getMonth() / 3);
    const trend = MONTH_TRENDS[quarter];
    const article = getRotatingResourceArticle();

    void (async () => {
      let performance: PulseCard = {
        badge: "Performance",
        headline: "Delivery success rate",
        body: "Launch a welcome or listing-alert campaign to start tracking delivery here.",
      };
      let rate = 92;

      try {
        const analyticsRes = await fetch("/api/analytics?range=30d");
        const analytics = await analyticsRes.json().catch(() => ({}));
        const snapshot = analytics.snapshot ?? analytics;
        setRangeLabel(snapshot.rangeLabel ?? "Last 30 days");

        const kpis = snapshot?.kpis as { label?: string; value?: string }[] | undefined;
        const deliveryKpi = kpis?.find((k) => /delivery/i.test(k.label ?? ""));
        if (deliveryKpi?.value) {
          const num = parseFloat(deliveryKpi.value);
          if (!Number.isNaN(num)) rate = num;
          performance = {
            badge: "Performance",
            headline: deliveryKpi.label ?? "Delivery success rate",
            body: `Last 30 days: ${deliveryKpi.value}. Keep the cadence going while leads are warm.`,
          };
        }
      } catch {
        // keep defaults
      }

      setDeliveryRate(rate);
      setCards([
        { badge: "Trending", ...trend },
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
    <LuxuryCard padding="lg" className="h-full">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-[26px] font-semibold text-ink">Marketing Pulse</h2>
          <p className="mt-1 text-[14px] text-slate-text">
            Key trends and opportunities across your outreach
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-outline-variant/20 bg-cream/40 px-3 py-1.5 text-[12px] font-medium text-taupe">
          <Icon name="calendar_today" className="text-[16px] text-rose-gold-deep" />
          {rangeLabel}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-outline-variant/12 bg-champagne/25 p-5">
          {trendCard ? (
            <>
              <PulseBadge>{trendCard.badge}</PulseBadge>
              <p className="mt-3 text-[16px] font-semibold leading-snug text-ink">{trendCard.headline}</p>
              {trendCard.body ? (
                <p className="mt-2 text-[13px] leading-relaxed text-slate-text">{trendCard.body}</p>
              ) : null}
            </>
          ) : (
            <p className="text-taupe">Loading…</p>
          )}
        </div>

        <div className="rounded-2xl border border-outline-variant/12 bg-ivory p-5">
          {perfCard ? (
            <>
              <PulseBadge>{perfCard.badge}</PulseBadge>
              <div className="mt-3 flex items-center gap-4">
                <DeliveryDonut percent={deliveryRate} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">{perfCard.headline}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-text line-clamp-3">
                    {perfCard.body}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="relative min-h-[140px] overflow-hidden rounded-2xl sm:col-span-1">
          <Image
            src="/brand/heroes/properties.jpg"
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 320px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ivory/80">
              Response lift
            </p>
            <p className="font-serif text-[28px] font-semibold text-ivory">+32%</p>
            <p className="text-[12px] text-ivory/85">Avg. reply rate vs. last month</p>
          </div>
        </div>

        {insightCard ? (
          insightCard.href ? (
            <Link
              href={insightCard.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-outline-variant/12 bg-cream/50 p-5 transition-shadow hover:shadow-card"
            >
              <PulseBadge>{insightCard.badge}</PulseBadge>
              <p className="mt-3 text-[16px] font-semibold text-ink">{insightCard.headline}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-text line-clamp-3">
                {insightCard.body}
              </p>
              {insightCard.meta ? (
                <p className="mt-3 text-[13px] font-medium text-rose-gold-deep">{insightCard.meta}</p>
              ) : null}
            </Link>
          ) : (
            <div className="rounded-2xl border border-outline-variant/12 bg-cream/50 p-5">
              <PulseBadge>{insightCard.badge}</PulseBadge>
              <p className="mt-3 text-[16px] font-semibold text-ink">{insightCard.headline}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-text">{insightCard.body}</p>
            </div>
          )
        ) : null}
      </div>
    </LuxuryCard>
  );
}
