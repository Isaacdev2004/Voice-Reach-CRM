"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import {
  PRODUCT_CAMPAIGN_TEMPLATES,
  type ProductCampaignTemplate,
} from "@/lib/crm/campaign-templates";
import { RECOMMENDED_INSTALL_ORDER } from "@/lib/crm/engagement-score";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CampaignRow = {
  id: string;
  name: string;
  status: "draft" | "queued" | "sending" | "sent" | "partial" | "failed";
  provider: string;
  script_id: string;
  created_at: string;
  updated_at: string;
};

const STATUS_STYLES: Record<CampaignRow["status"], string> = {
  draft: "bg-champagne text-taupe",
  queued: "bg-bronze-light text-bronze",
  sending: "bg-rose-gold/15 text-rose-gold-deep animate-pulse-soft",
  sent: "bg-sage-light text-emerald-muted",
  partial: "bg-bronze-light text-bronze",
  failed: "bg-error/10 text-error",
};

export function CampaignListPanel() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const envelope = await safeFetch<{ campaigns: CampaignRow[] }>("/api/campaigns");
      setLoading(false);
      if (envelope.success) setCampaigns(envelope.data.campaigns);
      else setError(envelope.error);
    })();
  }, []);

  const installedNames = useMemo(() => new Set(campaigns.map((c) => c.name)), [campaigns]);

  const recommended = useMemo(() => {
    const byKey = new Map(PRODUCT_CAMPAIGN_TEMPLATES.map((t) => [t.templateKey, t]));
    return RECOMMENDED_INSTALL_ORDER.map((key) => byKey.get(key)).filter(
      (t): t is ProductCampaignTemplate => Boolean(t),
    );
  }, []);

  const createFromTemplate = async (templateKey: string, withAutomation = true) => {
    setCreatingKey(templateKey);
    setError(null);
    const envelope = await safeFetch<{ campaignId: string; message: string }>(
      "/api/campaigns/from-template",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey, createAutomation: withAutomation }),
      },
    );
    setCreatingKey(null);
    if (!envelope.success) {
      setError(envelope.error);
      return;
    }
    router.push(`/dashboard/campaigns/${envelope.data.campaignId}`);
  };

  const installAllRecommended = async () => {
    setError(null);
    for (const tpl of recommended) {
      if (installedNames.has(tpl.name)) continue;
      setCreatingKey(tpl.templateKey);
      const envelope = await safeFetch<{ campaignId: string; alreadyExisted?: boolean }>(
        "/api/campaigns/from-template",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateKey: tpl.templateKey,
            createAutomation: Boolean(tpl.automation),
          }),
        },
      );
      if (!envelope.success) {
        setCreatingKey(null);
        setError(envelope.error);
        return;
      }
    }
    setCreatingKey(null);
    const refreshed = await safeFetch<{ campaigns: CampaignRow[] }>("/api/campaigns");
    if (refreshed.success) setCampaigns(refreshed.data.campaigns);
  };

  return (
    <div className="space-y-6">
      <LuxuryCard padding="lg">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 w-full flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
              Recommended from your playbook
            </p>
            <h2 className="mt-1 font-serif text-[22px] font-semibold text-ink">
              Priority campaigns
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-taupe">
              Cold re-engage, long-term nurture, listing alerts, speed-to-lead, engaged-no-tour,
              and post-tour — ready to install with one click.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void installAllRecommended()}
            disabled={Boolean(creatingKey)}
            className="w-full shrink-0 self-start rounded-full bg-rose-gold px-4 py-2 text-[13px] font-medium text-ivory disabled:opacity-50 sm:w-auto"
          >
            {creatingKey ? "Installing…" : "Install all recommended"}
          </button>
        </div>

        <ul className="grid gap-3 md:grid-cols-2">
          {recommended.map((tpl) => {
            const installed = installedNames.has(tpl.name);
            return (
              <li
                key={tpl.templateKey}
                className="flex flex-col rounded-2xl border border-outline-variant/15 bg-champagne/30 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{tpl.name}</p>
                    <p className="mt-1 text-[12px] text-taupe">
                      {tpl.durationDays} days · {tpl.steps.length} steps · {tpl.audience}
                    </p>
                  </div>
                  {tpl.featured ? (
                    <span className="shrink-0 rounded-full bg-rose-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-gold-deep">
                      Priority
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-text">
                  {tpl.description}
                </p>
                <button
                  type="button"
                  disabled={installed || creatingKey === tpl.templateKey}
                  onClick={() =>
                    void createFromTemplate(tpl.templateKey, Boolean(tpl.automation))
                  }
                  className={cn(
                    "mt-3 rounded-full px-4 py-1.5 text-[12px] font-semibold",
                    installed
                      ? "border border-outline-variant/25 text-taupe"
                      : "bg-rose-gold text-ivory disabled:opacity-50",
                  )}
                >
                  {installed
                    ? "In library"
                    : creatingKey === tpl.templateKey
                      ? "Creating…"
                      : tpl.automation
                        ? "Create + automation"
                        : "Create campaign"}
                </button>
              </li>
            );
          })}
        </ul>
      </LuxuryCard>

      <LuxuryCard padding="lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
              Campaign library
            </p>
            <h2 className="mt-1 font-serif text-[22px] font-semibold text-ink">All campaigns</h2>
          </div>
          <Link
            href="/dashboard/campaigns?new=1#campaign-builder"
            className="text-[13px] font-medium text-rose-gold-deep hover:underline"
          >
            + Build custom
          </Link>
        </div>

        {loading ? (
          <p className="py-6 text-center text-[13px] text-taupe">Loading campaigns…</p>
        ) : error ? (
          <p className="rounded-xl border border-error/30 bg-error/5 p-3 text-[13px] text-error">
            {error}
          </p>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-cream/40 p-6 text-center">
            <Icon name="campaign" className="text-[32px] text-rose-gold-deep" />
            <p className="mt-2 text-[14px] font-medium text-ink">No campaigns yet</p>
            <p className="mt-1 text-[13px] text-slate-text">
              Install the recommended set above, or build a custom sequence.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {campaigns.map((c) => (
              <li key={c.id}>
                <div className="luxury-hover flex items-center justify-between gap-2 rounded-2xl border border-outline-variant/15 bg-ivory px-4 py-3">
                  <Link href={`/dashboard/campaigns/${c.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{c.name}</p>
                    <p className="text-[12px] text-taupe">
                      Provider: {c.provider} ·{" "}
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {(c.status === "draft" || c.status === "queued") && (
                      <Link
                        href={`/dashboard/campaigns?edit=${c.id}#campaign-builder`}
                        className="rounded-full border border-outline-variant/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-gold-deep hover:bg-champagne"
                      >
                        Edit
                      </Link>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        STATUS_STYLES[c.status],
                      )}
                    >
                      {c.status}
                    </span>
                    <Link href={`/dashboard/campaigns/${c.id}`} aria-label="Open campaign">
                      <Icon name="chevron_right" className="text-taupe" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </LuxuryCard>

      <LuxuryCard padding="lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
          More templates
        </p>
        <h2 className="mt-1 font-serif text-[20px] font-semibold text-ink">Also available</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_CAMPAIGN_TEMPLATES.filter(
            (t) => !RECOMMENDED_INSTALL_ORDER.includes(t.templateKey as (typeof RECOMMENDED_INSTALL_ORDER)[number]),
          ).map((tpl) => (
            <li key={tpl.templateKey}>
              <button
                type="button"
                disabled={installedNames.has(tpl.name) || Boolean(creatingKey)}
                onClick={() => void createFromTemplate(tpl.templateKey, Boolean(tpl.automation))}
                className="w-full rounded-xl border border-outline-variant/15 bg-ivory px-3 py-3 text-left hover:bg-champagne disabled:opacity-60"
              >
                <p className="text-[13px] font-medium text-ink">{tpl.name}</p>
                <p className="mt-0.5 text-[11px] text-taupe">
                  {installedNames.has(tpl.name) ? "In library" : `${tpl.steps.length} steps`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </LuxuryCard>
    </div>
  );
}
