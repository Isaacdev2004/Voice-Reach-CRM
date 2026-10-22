"use client";

import Link from "next/link";
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
  formatPipelineValueDisplay,
  sumActiveLeadBudgets,
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
  const pipelineBudgets = useMemo(
    () => (loading ? null : sumActiveLeadBudgets(contacts)),
    [loading, contacts],
  );

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
        icon: "real_estate_agent",
        tone: "sage",
      },
      {
        id: "pipeline",
        label: "Active Lead Budgets",
        value:
          loading || pipelineBudgets === null
            ? "…"
            : formatPipelineValueDisplay(pipelineBudgets),
        change: undefined,
        changeTone: "neutral",
        detail:
          loading || pipelineBudgets === null
            ? undefined
            : pipelineBudgets.withBudget === 0
              ? `${pipelineBudgets.activeLeadCount} active — add budgets on contacts`
              : `${pipelineBudgets.withBudget} of ${pipelineBudgets.activeLeadCount} active with budget on file`,
        icon: "payments",
        tone: "rose",
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
    pipelineBudgets,
  ]);

  return (
    <div className={DASHBOARD_PAGE_BODY}>
      <div className="dashboard-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch xl:grid-cols-4">
        {kpis.map((kpi) => (
          kpi.id === "opportunities" ? (
            <Link key={kpi.id} href="/dashboard/contacts" className="dashboard-opportunity-link" aria-label="Opportunities — view Contacts">
              <KpiCard {...kpi} compact luxury />
            </Link>
          ) : <KpiCard key={kpi.id} {...kpi} compact luxury />
        ))}
      </div>

      <div className="dashboard-editorial-grid">
        <div className="dashboard-pulse-column">
          <MarketingPulse />
        </div>
        <div className="dashboard-recommendations-column">
          <DashboardRecommendedForYou />
        </div>
      </div>

      <DashboardRecentCampaignsTable />
    </div>
  );
}
