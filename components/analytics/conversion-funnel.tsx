"use client";

import type { FunnelStage } from "@/lib/analytics/types";
import { cn } from "@/lib/cn";

const STAGE_COLORS = [
  "bg-gradient-to-r from-rose-gold-deep to-rose-gold text-ivory",
  "bg-gradient-to-r from-rose-gold/80 to-rose-gold/60 text-ivory",
  "bg-gradient-to-r from-sage/80 to-sage text-ivory",
  "bg-gradient-to-r from-bronze/70 to-bronze text-ivory",
];

type ConversionFunnelProps = {
  stages: FunnelStage[];
  className?: string;
};

export function ConversionFunnel({ stages, className }: ConversionFunnelProps) {
  const max = stages[0]?.count || 1;

  return (
    <div className={cn("space-y-3", className)}>
      {stages.map((stage, i) => {
        const width = Math.max(12, (stage.count / max) * 100);
        return (
          <div
            key={stage.id}
            className="relative h-14 overflow-hidden rounded-xl bg-champagne/60"
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 flex items-center justify-between px-5 transition-all",
                STAGE_COLORS[i] ?? STAGE_COLORS[STAGE_COLORS.length - 1],
              )}
              style={{ width: `${width}%` }}
            >
              <span className="truncate text-[13px] font-medium">{stage.label}</span>
              <span className="shrink-0 pl-2 text-[14px] font-bold">
                {stage.count.toLocaleString()}
              </span>
            </div>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-taupe">
              {stage.percent}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
