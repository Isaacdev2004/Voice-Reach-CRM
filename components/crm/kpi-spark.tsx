import { cn } from "@/lib/cn";

type KpiSparkProps = {
  variant: "line" | "bars";
  className?: string;
};

export function KpiSpark({ variant, className }: KpiSparkProps) {
  if (variant === "bars") {
    return (
      <svg
        viewBox="0 0 48 32"
        className={cn("h-8 w-12 text-emerald-muted/80", className)}
        aria-hidden
      >
        {[6, 14, 10, 22, 16, 26, 20].map((h, i) => (
          <rect
            key={i}
            x={i * 7}
            y={32 - h}
            width={5}
            height={h}
            rx={1.5}
            fill="currentColor"
            opacity={0.35 + (i / 7) * 0.45}
          />
        ))}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 56 28" className={cn("h-7 w-14 text-emerald-muted/70", className)} aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="2,22 12,18 20,20 28,12 38,14 46,8 54,10"
      />
    </svg>
  );
}
