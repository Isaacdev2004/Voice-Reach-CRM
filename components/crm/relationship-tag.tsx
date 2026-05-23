import { cn } from "@/lib/cn";

type RelationshipTagProps = {
  label: string;
  variant?: "sage" | "cream" | "bronze";
};

const variants = {
  sage: "bg-sage-light text-emerald-muted border-sage/20",
  cream: "bg-champagne/80 text-taupe border-outline-variant/20",
  bronze: "bg-bronze-light text-bronze border-bronze/20",
};

export function RelationshipTag({ label, variant = "sage" }: RelationshipTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium tracking-wide",
        variants[variant],
      )}
    >
      {label}
    </span>
  );
}
