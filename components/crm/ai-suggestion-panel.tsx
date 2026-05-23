"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { AiSuggestion } from "@/lib/crm/types";
import Link from "next/link";
import { LuxuryCard } from "./luxury-card";

const priorityStyles = {
  high: "border-l-rose-gold-deep",
  medium: "border-l-bronze",
  low: "border-l-sage",
};

type AiSuggestionPanelProps = {
  title?: string;
  suggestions: AiSuggestion[];
  onAction?: (id: string) => void;
  className?: string;
};

export function AiSuggestionPanel({
  title = "AI Assistant",
  suggestions,
  onAction,
  className,
}: AiSuggestionPanelProps) {
  return (
    <LuxuryCard className={cn("border-l-4 border-l-rose-gold/40", className)}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-gold/15 text-rose-gold-deep">
          <Icon name="auto_awesome" className="text-[20px]" />
        </div>
        <div>
          <h3 className="font-serif text-[20px] font-semibold text-ink">{title}</h3>
          <p className="text-[12px] text-taupe">Suggestions — not automated yet</p>
        </div>
      </div>
      <ul className="space-y-3">
        {suggestions.map((s) => (
          <li
            key={s.id}
            className={cn(
              "rounded-2xl border border-outline-variant/10 border-l-4 bg-cream/50 p-4",
              priorityStyles[s.priority],
            )}
          >
            <p className="font-medium text-ink">{s.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-text">{s.description}</p>
            {s.actionLabel ? (
              s.actionHref ? (
                <Link
                  href={s.actionHref}
                  className="mt-3 inline-block text-[13px] font-medium text-rose-gold-deep transition-colors hover:text-bronze"
                >
                  {s.actionLabel} →
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onAction?.(s.id)}
                  className="mt-3 text-[13px] font-medium text-rose-gold-deep transition-colors hover:text-bronze"
                >
                  {s.actionLabel} →
                </button>
              )
            ) : null}
          </li>
        ))}
      </ul>
    </LuxuryCard>
  );
}
