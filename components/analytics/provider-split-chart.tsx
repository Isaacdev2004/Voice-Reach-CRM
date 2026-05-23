"use client";

import type { ProviderSlice } from "@/lib/analytics/types";
import { cn } from "@/lib/cn";

const COLORS = ["#b8956b", "#8fa88a", "#c4a882", "#9a8b7a"];

type ProviderSplitChartProps = {
  providers: ProviderSlice[];
  totalLabel?: string;
  className?: string;
};

export function ProviderSplitChart({
  providers,
  totalLabel,
  className,
}: ProviderSplitChartProps) {
  const total = providers.reduce((s, p) => s + p.count, 0);
  const displayTotal = totalLabel ?? total.toLocaleString();

  let cumulative = 0;
  const segments = providers.map((p, i) => {
    const start = cumulative;
    cumulative += p.percent;
    return { ...p, start, color: COLORS[i % COLORS.length] };
  });

  const gradient = segments.length
    ? `conic-gradient(${segments.map((s) => `${s.color} ${s.start}% ${s.start + s.percent}%`).join(", ")})`
    : "conic-gradient(#e8e0d5 0% 100%)";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className="relative mb-8 flex h-48 w-48 items-center justify-center rounded-full"
        style={{ background: gradient }}
      >
        <div className="flex h-[68%] w-[68%] flex-col items-center justify-center rounded-full bg-ivory shadow-inner">
          <span className="font-serif text-[26px] font-semibold text-ink">{displayTotal}</span>
          <span className="text-[12px] text-taupe">Total delivered</span>
        </div>
      </div>
      <div className="w-full space-y-3">
        {providers.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-[14px] text-ink">{p.name}</span>
            </div>
            <span className="text-[14px] font-semibold text-ink">
              {p.percent}%{" "}
              <span className="font-normal text-taupe">({p.count.toLocaleString()})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
