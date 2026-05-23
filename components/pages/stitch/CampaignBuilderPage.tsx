"use client";

import { AddCampaignStepModal } from "@/components/crm/add-campaign-step-modal";
import { ActivateCampaignModal } from "@/components/crm/activate-campaign-modal";
import { CampaignEditorStrip } from "@/components/crm/campaign-editor-strip";
import { CampaignFlow } from "@/components/crm/campaign-flow-step";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { saveCampaignBuilder, saveTemplateLocally } from "@/lib/crm/campaign-storage";
import { campaignDurationFromSteps, reorderSteps } from "@/lib/crm/campaign-steps";
import { DEFAULT_CAMPAIGN } from "@/lib/crm/mock-data";
import type { CampaignDefinition, CampaignStep } from "@/lib/crm/types";
import { useCallback, useMemo, useState } from "react";

type Toast = { message: string; tone: "success" | "error" };

export function CampaignBuilderPage() {
  const [campaign, setCampaign] = useState<CampaignDefinition>(() => ({
    ...DEFAULT_CAMPAIGN,
    steps: [...DEFAULT_CAMPAIGN.steps],
  }));
  const [dbCampaignId, setDbCampaignId] = useState<string | null>(null);
  const [campaignStatus, setCampaignStatus] = useState<"editing" | "draft" | "queued">("editing");
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [activating, setActivating] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const durationDays = useMemo(
    () => campaignDurationFromSteps(campaign.steps),
    [campaign.steps],
  );

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4500);
  };

  const handleAddStep = useCallback((step: CampaignStep) => {
    setCampaign((prev) => {
      const steps = reorderSteps([...prev.steps, step]);
      return {
        ...prev,
        steps,
        durationDays: campaignDurationFromSteps(steps),
      };
    });
    if (campaignStatus === "queued") setCampaignStatus("editing");
    showToast("Step added to your sequence");
  }, [campaignStatus]);

  const scrollToSequence = () => {
    document.getElementById("automation-sequence")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSaveTemplate = async () => {
    if (campaign.steps.length === 0) {
      showToast("Add at least one step before saving.", "error");
      return;
    }

    setSavingTemplate(true);
    try {
      const result = await saveCampaignBuilder("template", campaign, dbCampaignId);
      setDbCampaignId(result.campaignId);
      setCampaignStatus("draft");
      saveTemplateLocally(campaign, result.campaignId);
      showToast(result.message || "Template saved successfully.");
    } catch (err) {
      saveTemplateLocally(campaign, dbCampaignId ?? undefined);
      showToast(
        err instanceof Error
          ? `${err.message} — saved locally on this device.`
          : "Saved locally on this device.",
        "error",
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleActivate = async () => {
    if (campaign.steps.length === 0) {
      showToast("Add at least one automation step to activate.", "error");
      setActivateOpen(false);
      return;
    }

    setActivating(true);
    try {
      const result = await saveCampaignBuilder("activate", campaign, dbCampaignId);
      setDbCampaignId(result.campaignId);
      setCampaignStatus("queued");
      setActivateOpen(false);
      showToast(result.message || "Campaign activated and queued.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not activate campaign", "error");
    } finally {
      setActivating(false);
    }
  };

  const statusBadge =
    campaignStatus === "queued"
      ? { label: "Queued", className: "bg-sage-light text-emerald-muted" }
      : campaignStatus === "draft"
        ? { label: "Draft saved", className: "bg-champagne text-taupe" }
        : null;

  return (
    <div className="luxury-page p-8 max-w-[1400px] w-full mx-auto space-y-8">
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[150] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-card",
            toast.tone === "success"
              ? "border-emerald-muted/30 bg-ivory"
              : "border-error/30 bg-ivory",
          )}
          role="status"
        >
          <Icon
            name={toast.tone === "success" ? "check_circle" : "error"}
            className={toast.tone === "success" ? "text-emerald-muted" : "text-error"}
          />
          <span className="text-[14px] font-medium text-ink">{toast.message}</span>
        </div>
      ) : null}

      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-taupe">
              Campaign builder
            </p>
            {statusBadge ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  statusBadge.className,
                )}
              >
                {statusBadge.label}
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 font-serif text-[32px] font-semibold text-ink md:text-[40px]">
            {campaign.name}
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-slate-text">{campaign.description}</p>
          <div className="mt-4 flex flex-wrap gap-6 text-[14px] text-taupe">
            <span className="flex items-center gap-2">
              <Icon name="groups" className="text-[18px]" />
              Audience: {campaign.audience}
            </span>
            <span className="flex items-center gap-2">
              <Icon name="schedule" className="text-[18px]" />
              Estimated duration: {durationDays} days
            </span>
            <span className="flex items-center gap-2">
              <Icon name="linear_scale" className="text-[18px]" />
              {campaign.steps.length} steps
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <div className="flex gap-4">
            {[
              { label: "Total reach", value: campaign.stats.reach.toLocaleString(), icon: "visibility" },
              { label: "Replies", value: campaign.stats.replies.toLocaleString(), icon: "send" },
              {
                label: "Response rate",
                value: `${campaign.stats.responseRate}%`,
                icon: "trending_up",
              },
            ].map((stat) => (
              <LuxuryCard key={stat.label} padding="sm" className="min-w-[120px] text-center">
                <Icon name={stat.icon} className="mx-auto text-[20px] text-rose-gold-deep" />
                <p className="mt-2 font-serif text-[24px] font-semibold text-ink">{stat.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-taupe">{stat.label}</p>
              </LuxuryCard>
            ))}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={savingTemplate || activating}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant/40 bg-ivory px-6 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-champagne disabled:opacity-50"
            >
              <Icon name="bookmark" className="text-[18px]" />
              {savingTemplate ? "Saving…" : "Save as template"}
            </button>
            <button
              type="button"
              onClick={() => setActivateOpen(true)}
              disabled={savingTemplate || activating || campaignStatus === "queued"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-gold px-6 py-2.5 text-[14px] font-medium text-ivory shadow-card transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="rocket_launch" className="text-[18px]" />
              {campaignStatus === "queued" ? "Campaign queued" : "Activate campaign"}
            </button>
          </div>
        </div>
      </header>

      <section id="automation-sequence">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-[22px] font-semibold text-ink">Automation sequence</h2>
            <p className="text-[14px] text-slate-text">
              Visual storytelling for luxury relationship automation — each touch builds trust.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddStepOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory shadow-sm transition-opacity hover:opacity-90"
          >
            <Icon name="add" className="text-[20px]" />
            Add step
          </button>
        </div>
        <CampaignFlow steps={campaign.steps} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <LuxuryCard padding="lg" className="lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="track_changes" className="text-rose-gold-deep" />
            <h3 className="font-serif text-[20px] font-semibold text-ink">Campaign goals</h3>
          </div>
          <ul className="space-y-3">
            {campaign.goals.map((goal) => (
              <li key={goal} className="flex items-start gap-2 text-[14px] text-slate-text">
                <Icon name="check_circle" className="mt-0.5 shrink-0 text-emerald-muted" />
                {goal}
              </li>
            ))}
          </ul>
        </LuxuryCard>

        <CampaignEditorStrip />
      </div>

      <AddCampaignStepModal
        open={addStepOpen}
        onClose={() => setAddStepOpen(false)}
        existingSteps={campaign.steps}
        onAdd={(step) => {
          handleAddStep(step);
          window.setTimeout(scrollToSequence, 150);
        }}
      />

      <ActivateCampaignModal
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        campaign={campaign}
        durationDays={durationDays}
        onConfirm={handleActivate}
        loading={activating}
      />
    </div>
  );
}
