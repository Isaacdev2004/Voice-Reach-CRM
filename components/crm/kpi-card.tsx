import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { DashboardKpi } from "@/lib/crm/types";
import { LuxuryCard } from "./luxury-card";

const toneStyles = {
  default: "bg-champagne/60 text-taupe",
  sage: "bg-sage-light text-emerald-muted",
  bronze: "bg-bronze-light text-bronze",
  rose: "bg-rose-gold/15 text-rose-gold-deep",
};

export function KpiCard({ label, value, change, icon, tone = "default" }: DashboardKpi) {
  return (
    <LuxuryCard className="flex min-h-[120px] flex-col justify-between transition-shadow hover:shadow-nav">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", toneStyles[tone])}>
          <Icon name={icon} className="text-[22px]" />
        </div>
        {change ? (
          <span className="text-[11px] font-medium uppercase tracking-wide text-sage">{change}</span>
        ) : null}
      </div>
      <div>
        <p className="text-label-md text-taupe">{label}</p>
        <p className="font-serif text-[28px] font-semibold leading-tight text-ink">{value}</p>
      </div>
    </LuxuryCard>
  );
}
