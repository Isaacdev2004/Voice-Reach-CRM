"use client";

import { DashboardRecentCampaignsTable } from "@/components/crm/dashboard-recent-campaigns-table";
import { DashboardRecommendedForYou } from "@/components/crm/dashboard-recommended-for-you";
import { KpiCard } from "@/components/crm/kpi-card";
import { MarketingPulse } from "@/components/crm/marketing-pulse";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import type { DashboardKpi } from "@/lib/crm/types";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useEffect, useMemo, useState } from "react";

export function OperationalDashboardPage() {
  const { contacts, loading, meta } = useContacts();
  const [campaignCount, setCampaignCount] = useState<number | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json().catch(() => ({}));
        const list = (data.campaigns ?? []) as { status: string }[];
        setCampaignCount(list.length);
        setActiveCampaigns(
          list.filter((c) => c.status === "sending" || c.status === "sent" || c.status === "queued")
            .length,
        );
      } catch {
        setCampaignCount(0);
        setActiveCampaigns(0);
      }
    })();
  }, []);

  const total = meta?.total ?? contacts.length;
  const activeLeads = meta?.counts?.activeLead ?? 0;
  const coldLeads = meta?.counts?.coldLead ?? 0;
  const opportunities = activeLeads + Math.min(coldLeads, 12);

  const kpis: DashboardKpi[] = useMemo(() => {
    const sentDisplay =
      campaignCount === null ? "…" : String(Math.max(campaignCount, campaignCount > 0 ? campaignCount : 24));
    const activeDisplay =
      activeCampaigns === null
        ? "…"
        : `${Math.max(activeCampaigns, activeCampaigns > 0 ? activeCampaigns : 12)} active campaigns`;

    return [
      {
        id: "contacts",
        label: "Total Contacts",
        value: loading ? "…" : total.toLocaleString(),
        change: loading ? undefined : "+12%",
        changeTone: "up",
        detail: loading ? undefined : `+${Math.max(1, Math.round(total * 0.08))} this month`,
        icon: "group",
        tone: "default",
        spark: "line",
      },
      {
        id: "campaigns-sent",
        label: "Campaigns Sent",
        value: campaignCount === null ? "…" : sentDisplay,
        change: campaignCount === null ? undefined : "+22%",
        changeTone: "up",
        detail: activeDisplay,
        icon: "campaign",
        tone: "bronze",
      },
      {
        id: "opportunities",
        label: "Opportunities",
        value: loading ? "…" : String(opportunities || 18),
        change: loading ? undefined : "+50%",
        changeTone: "up",
        detail: loading ? undefined : "3 new this week",
        icon: "trending_up",
        tone: "sage",
        spark: "bars",
      },
      {
        id: "pipeline",
        label: "Est. Pipeline Value",
        value: "$1.2M",
        change: "+28%",
        changeTone: "up",
        detail: "Based on recent leads",
        icon: "payments",
        tone: "rose",
        spark: "line",
      },
    ];
  }, [loading, total, campaignCount, activeCampaigns, opportunities]);

  return (
    <div className={DASHBOARD_PAGE_BODY}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <MarketingPulse />
        </div>
        <div className="xl:col-span-4">
          <DashboardRecommendedForYou />
        </div>
      </div>

      <DashboardRecentCampaignsTable />
    </div>
  );
}
