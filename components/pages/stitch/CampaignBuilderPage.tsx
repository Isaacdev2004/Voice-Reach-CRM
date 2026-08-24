"use client";

import { AddCampaignStepModal } from "@/components/crm/add-campaign-step-modal";
import { EditCampaignStepModal } from "@/components/crm/edit-campaign-step-modal";
import { ActivateCampaignModal } from "@/components/crm/activate-campaign-modal";
import { CampaignEditorStrip } from "@/components/crm/campaign-editor-strip";
import { CampaignFlow } from "@/components/crm/campaign-flow-step";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { campaignFromApi, createBlankCampaign } from "@/lib/crm/campaign-blueprint";
import { saveCampaignBuilder, saveTemplateLocally } from "@/lib/crm/campaign-storage";
import { campaignDurationFromSteps, reorderSteps } from "@/lib/crm/campaign-steps";
import { instantiateTemplate, PRODUCT_CAMPAIGN_TEMPLATES } from "@/lib/crm/campaign-templates";
import type { ActivateCampaignOptions, CampaignDefinition, CampaignStep } from "@/lib/crm/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Toast = { message: string; tone: "success" | "error" };

const inputClass =
  "w-full rounded-xl border border-outline-variant/20 bg-ivory/80 px-4 py-2 text-ink outline-none transition-colors focus:border-rose-gold/50";

