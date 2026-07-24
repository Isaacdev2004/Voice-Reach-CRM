"use client";

import { AddCampaignPeopleModal } from "@/components/campaigns/add-campaign-people-modal";
import { TestCampaignRunModal } from "@/components/campaigns/test-campaign-run-modal";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { EngagementTimeline } from "@/components/engagement/engagement-timeline";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  status: "draft" | "queued" | "sending" | "sent" | "partial" | "failed";
  provider: string;
  script_id: string;
  voice_asset_id?: string | null;
  created_at: string;
  updated_at: string;
  voice_assets?: {
    id: string;
    title: string;
    approved: boolean;
    storage_path: string;
    audio_url: string | null;
  } | null;
};

type Step = {
  id: string;
  step_order: number;
  type: "voicemail" | "sms" | "email" | "avatar_video" | "task" | "callback" | "wait";
  title: string;
  description: string;
  delay_minutes: number;
  day_label: string | null;
  time_label: string | null;
  status: string;
};

type BlockedRecipient = {
  id: string;
  contactId: string | null;
  name: string;
  phone: string;
  email: string;
  dnc: boolean;
  issues: string[];
  deliveryStatus: string;
  eligibilityStatus: string;
  updatedAt: string;
};

type StepRun = {
  id: string;
  step_id: string;
  recipient_id: string;
  status: "scheduled" | "running" | "sent" | "skipped" | "failed" | "blocked";
  scheduled_at: string;
  executed_at: string | null;
  result: Record<string, unknown>;
};

type Recipient = {
  id: string;
  eligibility_status: string;
  eligibility_issues: string[] | null;
  delivery_status: string;
  updated_at: string;
  contacts?:
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        email: string | null;
        dnc: boolean;
      }
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        email: string | null;
        dnc: boolean;
      }[]
    | null;
};

type ApiData = {
  campaign: Campaign;
  steps: Step[];
  recipients: Recipient[];
  runs: StepRun[];
  blockedReport: BlockedRecipient[];
  counts: {
    total: number;
    eligible: number;
    blocked: number;
    sent: number;
    failed: number;
    notSent: number;
  };
  runCounts: {
    total: number;
    scheduled: number;
    sent: number;
    failed: number;
    blocked: number;
    skipped: number;
  };
};

type Toast = { message: string; tone: "success" | "error" };

const STEP_ICONS: Record<Step["type"], string> = {
  voicemail: "voicemail",
  sms: "sms",
  email: "mail",
  avatar_video: "smart_display",
  task: "task_alt",
  callback: "phone_callback",
  wait: "schedule",
};

const STATUS_STYLES: Record<Campaign["status"], string> = {
  draft: "bg-champagne text-taupe",
  queued: "bg-bronze-light text-bronze",
  sending: "bg-rose-gold/15 text-rose-gold-deep animate-pulse-soft",
  sent: "bg-sage-light text-emerald-muted",
  partial: "bg-bronze-light text-bronze",
  failed: "bg-error/10 text-error",
};

