import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { CampaignStep, CampaignStepStatus } from "@/lib/crm/types";
import { LuxuryCard } from "./luxury-card";

const stepIcons: Record<CampaignStep["type"], string> = {
  voicemail: "voicemail",
  avatar_video: "smart_display",
  email: "mail",
  sms: "sms",
  retargeting: "ads_click",
  callback: "notifications_active",
};

const statusConfig: Record<
  CampaignStepStatus,
  { label: string; className: string; icon?: string }
> = {
  sent: { label: "Sent", className: "bg-sage-light text-emerald-muted", icon: "check_circle" },
  active: { label: "Active", className: "bg-bronze-light text-bronze", icon: "bolt" },
  pending: { label: "Pending", className: "bg-champagne text-taupe", icon: "schedule" },
  draft: { label: "Draft", className: "bg-surface-container text-on-surface-variant" },
};

export function CampaignFlowStep({ step }: { step: CampaignStep }) {
  const status = statusConfig[step.status];

  return (
    <LuxuryCard
      padding="md"
      className={cn(
        "relative flex min-w-[200px] max-w-[220px] flex-col items-center text-center transition-all hover:-translate-y-0.5",
        step.status === "active" && "ring-2 ring-rose-gold/30",
        step.status === "draft" && "ring-2 ring-dashed ring-rose-gold/25 border-rose-gold/20",
      )}
    >
      <span className="absolute -top-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-rose-gold text-[13px] font-semibold text-ivory">
        {step.order}
      </span>
      <div className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-champagne/80 text-rose-gold-deep">
        <Icon name={stepIcons[step.type]} className="text-[28px]" />
      </div>
      <h3 className="mt-4 font-serif text-[18px] font-semibold text-ink">{step.title}</h3>
      <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-taupe">{step.description}</p>
      <p className="mt-3 text-[12px] font-medium text-taupe">
        {step.dayLabel} · {step.timeLabel}
      </p>
      <span
        className={cn(
          "mt-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
          status.className,
        )}
      >
        {status.icon ? <Icon name={status.icon} className="text-[14px]" /> : null}
        {status.label}
      </span>
    </LuxuryCard>
  );
}

export function CampaignFlow({ steps }: { steps: CampaignStep[] }) {
  return (
    <div className="relative overflow-x-auto pb-4">
      <div className="flex min-w-max items-stretch gap-0 px-4">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <CampaignFlowStep step={step} />
            {i < steps.length - 1 ? (
              <div className="mx-2 h-0.5 w-12 shrink-0 campaign-flow-line" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
