"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export type AppToastTone = "success" | "error";

export type AppToastProps = {
  message: string;
  tone?: AppToastTone;
  className?: string;
};

/** Top-center toast — visible above dashboard content without overlapping the AI launcher. */
export function AppToast({ message, tone = "success", className }: AppToastProps) {
  return (
    <div
      className={cn(
        "fixed left-1/2 top-6 z-[200] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 items-start gap-2 rounded-xl border px-4 py-3 shadow-[0_12px_40px_rgba(26,20,16,0.14)]",
        tone === "success" ? "border-emerald-muted/30 bg-ivory" : "border-error/30 bg-ivory",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Icon
        name={tone === "success" ? "check_circle" : "error"}
        className={cn("mt-0.5 shrink-0", tone === "success" ? "text-emerald-muted" : "text-error")}
      />
      <span className="text-[14px] font-medium leading-snug text-ink">{message}</span>
    </div>
  );
}