export function CampaignDetailPage({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [sending, setSending] = useState(false);
  const [tickingRunner, setTickingRunner] = useState(false);
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [testRunOpen, setTestRunOpen] = useState(false);

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4500);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    const envelope = await safeFetch<ApiData>(`/api/campaigns/${campaignId}`);
    setLoading(false);
    if (envelope.success) {
      setData(envelope.data);
      setError(null);
    } else {
      setError(envelope.error);
    }
  }, [campaignId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const triggerSend = async () => {
    if (!data?.campaign.voice_asset_id) {
      showToast("Attach an approved voice asset before sending.", "error");
      return;
    }
    setSending(true);
    const envelope = await safeFetch<{
      sentCount: number;
      blockedCount: number;
      failedCount: number;
    }>(`/api/campaigns/${campaignId}/send`, { method: "POST" });
    setSending(false);
    if (envelope.success) {
      showToast(
        `Sent ${envelope.data.sentCount} · blocked ${envelope.data.blockedCount} · failed ${envelope.data.failedCount}`,
      );
      void refresh();
    } else {
      showToast(envelope.error, "error");
    }
  };

  const tickRunner = async () => {
    setTickingRunner(true);
    const envelope = await safeFetch<{ processed: number }>("/api/campaigns/runner", {
      method: "POST",
    });
    setTickingRunner(false);
    if (envelope.success) {
      showToast(`Processed ${envelope.data.processed} step run${envelope.data.processed === 1 ? "" : "s"}`);
      void refresh();
    } else {
      showToast(envelope.error, "error");
    }
  };

  const recipients = data?.recipients ?? [];

  const existingContactIds = useMemo(
    () =>
      recipients
        .map((r) => {
          const contact = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
          return contact?.id;
        })
        .filter((id): id is string => Boolean(id)),
    [recipients],
  );

  const peopleRows = useMemo(
    () =>
      recipients.map((r) => {
        const contact = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
        const name = contact
          ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "Contact"
          : "Contact";
        return {
          id: r.id,
          contactId: contact?.id ?? null,
          name,
          phone: contact?.phone ?? "",
          email: contact?.email ?? "",
          eligibility: r.eligibility_status,
          delivery: r.delivery_status,
        };
      }),
    [recipients],
  );

  if (loading) {
    return (
      <div className="luxury-page flex min-h-[60vh] items-center justify-center p-8">
        <p className="text-taupe">Loading campaign…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="luxury-page p-8">
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1 text-[14px] text-taupe hover:text-rose-gold-deep"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Back to campaigns
        </Link>
        <LuxuryCard padding="lg" className="mt-6">
          <p className="text-error">{error ?? "Campaign not found"}</p>
        </LuxuryCard>
      </div>
    );
  }

  const { campaign, steps, runs, blockedReport, counts, runCounts } = data;
  const deliveryRate =
    counts.total === 0
      ? 0
      : Math.round((counts.sent / counts.total) * 100);

  return (
    <div className="luxury-page p-8 max-w-[1400px] w-full mx-auto space-y-8">
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[150] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-card",
            toast.tone === "success" ? "border-emerald-muted/30 bg-ivory" : "border-error/30 bg-ivory",
          )}
          role="status"
        >
          <Icon
            name={toast.tone === "success" ? "check_circle" : "error"}
            className={toast.tone === "success" ? "text-emerald-muted" : "text-error"}
          />
          <span className="text-[14px] text-ink">{toast.message}</span>
        </div>
      ) : null}

      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-1 text-[14px] text-taupe transition-colors hover:text-rose-gold-deep"
      >
        <Icon name="arrow_back" className="text-[18px]" />
        Back to campaigns
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-taupe">
              Campaign
            </p>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                STATUS_STYLES[campaign.status],
              )}
            >
              {campaign.status}
            </span>
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-taupe">
              {campaign.provider}
            </span>
          </div>
          <h1 className="mt-2 font-serif text-[36px] font-semibold text-ink">{campaign.name}</h1>
          <p className="mt-1 text-[13px] text-taupe">
            Created {new Date(campaign.created_at).toLocaleDateString()} · last updated{" "}
            {new Date(campaign.updated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTestRunOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-rose-gold/40 bg-rose-gold/10 px-5 py-2 text-[13px] font-medium text-rose-gold-deep shadow-card transition-colors hover:bg-rose-gold/20"
          >
            <Icon name="science" className="text-[18px]" />
            Run test sequence
          </button>
          <button
            type="button"
            onClick={() => setAddPeopleOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2 text-[13px] font-medium text-ivory shadow-card transition-opacity hover:opacity-95"
          >
            <Icon name="person_add" className="text-[18px]" />
            Add people
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-ivory px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne"
          >
            <Icon name="refresh" className="text-[18px]" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void tickRunner()}
            disabled={tickingRunner}
            className="inline-flex items-center gap-2 rounded-full border border-rose-gold/40 bg-rose-gold/10 px-4 py-2 text-[13px] font-medium text-rose-gold-deep transition-colors hover:bg-rose-gold/20 disabled:opacity-50"
          >
            <Icon name="bolt" className="text-[18px]" />
            {tickingRunner ? "Running…" : "Run scheduler"}
          </button>
          {campaign.voice_asset_id ? (
            <button
              type="button"
              onClick={() => void triggerSend()}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2 text-[13px] font-medium text-ivory shadow-card transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              <Icon name="send" className="text-[18px]" />
              {sending ? "Sending…" : "Send voicemail batch"}
            </button>
          ) : null}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {[
          { label: "Recipients", value: counts.total, icon: "groups" },
          { label: "Eligible", value: counts.eligible, icon: "verified_user", tone: "emerald" },
          { label: "Blocked", value: counts.blocked, icon: "block", tone: "error" },
          { label: "Sent", value: counts.sent, icon: "check_circle", tone: "emerald" },
          { label: "Failed", value: counts.failed, icon: "error", tone: "error" },
          { label: "Delivery %", value: `${deliveryRate}%`, icon: "trending_up", tone: "rose" },
        ].map((stat) => (
          <LuxuryCard key={stat.label} padding="sm" className="text-center">
            <Icon
              name={stat.icon}
              className={cn(
                "mx-auto text-[20px]",
                stat.tone === "emerald" && "text-emerald-muted",
                stat.tone === "error" && "text-error",
                stat.tone === "rose" && "text-rose-gold-deep",
                !stat.tone && "text-taupe",
              )}
            />
            <p className="mt-2 font-serif text-[22px] font-semibold text-ink">{stat.value}</p>
            <p className="text-[11px] uppercase tracking-wider text-taupe">{stat.label}</p>
          </LuxuryCard>
        ))}
      </section>

      <LuxuryCard padding="lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-[22px] font-semibold text-ink">People on this campaign</h2>
            <p className="mt-1 text-[13px] text-taupe">
              {counts.total === 0
                ? "No one enrolled yet — add contacts to start outreach."
                : `${counts.total} recipient${counts.total === 1 ? "" : "s"} enrolled`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddPeopleOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-rose-gold/40 bg-rose-gold/10 px-4 py-2 text-[13px] font-medium text-rose-gold-deep hover:bg-rose-gold/20"
          >
            <Icon name="person_add" className="text-[18px]" />
            Add people
          </button>
        </div>

        {peopleRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-cream/50 px-6 py-10 text-center">
            <p className="font-serif text-[20px] font-semibold text-ink">No people yet</p>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-slate-text">
              This saved campaign has no recipients. Add contacts here — they must have valid
              consent to be eligible.
            </p>
            <button
              type="button"
              onClick={() => setAddPeopleOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory"
            >
              <Icon name="person_add" className="text-[18px]" />
              Add people
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-outline-variant/15 text-[11px] uppercase tracking-wider text-taupe">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Phone / Email</th>
                  <th className="py-2 pr-3 font-medium">Eligibility</th>
                  <th className="py-2 font-medium">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {peopleRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-outline-variant/10 last:border-b-0"
                  >
                    <td className="py-3 pr-3">
                      {row.contactId ? (
                        <Link
                          href={`/dashboard/contacts/${row.contactId}`}
                          className="font-medium text-ink hover:text-rose-gold-deep"
                        >
                          {row.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-ink">{row.name}</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-taupe">{row.phone || row.email || "—"}</td>
                    <td className="py-3 pr-3 capitalize text-slate-text">{row.eligibility}</td>
                    <td className="py-3 capitalize text-slate-text">
                      {row.delivery.replace(/_/g, " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LuxuryCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <LuxuryCard padding="lg" className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-[22px] font-semibold text-ink">
              Blocked recipient report
            </h2>
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] font-medium text-taupe">
              {blockedReport.length} {blockedReport.length === 1 ? "recipient" : "recipients"}
            </span>
          </div>
          {blockedReport.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-muted/30 bg-sage-light/40 p-6 text-center">
              <Icon name="verified_user" className="text-[32px] text-emerald-muted" />
              <p className="mt-2 text-[14px] font-medium text-ink">No blocked recipients</p>
              <p className="mt-1 text-[13px] text-slate-text">
                All enrolled contacts passed compliance checks. Audit logs capture every
                eligibility decision.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-outline-variant/15 text-[11px] uppercase tracking-wider text-taupe">
                    <th className="py-2 pr-3 font-medium">Contact</th>
                    <th className="py-2 pr-3 font-medium">Reason(s)</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedReport.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-outline-variant/10 last:border-b-0"
                    >
                      <td className="py-3 pr-3">
                        {r.contactId ? (
                          <Link
                            href={`/dashboard/contacts/${r.contactId}`}
                            className="font-medium text-ink hover:text-rose-gold-deep"
                          >
                            {r.name || "Unknown contact"}
                          </Link>
                        ) : (
                          <span className="font-medium text-ink">{r.name}</span>
                        )}
                        <p className="text-[11px] text-taupe">{r.phone || r.email}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {r.dnc ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-medium text-error">
                              <Icon name="block" className="text-[12px]" /> DNC
                            </span>
                          ) : null}
                          {r.issues.length === 0 && !r.dnc ? (
                            <span className="rounded-full bg-champagne px-2 py-0.5 text-[11px] text-taupe">
                              No detail
                            </span>
                          ) : (
                            r.issues.map((issue) => (
                              <span
                                key={issue}
                                className="rounded-full bg-error/10 px-2 py-0.5 text-[11px] text-error"
                              >
                                {humanizeIssue(issue)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-[12px] capitalize text-slate-text">
                        {r.deliveryStatus === "blocked" || r.eligibilityStatus === "blocked"
                          ? "Blocked"
                          : r.deliveryStatus.replace("_", " ")}
                      </td>
                      <td className="py-3 text-[12px] text-taupe">
                        {new Date(r.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LuxuryCard>

        <LuxuryCard padding="lg">
          <h2 className="mb-4 font-serif text-[20px] font-semibold text-ink">Step runs</h2>
          <ul className="space-y-2 text-[13px]">
            {[
              { label: "Scheduled", value: runCounts.scheduled, tone: "bronze" },
              { label: "Sent", value: runCounts.sent, tone: "emerald" },
              { label: "Failed", value: runCounts.failed, tone: "error" },
              { label: "Blocked", value: runCounts.blocked, tone: "error" },
              { label: "Skipped", value: runCounts.skipped, tone: "taupe" },
            ].map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between rounded-xl bg-cream/50 px-3 py-2"
              >
                <span className="text-taupe">{row.label}</span>
                <span
                  className={cn(
                    "font-serif text-[18px] font-semibold",
                    row.tone === "emerald" && "text-emerald-muted",
                    row.tone === "error" && "text-error",
                    row.tone === "bronze" && "text-bronze",
                    row.tone === "taupe" && "text-taupe",
                  )}
                >
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] text-taupe">
            Press <span className="font-medium text-ink">Run scheduler</span> to fire any due runs
            immediately. In production this is invoked by cron.
          </p>
        </LuxuryCard>
      </div>

      <LuxuryCard padding="lg">
        <h2 className="mb-4 font-serif text-[22px] font-semibold text-ink">Sequence</h2>
        {steps.length === 0 ? (
          <p className="text-[13px] text-taupe">
            No persisted steps. The builder will save steps when you activate or save as template.
          </p>
        ) : (
          <ul className="space-y-2">
            {steps.map((step) => (
              <li
                key={step.id}
                className="flex items-center gap-3 rounded-xl border border-outline-variant/15 bg-ivory px-4 py-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-gold text-[13px] font-semibold text-ivory">
                  {step.step_order}
                </span>
                <Icon
                  name={STEP_ICONS[step.type] ?? "circle"}
                  className="text-[20px] text-rose-gold-deep"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{step.title}</p>
                  <p className="text-[12px] text-taupe">
                    {step.day_label ?? `Δ ${step.delay_minutes} min`}
                    {step.time_label ? ` · ${step.time_label}` : ""} · {step.type.replace("_", " ")}
                  </p>
                </div>
                <span className="rounded-full bg-cream px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-taupe">
                  {step.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </LuxuryCard>

      <LuxuryCard padding="lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-[22px] font-semibold text-ink">Engagement timeline</h2>
          <span className="rounded-full bg-emerald-muted/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-muted">
            Live
          </span>
        </div>
        <EngagementTimeline campaignId={campaignId} showScore={false} />
      </LuxuryCard>

      <AddCampaignPeopleModal
        open={addPeopleOpen}
        onClose={() => setAddPeopleOpen(false)}
        campaignId={campaignId}
        campaignName={campaign.name}
        existingContactIds={existingContactIds}
        onAdded={(message) => {
          showToast(message);
          void refresh();
        }}
      />
      <TestCampaignRunModal
        open={testRunOpen}
        onClose={() => setTestRunOpen(false)}
        campaignId={campaignId}
        campaignName={campaign.name}
        onDone={(message) => {
          showToast(message);
          void refresh();
        }}
      />
    </div>
  );
}

function humanizeIssue(issue: string): string {
  return issue
    .replace(/_/g, " ")
    .replace(/^(.)/, (c) => c.toUpperCase())
    .replace(/dnc/i, "DNC")
    .replace(/tcpa/i, "TCPA");
}
