"use client";

import Link from "next/link";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { useEffect, useState } from "react";

type PulseCard = {
  badge: "Trend" | "Performance" | "Tip";
  headline: string;
  body: string;
};

const MONTH_TRENDS: { headline: string; body: string }[] = [
  {
    headline: "Winter buyers are still touring",
    body: "Serious shoppers don’t pause in Q1 — a strong moment to re-engage cold leads with a market snapshot.",
  },
  {
    headline: "Spring luxury market heating up",
    body: "Buyer demand for higher-end listings typically rises this quarter — re-engage past clients now.",
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

const TIPS = [
  {
    headline: "Refresh your listing photos",
    body: "Twilight photography increases listing views by up to 30%. Consider a reshoot before your next launch.",
  },
  {
    headline: "Speed-to-lead still wins",
    body: "A same-day SMS plus ringless voicemail beats a next-morning email. Use the Speed to Lead template.",
  },
  {
    headline: "Ask one question in SMS",
    body: "Short, single-question texts get more replies than long updates. Save the details for email.",
  },
];

type CampaignRow = { id: string; name: string; status: string; provider: string };

export function MarketingPulse() {
  const [cards, setCards] = useState<PulseCard[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);

  useEffect(() => {
    const quarter = Math.floor(new Date().getMonth() / 3);
    const tip = TIPS[new Date().getDate() % TIPS.length];
    const trend = MONTH_TRENDS[quarter];

    void (async () => {
      let performance: PulseCard = {
        badge: "Performance",
        headline: "Your pipeline is ready",
        body: "Launch a welcome or listing-alert campaign to start tracking opens, clicks, and replies here.",
      };

      try {
        const [analyticsRes, campaignsRes] = await Promise.all([
          fetch("/api/analytics?range=30d"),
          fetch("/api/campaigns"),
        ]);
        const analytics = await analyticsRes.json().catch(() => ({}));
        const campaignData = await campaignsRes.json().catch(() => ({}));
        setCampaigns((campaignData.campaigns ?? []).slice(0, 4));

        const snapshot = analytics.snapshot ?? analytics;
        const kpis = snapshot?.kpis as { label?: string; value?: string }[] | undefined;
        const openKpi = kpis?.find((k) => /open|reply|deliver/i.test(k.label ?? ""));
        const campaignCount = (campaignData.campaigns ?? []).length as number;
        if (openKpi?.value) {
          performance = {
            badge: "Performance",
            headline: `${openKpi.label ?? "Campaign results"}`,
            body: `Last 30 days: ${openKpi.value}. Keep the cadence going while leads are warm.`,
          };
        } else if (campaignCount > 0) {
          performance = {
            badge: "Performance",
            headline: `${campaignCount} campaign${campaignCount === 1 ? "" : "s"} in motion`,
            body: "Open campaigns to check delivery. Email, SMS, and ringless voicemail all report here.",
          };
        }
      } catch {
        // keep defaults
      }

      setCards([
        { badge: "Trend", ...trend },
        performance,
        { badge: "Tip", ...tip },
      ]);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-serif text-[26px] font-semibold text-ink">Marketing Pulse</h2>
          <Icon name="trending_up" className="text-rose-gold-deep" />
        </div>
        <div className="space-y-3">
          {(cards.length ? cards : [{ badge: "Trend" as const, headline: "Loading pulse…", body: "" }]).map(
            (card) => (
              <LuxuryCard key={card.headline} padding="md">
                <span className="inline-flex rounded-full bg-[#f4e6dc] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-rose-gold-deep">
                  {card.badge}
                </span>
                <p className="mt-3 text-[17px] font-semibold text-ink">{card.headline}</p>
                {card.body ? (
                  <p className="mt-1 text-[14px] leading-relaxed text-slate-text">{card.body}</p>
                ) : null}
              </LuxuryCard>
            ),
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-[26px] font-semibold text-ink">Recent Campaigns</h2>
          <Link href="/dashboard/campaigns" className="text-[14px] font-medium text-rose-gold-deep hover:underline">
            View all
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <LuxuryCard>
            <p className="text-[14px] text-slate-text">
              No campaigns yet.{" "}
              <Link href="/dashboard/campaigns" className="font-medium text-rose-gold-deep hover:underline">
                Create one
              </Link>{" "}
              to see them here.
            </p>
          </LuxuryCard>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link href={`/dashboard/campaigns/${c.id}`}>
                  <LuxuryCard padding="md" className="transition-shadow hover:shadow-card">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-rose-gold/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-rose-gold-deep">
                        {c.provider === "slybroadcast" ? "Ringless Voicemail" : c.provider}
                      </span>
                      <span className="rounded-full border border-outline-variant/20 px-2.5 py-0.5 text-[11px] font-medium text-taupe">
                        {c.status}
                      </span>
                    </div>
                    <p className="mt-3 font-serif text-[22px] font-semibold text-ink">{c.name}</p>
                  </LuxuryCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
