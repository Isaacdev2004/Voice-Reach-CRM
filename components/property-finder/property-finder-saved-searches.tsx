"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { formatUsd } from "@/lib/mortgage/calculate";

function contactLabel(c: ApiContact) {
  return `${c.first_name} ${c.last_name ?? ""}`.trim();
}

function budgetNumber(c: ApiContact): number | null {
  if (c.budget == null || c.budget === "") return null;
  const n = typeof c.budget === "number" ? c.budget : Number(String(c.budget).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function hasSavedCriteria(c: ApiContact) {
  const area = (c.preferred_area ?? "").trim();
  return Boolean(area || budgetNumber(c));
}

type PropertyFinderSavedSearchesProps = {
  contacts: ApiContact[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function PropertyFinderSavedSearches({
  contacts,
  selectedId,
  onSelect,
}: PropertyFinderSavedSearchesProps) {
  const saved = contacts.filter(hasSavedCriteria).sort((a, b) =>
    contactLabel(a).localeCompare(contactLabel(b)),
  );

  return (
    <section id="saved-searches" className="scroll-mt-6">
      <div className="mb-4">
        <h2 className="font-serif text-[22px] font-semibold text-ink">Saved searches</h2>
        <p className="mt-1 text-[13px] text-slate-text">
          Area and budget saved on each contact — open one to share a tailored Zillow link.
        </p>
      </div>
      {saved.length === 0 ? (
        <LuxuryCard padding="lg">
          <p className="text-[15px] text-slate-text">
            No saved criteria yet. Select a client below, set their preferred area and budget, then
            choose &ldquo;Save criteria to this client.&rdquo;
          </p>
        </LuxuryCard>
      ) : (
        <LuxuryCard padding="none" className="overflow-hidden">
          <ul className="divide-y divide-outline-variant/10">
            {saved.map((c) => {
              const active = c.id === selectedId;
              const area = (c.preferred_area ?? "").trim() || "Any area";
              const b = budgetNumber(c);
              const budget = b ? ` · up to ${formatUsd(b)}` : "";
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-champagne/60",
                      active && "bg-rose-gold/10",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-champagne">
                      <Icon name="bookmark" className="text-[20px] text-rose-gold-deep" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">
                        {contactLabel(c)}
                      </span>
                      <span className="block truncate text-[13px] text-slate-text">
                        {area}
                        {budget}
                      </span>
                    </span>
                    <Icon name="chevron_right" className="shrink-0 text-[22px] text-taupe" />
                  </button>
                </li>
              );
            })}
          </ul>
        </LuxuryCard>
      )}
    </section>
  );
}
