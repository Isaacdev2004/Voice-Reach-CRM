"use client";

import { DashboardRecentCampaignsTable } from "@/components/crm/dashboard-recent-campaigns-table";
import { DashboardRecommendedForYou } from "@/components/crm/dashboard-recommended-for-you";
import { KpiCard } from "@/components/crm/kpi-card";
import { MarketingPulse } from "@/components/crm/marketing-pulse";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import {
  campaignsLaunchedThisMonth,
  contactsAddedThisMonth,
  countActiveCampaigns,
  countSentCampaigns,
  monthOverMonthContactChange,
  newOpportunitiesThisWeek,
  type CampaignRow,
} from "@/lib/dashboard/home-kpis";
import type { DashboardKpi } from "@/lib/crm/types";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useEffect, useMemo, useState } from "react";

export function OperationalDashboardPage() {
  const { contacts, loading, meta } = useContacts();
  const [campaigns, setCampaigns] = useState<CampaignRow[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json().catch(() => ({}));
        setCampaigns((data.campaigns ?? []) as CampaignRow[]);
      } catch {
        setCampaigns([]);
      }
    })();
  }, []);

  const total = meta?.total ?? contacts.length;
  const activeLeads = meta?.counts?.activeLead ?? 0;
  const addedThisMonth = contactsAddedThisMonth(contacts);
  const sentCount = campaigns ? countSentCampaigns(campaigns) : null;
  const activeCount = campaigns ? countActiveCampaigns(campaigns) : null;
  const launchedThisMonth = campaigns ? campaignsLaunchedThisMonth(campaigns) : 0;
  const newThisWeek = newOpportunitiesThisWeek(contacts, activeLeads);

  const kpis: DashboardKpi[] = useMemo(() => {
    const contactChange = loading ? undefined : monthOverMonthContactChange(contacts);
    const monthDetail =
      loading ? undefined : addedThisMonth === 0 ? "No new contacts this month" : `+${addedThisMonth} this month`;

    const campaignDetail =
      campaigns === null
        ? undefined
        : activeCount === 0
          ? "No campaigns in progress"
          : `${activeCount} active ${activeCount === 1 ? "campaign" : "campaigns"}`;

    const campaignChange =
      campaigns === null
        ? undefined
        : launchedThisMonth > 0
          ? `+${launchedThisMonth} launched this month`
          : undefined;

    const oppDetail =
      loading
        ? undefined
        : newThisWeek === 0
          ? `${activeLeads} active in pipeline`
          : `${newThisWeek} new this week`;

    return [
      {
        id: "contacts",
        label: "Total Contacts",
        value: loading ? "…" : total.toLocaleString(),
        change: contactChange,
        changeTone: contactChange?.startsWith("-")
          ? "down"
          : contactChange?.startsWith("Flat")
            ? "neutral"
            : "up",
        detail: monthDetail,
        icon: "group",
        tone: "default",
        spark: contactChange ? "line" : undefined,
      },
      {
        id: "campaigns-sent",
        label: "Campaigns Sent",
        value: sentCount === null ? "…" : String(sentCount),
        change: campaignChange,
        changeTone: "up",
        detail: campaignDetail,
        icon: "campaign",
        tone: "bronze",
      },
      {
        id: "opportunities",
        label: "Opportunities",
        value: loading ? "…" : String(activeLeads),
        change: undefined,
        detail: oppDetail,
        icon: "trending_up",
        tone: "sage",
        spark: activeLeads > 0 ? "bars" : undefined,
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
  }, [
    loading,
    total,
    contacts,
    campaigns,
    sentCount,
    activeCount,
    launchedThisMonth,
    addedThisMonth,
    activeLeads,
    newThisWeek,
  ]);

  return (
    <div className={DASHBOARD_PAGE_BODY}>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} {...kpi} compact />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
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
