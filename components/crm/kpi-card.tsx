import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { DashboardKpi } from "@/lib/crm/types";
import { KpiSpark } from "./kpi-spark";
import { LuxuryCard } from "./luxury-card";

const toneStyles = {
  default: "bg-champagne/70 text-taupe",
  sage: "bg-sage-light/80 text-emerald-muted",
  bronze: "bg-bronze-light/80 text-bronze",
  rose: "bg-rose-gold/12 text-rose-gold-deep",
};

const changeToneStyles = {
  up: "text-emerald-muted",
  down: "text-error",
  neutral: "text-taupe",
};

export function KpiCard({
  label,
  value,
  change,
  changeTone = "up",
  detail,
  icon,
  tone = "default",
  spark,
  compact = false,
  luxury = false,
}: DashboardKpi & { compact?: boolean; luxury?: boolean }) {
  if (luxury) return (
    <LuxuryCard className="dashboard-luxury-kpi" padding="none">
      <span className="dashboard-luxury-kpi-icon"><Icon name={icon} className="text-[24px]" /></span>
      <div className="min-w-0 flex-1">
        <p className="dashboard-luxury-kpi-label">{label}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="dashboard-luxury-kpi-value">{value}</p>
          {change ? <span className={cn("dashboard-luxury-kpi-change", changeToneStyles[changeTone])}>{change}</span> : null}
        </div>
        {detail ? <p className="dashboard-luxury-kpi-detail">{detail}</p> : null}
      </div>
      {label === "Opportunities" ? <Icon name="arrow_outward" className="dashboard-opportunity-arrow text-[18px]" /> : null}
    </LuxuryCard>
  );
  return (
    <LuxuryCard
      padding="sm"
      className={cn(
        "group relative flex h-full min-h-[112px] flex-col transition-[box-shadow,border-color] duration-200 hover:border-outline-variant/20 hover:shadow-[0_12px_32px_-12px_rgba(26,22,18,0.1)] motion-reduce:transition-none",
        compact && "!p-4 sm:!p-4",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-medium uppercase tracking-[0.12em] text-taupe",
            "text-[11px]",
          )}
        >
          {label}
        </p>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg",
            compact ? "h-8 w-8" : "h-9 w-9",
            toneStyles[tone],
          )}
        >
          <Icon name={icon} className={compact ? "text-[17px]" : "text-[18px]"} />
        </div>
      </div>

      <p
        className={cn(
          "mt-2 font-semibold tabular-nums leading-none tracking-tight text-ink",
          compact ? "text-[24px] sm:text-[26px]" : "text-[28px] sm:text-[30px]",
        )}
      >
        {value}
      </p>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div className="min-w-0">
          {detail ? (
            <p className={cn("leading-snug text-slate-text", compact ? "text-[11px]" : "text-[12px]")}>
              {detail}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {change ? (
            <span
              className={cn(
                "text-[11px] font-semibold tabular-nums",
                changeToneStyles[changeTone],
              )}
            >
              {change}
            </span>
          ) : null}
          {spark ? <KpiSpark variant={spark} className="opacity-80" /> : null}
        </div>
      </div>
    </LuxuryCard>
  );
}
