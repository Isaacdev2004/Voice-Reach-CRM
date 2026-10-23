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
import { useRouter } from "next/navigation";
import {
  dashboardCampaignMetrics,
  recentDashboardCampaigns,
  type DashboardCampaign,
  type DashboardCampaignMetric,
} from "@/lib/dashboard/campaign-display";
import { useEffect, useState } from "react";

type CampaignRow = DashboardCampaign;

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-sage-light text-emerald-muted" },
  paused: { label: "Paused", className: "bg-champagne text-taupe" },
  archived: { label: "Archived", className: "bg-champagne text-taupe" },
  draft: { label: "Draft", className: "bg-champagne text-taupe" },
  queued: { label: "Queued", className: "bg-bronze-light text-bronze" },
  sending: { label: "Sending", className: "bg-sage-light text-emerald-muted" },
  sent: { label: "Sent", className: "bg-sage-light text-emerald-muted" },
  partial: { label: "Partial", className: "bg-bronze-light/80 text-bronze" },
  failed: { label: "Failed", className: "bg-error/10 text-error" },
};

function formatDate(iso: string) {
  try {
    if (!Number.isFinite(Date.parse(iso))) return "—";
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

type CampaignMetricRow = DashboardCampaignMetric;
function metricsForCampaign(
  campaign: CampaignRow,
  byId: Map<string, CampaignMetricRow>,
) {
  return dashboardCampaignMetrics(campaign, byId.get(campaign.id));
}

const THUMBS = [
  "/brand/heroes/dashboard-interior.jpg",
  "/brand/heroes/contacts.jpg",
  "/brand/heroes/properties.jpg",
  "/brand/heroes/tasks.jpg",
];

export function DashboardRecentCampaignsTable() {
  const router = useRouter();
  const [error, setError] = useState(false),
    [version, setVersion] = useState(0);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [metricById, setMetricById] = useState<Map<string, CampaignMetricRow>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const options = {
      cache: "no-store" as const,
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    };
    setLoading(true);
    setError(false);
    setMetricById(new Map());
    void fetch("/api/analytics?range=30d", options)
      .then(async (res) => {
        const analytics = await res.json();
        if (
          !res.ok ||
          analytics.fromLiveData !== true ||
          !Array.isArray(analytics.campaigns)
        )
          return;
        if (!controller.signal.aborted)
          setMetricById(
            new Map(
              analytics.campaigns.map((m: CampaignMetricRow) => [m.id, m]),
            ),
          );
      })
      .catch(() => undefined);
    void fetch("/api/campaigns/library", options)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.success === false || !Array.isArray(data.campaigns))
          throw Error();
        if (!controller.signal.aborted)
          setCampaigns(recentDashboardCampaigns(data.campaigns));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [version]);

  return (
    <LuxuryCard padding="md" className={DASHBOARD_SECTION_CARD}>
      <div className={cn(DASHBOARD_SECTION_HEADER, "sm:items-end")}>
        <div>
          <h2
            className={cn(DASHBOARD_SECTION_TITLE, "dashboard-section-heading")}
          >
            <Icon name="campaign" />
            Recent Campaigns
          </h2>
          <p className={DASHBOARD_SECTION_SUBTITLE}>
            Track performance and pick up where you left off.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/campaigns"
            className="text-[12px] font-medium text-rose-gold-deep hover:underline"
          >
            View all campaigns
          </Link>
          <Link
            href="/dashboard/campaigns?new=1#campaign-builder"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-gold-deep px-5 py-2.5 text-[13px] font-medium text-ivory transition-opacity hover:opacity-90"
          >
            <Icon name="add" className="text-[18px]" />
            New campaign
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-[14px] text-taupe">
          Loading campaigns…
        </p>
      ) : error ? (
        <div className="dashboard-compact-state" role="alert">
          <p>Campaigns could not be loaded.</p>
          <button
            type="button"
            onClick={() => setVersion((v) => v + 1)}
            className="text-rose-gold-deep"
          >
            Try again
          </button>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="dashboard-compact-state rounded-xl border border-dashed border-outline-variant/30 bg-cream/40">
          <p className="text-[14px] text-slate-text">No campaigns yet.</p>
          <Link
            href="/dashboard/campaigns"
            className="mt-2 inline-block text-[12px] font-medium text-rose-gold-deep hover:underline"
          >
            Create your first campaign
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-outline-variant/10 md:hidden">
            {campaigns.map((c, idx) => {
              const status = STATUS_LABEL[c.status] ?? {
                label: c.status,
                className: "bg-champagne text-taupe",
              };
              const metrics = metricsForCampaign(c, metricById);
              const thumb = THUMBS[idx % THUMBS.length];
              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/campaigns/${c.id}`}
                    className="flex items-center gap-3 px-1 py-3.5"
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-champagne">
                      <Image
                        src={thumb}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium text-ink">
                        {c.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-taupe">
                        {status.label}
                        {metrics.contacts !== "—"
                          ? ` · ${metrics.contacts} contacts`
                          : ""}
                        {metrics.delivery !== "—"
                          ? ` · ${metrics.delivery} delivery`
                          : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] text-taupe">
                        {formatDate(c.created_at)}
                      </p>
                    </div>
                    <Icon
                      name="chevron_right"
                      className="shrink-0 text-[22px] text-taupe"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto -mx-2 px-2 md:block">
            <table className="dashboard-recent-table w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-outline-variant/15 text-[11px] font-semibold uppercase tracking-wider text-taupe">
                  <th className="pb-3 pr-4 font-semibold">Campaign</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 pr-4 font-semibold">Steps</th>
                  <th
                    className="pb-3 pr-4 font-semibold"
                    title="Current unique campaign enrollments"
                  >
                    Contacts
                  </th>
                  <th className="pb-3 pr-4 font-semibold" title="Provider-confirmed delivery for attempts in the last 30 days">Delivery rate</th>
                  <th className="pb-3 pr-4 font-semibold">Reply rate</th>
                  <th className="pb-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, idx) => {
                  const status = STATUS_LABEL[c.status] ?? {
                    label: c.status,
                    className: "bg-champagne text-taupe",
                  };
                  const metrics = metricsForCampaign(c, metricById);
                  const thumb = THUMBS[idx % THUMBS.length];
                  return (
                    <tr
                      key={c.id}
                      className="dashboard-campaign-row border-b border-outline-variant/10 transition-colors last:border-0"
                      onClick={(event) => {
                        if (!(event.target as HTMLElement).closest("a,button"))
                          router.push(`/dashboard/campaigns/${c.id}`);
                      }}
                    >
                      <td className="py-4 pr-4">
                        <Link
                          href={`/dashboard/campaigns/${c.id}`}
                          className="flex items-center gap-3 font-medium text-ink hover:text-rose-gold-deep"
                        >
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-champagne">
                            <Image
                              src={thumb}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                          <span className="min-w-0 line-clamp-2">{c.name}</span>
                        </Link>
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-slate-text">
                        {metrics.steps}
                      </td>
                      <td className="py-4 pr-4 text-slate-text">
                        {metrics.contacts}
                      </td>
                      <td className="py-4 pr-4 text-slate-text">
                        {metrics.delivery}
                      </td>
                      <td className="py-4 pr-4 text-slate-text">
                        {metrics.reply}
                      </td>
                      <td className="py-4 text-taupe">
                        {formatDate(c.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </LuxuryCard>
  );
}
