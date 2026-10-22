import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { DashboardKpi } from "@/lib/crm/types";
import { KpiSpark } from "./kpi-spark";
import { LuxuryCard } from "./luxury-card";

const toneStyles = {
  default: "bg-champagne/60 text-taupe",
  sage: "bg-sage-light text-emerald-muted",
  bronze: "bg-bronze-light text-bronze",
  rose: "bg-rose-gold/15 text-rose-gold-deep",
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
}: DashboardKpi & { compact?: boolean }) {
  return (
    <LuxuryCard
      padding="sm"
      className={cn(
        "relative flex flex-col justify-between transition-shadow hover:shadow-nav",
        compact ? "min-h-[88px] !p-3 sm:!p-3.5" : "min-h-[108px]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex items-center justify-center rounded-xl",
            compact ? "h-8 w-8" : "h-9 w-9",
            toneStyles[tone],
          )}
        >
          <Icon name={icon} className={compact ? "text-[18px]" : "text-[20px]"} />
        </div>
        <div className="flex flex-col items-end gap-1">
          {change ? (
            <span
              className={cn(
                "text-[12px] font-semibold tabular-nums",
                changeToneStyles[changeTone],
              )}
            >
              {change}
            </span>
          ) : null}
          {spark ? <KpiSpark variant={spark} /> : null}
        </div>
      </div>
      <div className={compact ? "mt-1.5" : "mt-2.5"}>
        <p className={cn("text-taupe", compact ? "text-[12px]" : "text-[13px]")}>{label}</p>
        <p
          className={cn(
            "font-serif font-semibold leading-tight text-ink",
            compact ? "text-[21px] sm:text-[22px]" : "text-[24px] sm:text-[26px]",
          )}
        >
          {value}
        </p>
        {detail ? (
          <p className={cn("text-slate-text", compact ? "mt-0 text-[10px]" : "mt-0.5 text-[11px]")}>
            {detail}
          </p>
        ) : null}
      </div>
    </LuxuryCard>
  );
}
