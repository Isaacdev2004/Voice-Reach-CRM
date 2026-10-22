"use client";

import { cn } from "@/lib/cn";
import type { PmmsHistoryPoint } from "@/lib/mortgage/market-rates";

type PmmsHistoryChartProps = {
  points: PmmsHistoryPoint[];
  className?: string;
};

export function PmmsHistoryChart({ points, className }: PmmsHistoryChartProps) {
  if (points.length < 2) {
    return (
      <p className={cn("text-[12px] text-taupe", className)}>
        Trend chart appears when at least two weekly observations are available.
      </p>
    );
  }

  const rates = points.map((p) => p.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const pad = Math.max(0.15, (max - min) * 0.1);
  const yMin = min - pad;
  const yMax = max + pad;
  const span = yMax - yMin || 1;

  const width = 320;
  const height = 88;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p.rate - yMin) / span) * height;
    return { x, y, ...p };
  });
  const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  const first = points[0]!;
  const last = points[points.length - 1]!;

  return (
    <div className={cn("space-y-2", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[88px] w-full text-rose-gold-deep"
        role="img"
        aria-label={`30-year PMMS trend from ${first.date} to ${last.date}`}
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />
      </svg>
      <div className="flex justify-between text-[11px] tabular-nums text-taupe">
        <span>
          {formatShortDate(first.date)} · {first.rate.toFixed(2)}%
        </span>
        <span>
          {formatShortDate(last.date)} · {last.rate.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
