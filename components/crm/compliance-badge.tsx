import { cn } from "@/lib/cn";

type ComplianceStatus = "valid" | "pending" | "blocked" | "review";

const config: Record<ComplianceStatus, { label: string; className: string }> = {
  valid: { label: "Consent Valid", className: "bg-sage-light text-emerald-muted" },
  pending: { label: "Pending Review", className: "bg-champagne text-taupe" },
  blocked: { label: "Blocked", className: "bg-error-container/40 text-error" },
  review: { label: "Re-consent Needed", className: "bg-warning/15 text-warning" },
};

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const { label, className } = config[status];
  return (
    <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider", className)}>
      {label}
    </span>
  );
}
