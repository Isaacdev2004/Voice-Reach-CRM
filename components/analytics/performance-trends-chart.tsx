"use client";

import type { TrendPoint } from "@/lib/analytics/types";
import { cn } from "@/lib/cn";

type PerformanceTrendsChartProps = {
  trends: TrendPoint[];
  className?: string;
};

export function PerformanceTrendsChart({ trends, className }: PerformanceTrendsChartProps) {
  const max = Math.max(1, ...trends.map((t) => t.connected + t.failed));

  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex h-[280px] w-full items-end justify-between gap-1 border-b border-l border-outline-variant/20 px-1 pb-1">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full border-t border-dashed border-outline-variant/10" />
          ))}
        </div>
        {trends.map((point) => {
          const total = point.connected + point.failed;
          const heightPct = (total / max) * 100;
          const successPct = total > 0 ? (point.connected / total) * 100 : 0;
          return (
            <div
              key={point.label}
              className="group relative flex w-[10%] min-w-[28px] max-w-[48px] flex-col justify-end"
              title={`${point.label}: ${point.connected} delivered, ${point.failed} failed`}
            >
              <div
                className="relative w-full rounded-t-lg bg-champagne transition-all group-hover:opacity-90"
                style={{ height: `${Math.max(heightPct, 4)}%` }}
              >
                <div
                  className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-emerald-muted to-sage"
                  style={{ height: `${successPct}%` }}
                />
                <div
                  className="absolute top-0 w-full rounded-t bg-error/40"
                  style={{ height: `${100 - successPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[12px] font-medium text-taupe">
        {trends.map((t) => (
          <span key={t.label}>{t.label}</span>
        ))}
      </div>
    </div>
  );
}
