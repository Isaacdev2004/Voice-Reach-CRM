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
  up: "text-emerald-muted", down: "text-error", neutral: "text-taupe",
};

/** Compact horizontal summary; the original values, details and trends are retained. */
export function KpiCard({ label, value, change, changeTone = "up", detail, icon,
  tone = "default", spark }: DashboardKpi) {
  return (
    <LuxuryCard padding="sm" className="premium-kpi">
      <div className={cn("premium-kpi__icon", toneStyles[tone])}>
        <Icon name={icon} className="text-[20px]" />
      </div>
      <div className="premium-kpi__copy">
        <p className="premium-kpi__label">{label}</p>
        <p className="premium-kpi__value">{value}</p>
        {detail ? <p className="premium-kpi__detail">{detail}</p> : null}
      </div>
      {change || spark ? (
        <div className="premium-kpi__trend">
          {change ? <span className={cn("text-[11px] font-semibold tabular-nums", changeToneStyles[changeTone])}>{change}</span> : null}
          {spark ? <KpiSpark variant={spark} /> : null}
        </div>
      ) : null}
    </LuxuryCard>
  );
}
