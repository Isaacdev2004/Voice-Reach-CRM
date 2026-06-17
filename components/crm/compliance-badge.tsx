import { cn } from "@/lib/cn";

type ComplianceStatus = "valid" | "pending" | "blocked" | "review";

const config: Record<ComplianceStatus, { label: string; shortLabel: string; className: string }> = {
  valid: { label: "Consent Valid", shortLabel: "Valid", className: "bg-sage-light text-emerald-muted" },
  pending: { label: "Pending Review", shortLabel: "Pending", className: "bg-champagne text-taupe" },
  blocked: { label: "Blocked", shortLabel: "Blocked", className: "bg-error-container/40 text-error" },
  review: { label: "Re-consent Needed", shortLabel: "Re-consent", className: "bg-warning/15 text-warning" },
};

export function ComplianceBadge({
  status,
  compact = false,
}: {
  status: ComplianceStatus;
  compact?: boolean;
}) {
  const { label, shortLabel, className } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold leading-none",
        compact ? "normal-case tracking-normal" : "uppercase tracking-wider",
        className,
      )}
    >
      {compact ? shortLabel : label}
    </span>
  );
}
