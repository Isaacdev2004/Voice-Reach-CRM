import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type LuxuryCardProps = {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingMap = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function LuxuryCard({ children, className, padding = "md" }: LuxuryCardProps) {
  return (
    <div className={cn("luxury-card block w-full min-w-0", paddingMap[padding], className)}>
      {children}
    </div>
  );
}
