"use client";
import type { FunnelStage } from "@/lib/analytics/types";
import { cn } from "@/lib/cn";
const STAGE_COLORS = ["bg-rose-gold", "bg-sage", "bg-bronze"];
export function ConversionFunnel({
  stages,
  className,
}: {
  stages: FunnelStage[];
  className?: string;
}) {
  const max = stages[0]?.count ?? 0;
  return (
    <div className={cn("space-y-3", className)}>
      {stages.map((stage, i) => (
        <div
          key={stage.id}
          className="relative overflow-hidden rounded-xl bg-champagne/40"
        >
          <div
            aria-hidden
            className={cn(
              "absolute inset-y-0 left-0 opacity-25",
              STAGE_COLORS[i % STAGE_COLORS.length],
            )}
            style={{
              width: `${max ? Math.min(100, (stage.count / max) * 100) : 0}%`,
            }}
          />
          <div className="relative flex min-h-14 items-center gap-3 px-4 text-ink">
            <span className="min-w-0 flex-1 text-[13px] font-medium">
              {stage.label}
            </span>
            <strong className="text-[14px]">
              {stage.count.toLocaleString()}
            </strong>
            <span className="shrink-0 text-[11px] text-taupe">
              {stage.percent === null
                ? "Unavailable"
                : `${stage.percent.toFixed(1)}%`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
