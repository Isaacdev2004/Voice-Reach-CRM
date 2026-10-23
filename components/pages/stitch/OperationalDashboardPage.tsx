"use client";
import { DashboardBriefing } from "@/components/crm/dashboard-briefing";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { DashboardRecentCampaignsTable } from "@/components/crm/dashboard-recent-campaigns-table";
import { DashboardRecommendedForYou } from "@/components/crm/dashboard-recommended-for-you";
import { KpiCard } from "@/components/crm/kpi-card";
import { MarketingPulse } from "@/components/crm/marketing-pulse";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import {
  contactsAddedThisMonth,
  countActiveCampaigns,
  formatPipelineValueDisplay,
  sumActiveLeadBudgets,
  type CampaignRow,
} from "@/lib/dashboard/home-kpis";
import type { DashboardKpi } from "@/lib/crm/types";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useEffect, useMemo, useState } from "react";

export function OperationalDashboardPage() {
  const { user } = useUser();
  return <OwnerDashboard key={user?.id ?? "signed-out"} />;
}
function OwnerDashboard() {
  const { contacts, loading, meta, error } = useContacts();
  const [verifiedSent, setVerifiedSent] = useState<number | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[] | null>(null);
  const [campaignError, setCampaignError] = useState(false);
  const [version, setVersion] = useState(0);
  const [sentState, setSentState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");

  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1);
    window.addEventListener("focus", refresh);
    window.addEventListener("myari:activity-changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("myari:activity-changed", refresh);
    };
  }, []);
  useEffect(() => {
    setCampaignError(false);
    setSentState("loading");
    setVerifiedSent(null);
    setCampaigns(null);
    const controller = new AbortController();
    const options = {
      cache: "no-store" as const,
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    };
    void fetch("/api/campaigns/library", options)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.success === false || !Array.isArray(data.campaigns))
          throw Error();
        if (!controller.signal.aborted) setCampaigns(data.campaigns);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCampaignError(true);
      });
    void fetch("/api/analytics?range=all", options)
      .then(async (res) => {
        const evidence = await res.json();
        if (
          !controller.signal.aborted &&
          res.ok &&
          evidence.success !== false &&
          Number.isSafeInteger(evidence.confirmedSentCampaigns) &&
          evidence.confirmedSentCampaigns >= 0
        ) {
          setVerifiedSent(evidence.confirmedSentCampaigns);
          setSentState("ready");
        } else if (!controller.signal.aborted) setSentState("unavailable");
      })
      .catch(() => {
        if (!controller.signal.aborted) setSentState("unavailable");
      });
    return () => controller.abort();
  }, [version]);

  const total = meta?.total;
  const activeLeads = meta?.counts?.activeLead ?? 0;
  const addedThisMonth = contactsAddedThisMonth(contacts);
  const sentCount = verifiedSent;
  const activeCount = campaigns ? countActiveCampaigns(campaigns) : null;
  const pipelineBudgets = useMemo(
    () => (loading || error ? null : sumActiveLeadBudgets(contacts)),
    [loading, contacts, error],
  );

  const kpis: DashboardKpi[] = useMemo(() => {
    const contactChange = undefined; // No historical stage/total snapshots are stored.
    const monthDetail =
      loading || error
        ? undefined
        : `${addedThisMonth} current contacts added this month`;

    const campaignDetail =
      sentState === "loading"
        ? "Verifying sent receipts…"
        : sentState === "unavailable"
          ? "Sent evidence unavailable"
          : "Distinct campaigns with confirmed sends";

    const oppDetail =
      loading || error ? undefined : `${activeLeads} active in pipeline`;

    return [
      {
        id: "contacts",
        label: "Total Contacts",
        value: loading ? "…" : (total?.toLocaleString() ?? "—"),
        change: contactChange,
        changeTone: "neutral",
        detail: monthDetail,
        icon: "group",
        tone: "default",
      },
      {
        id: "campaigns-sent",
        label: "Campaigns Sent",
        value:
          sentState === "loading"
            ? "…"
            : sentCount === null
              ? "Unavailable"
              : String(sentCount),
        change: undefined,
        changeTone: "up",
        detail: campaignDetail,
        icon: "campaign",
        tone: "bronze",
      },
      {
        id: "opportunities",
        label: "Opportunities",
        value: loading ? "…" : error || !meta ? "—" : String(activeLeads),
        change: undefined,
        detail: oppDetail,
        icon: "real_estate_agent",
        tone: "sage",
      },
      {
        id: "pipeline",
        label: "Active Lead Budgets",
        value: loading
          ? "…"
          : pipelineBudgets === null
            ? "—"
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
    sentCount,
    sentState,
    addedThisMonth,
    activeLeads,
    pipelineBudgets,
    error,
    meta,
  ]);

  return (
    <div className={`${DASHBOARD_PAGE_BODY} dashboard-home-content`}>
      <div className="dashboard-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.id}
            href={
              kpi.id === "contacts"
                ? "/dashboard/contacts?segment=all"
                : kpi.id === "campaigns-sent"
                  ? "/dashboard/analytics?range=all"
                  : "/dashboard/contacts?segment=active-lead"
            }
            className="dashboard-opportunity-link dashboard-kpi-link"
            title={
              kpi.id === "campaigns-sent"
                ? "Distinct current campaigns with a real provider sent receipt. Earlier untracked sending is excluded."
                : undefined
            }
            aria-label={
              kpi.id === "opportunities"
                ? "Opportunities — view Contacts"
                : `${kpi.label} — view ${kpi.id === "campaigns-sent" ? "all-time analytics" : "Contacts"}`
            }
          >
            <KpiCard {...kpi} compact luxury />
          </Link>
        ))}
      </div>

      <div className="dashboard-active-campaigns">
        <Link href="/dashboard/campaigns?status=active">
          Active Campaigns:{" "}
          {campaignError
            ? "Unavailable"
            : activeCount === null
              ? "Verifying…"
              : activeCount}{" "}
          <span>Sending now · queued campaigns excluded →</span>
        </Link>
      </div>
      <div className="dashboard-business-grid">
        <div className="dashboard-work-column">
          <DashboardBriefing />
          <DashboardRecentCampaignsTable />
        </div>
        <div className="dashboard-insights-column">
          <div className="dashboard-pulse-column">
            <MarketingPulse />
          </div>
          <div className="dashboard-recommendations-column">
            <DashboardRecommendedForYou />
          </div>
        </div>
      </div>
    </div>
  );
}
