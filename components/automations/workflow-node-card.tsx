"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { WorkflowNode } from "@/lib/automations/types";

const kindStyles: Record<
  WorkflowNode["kind"],
  { label: string; icon: string; border: string; badge: string; iconBg: string }
> = {
  trigger: {
    label: "Trigger",
    icon: "person_add",
    border: "border-rose-gold/30",
    badge: "text-rose-gold-deep",
    iconBg: "bg-rose-gold/15 text-rose-gold-deep",
  },
  action: {
    label: "Action",
    icon: "voicemail",
    border: "border-bronze/30",
    badge: "text-bronze",
    iconBg: "bg-bronze-light text-bronze",
  },
  delay: {
    label: "Delay",
    icon: "schedule",
    border: "border-outline-variant/30",
    badge: "text-taupe",
    iconBg: "bg-champagne text-taupe",
  },
  decision: {
    label: "Decision",
    icon: "call_split",
    border: "border-sage/30",
    badge: "text-emerald-muted",
    iconBg: "bg-sage-light text-emerald-muted",
  },
};

type WorkflowNodeCardProps = {
  node: WorkflowNode;
  onEdit: () => void;
  onDelete: () => void;
  showConnector?: boolean;
};

export function WorkflowNodeCard({ node, onEdit, onDelete, showConnector }: WorkflowNodeCardProps) {
  const style = kindStyles[node.kind];

  return (
    <div className="relative z-10 flex flex-col items-center">
      <div
        className={cn(
          "w-72 rounded-2xl border bg-ivory p-5 shadow-card transition-transform hover:-translate-y-0.5",
          style.border,
        )}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", style.iconBg)}>
            <Icon name={style.icon} className="text-[22px]" />
          </span>
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", style.badge)}>
            {style.label}
          </span>
        </div>
        <h4 className="font-medium text-ink">{node.title}</h4>
        <p className="mt-1 text-[13px] text-slate-text">{node.description}</p>
        {node.meta ? (
          <p className="mt-3 border-t border-outline-variant/15 pt-3 text-[11px] text-taupe">{node.meta}</p>
        ) : null}
        <div className="mt-3 flex justify-end gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full p-2 text-taupe hover:bg-champagne hover:text-ink"
            aria-label="Edit step"
          >
            <Icon name="settings" className="text-[18px]" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full p-2 text-taupe hover:bg-error-container/30 hover:text-error"
            aria-label="Delete step"
          >
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      </div>

      {node.kind === "decision" && node.decision ? (
        <div className="relative mt-16 flex w-[min(100%,420px)] justify-between gap-4 px-2">
          <div className="absolute left-1/2 top-0 h-px w-[85%] -translate-x-1/2 bg-outline-variant/30" />
          <div className="absolute left-[15%] top-0 h-12 w-px bg-rose-gold/40" />
          <div className="absolute right-[15%] top-0 h-12 w-px bg-rose-gold/40" />
          <div className="w-[46%] rounded-xl border border-emerald-muted/25 bg-ivory p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-muted" />
              <span className="text-[10px] font-bold uppercase text-emerald-muted">Yes</span>
            </div>
            <p className="text-[13px] font-medium text-ink">{node.decision.yes.title}</p>
            <p className="text-[12px] text-taupe">{node.decision.yes.description}</p>
          </div>
          <div className="w-[46%] rounded-xl border border-error/20 bg-ivory p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-error" />
              <span className="text-[10px] font-bold uppercase text-error">No</span>
            </div>
            <p className="text-[13px] font-medium text-ink">{node.decision.no.title}</p>
            <p className="text-[12px] text-taupe">{node.decision.no.description}</p>
          </div>
        </div>
      ) : null}

      {showConnector ? (
        <div className="absolute top-full left-1/2 h-14 w-px -translate-x-1/2 bg-rose-gold/35" aria-hidden />
      ) : null}
    </div>
  );
}