export function CampaignBuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [campaign, setCampaign] = useState<CampaignDefinition>(() => createBlankCampaign());
  const [dbCampaignId, setDbCampaignId] = useState<string | null>(null);
  const [campaignStatus, setCampaignStatus] = useState<"editing" | "draft" | "queued">("editing");
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<CampaignStep | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [activating, setActivating] = useState(false);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const durationDays = useMemo(
    () => campaignDurationFromSteps(campaign.steps),
    [campaign.steps],
  );

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4500);
  };

  const resetToNewCampaign = useCallback(() => {
    setCampaign(createBlankCampaign());
    setDbCampaignId(null);
    setCampaignStatus("editing");
  }, []);

  const loadSampleTemplate = useCallback((templateKey = "cold-lead-reengage") => {
    const next = instantiateTemplate(templateKey);
    if (!next) return;
    setCampaign(next);
    setDbCampaignId(null);
    setCampaignStatus("editing");
    showToast(`“${next.name}” template loaded — edit steps, then save or activate.`);
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      resetToNewCampaign();
      router.replace("/dashboard/campaigns#campaign-builder", { scroll: false });
      return;
    }

    if (!editId) return;

    let cancelled = false;
    (async () => {
      setLoadingCampaign(true);
      const envelope = await safeFetch<{
        campaign: { id: string; name: string; status: string; script_id?: string };
        steps: Array<{
          id: string;
          step_order: number;
          type: string;
          title: string;
          description?: string;
          day_label?: string;
          time_label?: string;
          status?: string;
        }>;
      }>(`/api/campaigns/${editId}`);

      if (cancelled) return;
      setLoadingCampaign(false);

      if (!envelope.success) {
        showToast(envelope.error, "error");
        return;
      }

      const loaded = campaignFromApi(envelope.data.campaign, envelope.data.steps);
      setCampaign(loaded);
      setDbCampaignId(envelope.data.campaign.id);
      setCampaignStatus(
        envelope.data.campaign.status === "queued" ? "queued" : "draft",
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [editId, resetToNewCampaign, router, searchParams]);

  const handleAddStep = useCallback(
    (step: CampaignStep) => {
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
    },
    [campaignStatus],
  );

  const handleRemoveStep = useCallback((stepId: string) => {
    setCampaign((prev) => {
      const steps = reorderSteps(prev.steps.filter((s) => s.id !== stepId));
      return {
        ...prev,
        steps,
        durationDays: campaignDurationFromSteps(steps),
      };
    });
    if (campaignStatus === "queued") setCampaignStatus("editing");
    showToast("Step removed");
  }, [campaignStatus]);

  const handleUpdateStep = useCallback(
    (updated: CampaignStep) => {
      setCampaign((prev) => {
        const steps = reorderSteps(
          prev.steps.map((s) => (s.id === updated.id ? { ...updated, order: s.order } : s)),
        );
        return {
          ...prev,
          steps,
          durationDays: campaignDurationFromSteps(steps),
        };
      });
      if (campaignStatus === "queued") setCampaignStatus("editing");
      showToast("Step updated — click Save as template to keep it");
    },
    [campaignStatus],
  );

  const scrollToSequence = () => {
    document
      .getElementById("automation-sequence")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const handleActivate = async (options: ActivateCampaignOptions) => {
    if (campaign.steps.length === 0) {
      showToast("Add at least one automation step to activate.", "error");
      setActivateOpen(false);
      return;
    }

    setActivating(true);
    try {
      const result = await saveCampaignBuilder(
        "activate",
        campaign,
        dbCampaignId,
        options,
      );
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

  const liveCampaignHref = dbCampaignId ? `/dashboard/campaigns/${dbCampaignId}` : null;

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
        <div className="min-w-0 flex-1">
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
            {loadingCampaign ? (
              <span className="text-[12px] text-taupe">Loading campaign…</span>
            ) : null}
          </div>

          <div className="mt-3 space-y-3">
            <input
              type="text"
              value={campaign.name}
              onChange={(e) =>
                setCampaign((prev) => ({ ...prev, name: e.target.value }))
              }
              className={cn(inputClass, "font-serif text-[28px] font-semibold md:text-[32px]")}
              aria-label="Campaign name"
            />
            <textarea
              value={campaign.description}
              onChange={(e) =>
                setCampaign((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
              className={cn(inputClass, "resize-none text-[15px] text-slate-text")}
              aria-label="Campaign description"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetToNewCampaign}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/30 px-4 py-1.5 text-[13px] font-medium text-ink hover:bg-champagne"
            >
              <Icon name="add" className="text-[18px]" />
              New campaign
            </button>
            {PRODUCT_CAMPAIGN_TEMPLATES.map((tpl) => (
              <button
                key={tpl.templateKey}
                type="button"
                onClick={() => loadSampleTemplate(tpl.templateKey)}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/30 px-4 py-1.5 text-[13px] font-medium text-taupe hover:bg-champagne"
              >
                <Icon name="content_copy" className="text-[18px]" />
                {tpl.featured ? "Load: Cold lead re-engage" : `Load: ${tpl.name}`}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="text-[13px] text-taupe">
              <span className="mb-1 block font-medium text-ink">Audience label</span>
              <input
                type="text"
                value={campaign.audience}
                onChange={(e) =>
                  setCampaign((prev) => ({ ...prev, audience: e.target.value }))
                }
                className={cn(inputClass, "max-w-xs text-[14px]")}
              />
            </label>
            <span className="flex items-center gap-2 pb-2 text-[14px] text-taupe">
              <Icon name="schedule" className="text-[18px]" />
              ~{durationDays} days · {campaign.steps.length} steps
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={savingTemplate || activating || loadingCampaign}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant/40 bg-ivory px-6 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-champagne disabled:opacity-50"
            >
              <Icon name="bookmark" className="text-[18px]" />
              {savingTemplate ? "Saving…" : "Save as template"}
            </button>
            <button
              type="button"
              onClick={() => setActivateOpen(true)}
              disabled={
                savingTemplate || activating || campaignStatus === "queued" || loadingCampaign
              }
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-gold px-6 py-2.5 text-[14px] font-medium text-ivory shadow-card transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="rocket_launch" className="text-[18px]" />
              {campaignStatus === "queued" ? "Campaign queued" : "Activate campaign"}
            </button>
            {liveCampaignHref ? (
              <Link
                href={liveCampaignHref}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-gold/40 bg-rose-gold/10 px-6 py-2.5 text-[14px] font-medium text-rose-gold-deep transition-colors hover:bg-rose-gold/20"
              >
                Open campaign
                <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <section id="automation-sequence">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-[22px] font-semibold text-ink">Automation sequence</h2>
            <p className="text-[14px] text-slate-text">
              Add steps you want to send. Use merge fields like{" "}
              <code className="rounded bg-champagne/80 px-1.5 py-0.5 text-[12px]">
                {"{{first_name}}"}
              </code>
              ,{" "}
              <code className="rounded bg-champagne/80 px-1.5 py-0.5 text-[12px]">
                {"{{property_address}}"}
              </code>
              ,{" "}
              <code className="rounded bg-champagne/80 px-1.5 py-0.5 text-[12px]">{"{{area}}"}</code>
              ,{" "}
              <code className="rounded bg-champagne/80 px-1.5 py-0.5 text-[12px]">
                {"{{agent_name}}"}
              </code>{" "}
              — they autofill from the contact and your Settings. Don&apos;t leave raw comps like
              [Comp1Price] in the copy unless you paste real numbers first.
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
        {campaign.steps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-cream/40 px-6 py-12 text-center">
            <Icon name="linear_scale" className="mx-auto text-[36px] text-rose-gold-deep" />
            <p className="mt-3 font-medium text-ink">No steps yet</p>
            <p className="mt-1 text-[14px] text-slate-text">
              Add ringless voicemail, email, or SMS — skip AI video until you need it.
            </p>
          </div>
        ) : (
          <CampaignFlow
            steps={campaign.steps}
            editable
            onRemoveStep={handleRemoveStep}
            onEditStep={(step) => setEditingStep(step)}
          />
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <LuxuryCard padding="lg" className="lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="track_changes" className="text-rose-gold-deep" />
            <h3 className="font-serif text-[20px] font-semibold text-ink">Campaign goals</h3>
          </div>
          {campaign.goals.length > 0 ? (
            <ul className="space-y-3">
              {campaign.goals.map((goal) => (
                <li key={goal} className="flex items-start gap-2 text-[14px] text-slate-text">
                  <Icon name="check_circle" className="mt-0.5 shrink-0 text-emerald-muted" />
                  {goal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-taupe">Optional — add goals in a future update.</p>
          )}
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

      <EditCampaignStepModal
        open={Boolean(editingStep)}
        step={editingStep}
        onClose={() => setEditingStep(null)}
        onSave={handleUpdateStep}
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
