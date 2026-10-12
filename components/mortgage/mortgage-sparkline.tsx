import { cn } from "@/lib/cn";

type MortgageSparklineProps = {
  trend?: "up" | "down";
  className?: string;
};

/** Decorative rate trend spark (not historical data). */
export function MortgageSparkline({ trend = "down", className }: MortgageSparklineProps) {
  const points =
    trend === "down"
      ? "2,20 10,18 18,16 26,14 34,12 42,10 50,8"
      : "2,8 10,10 18,12 26,14 34,16 42,18 50,20";
  return (
    <svg viewBox="0 0 52 24" className={cn("h-6 w-14", className)} aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
