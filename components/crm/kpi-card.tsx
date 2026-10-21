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
}: DashboardKpi) {
  return (
    <LuxuryCard
      padding="sm"
      className="relative flex min-h-[108px] flex-col justify-between transition-shadow hover:shadow-nav"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneStyles[tone])}>
          <Icon name={icon} className="text-[20px]" />
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
      <div className="mt-2.5">
        <p className="text-[13px] text-taupe">{label}</p>
        <p className="font-serif text-[24px] font-semibold leading-tight text-ink sm:text-[26px]">{value}</p>
        {detail ? <p className="mt-0.5 text-[11px] text-slate-text">{detail}</p> : null}
      </div>
    </LuxuryCard>
  );
}
