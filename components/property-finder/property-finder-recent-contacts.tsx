"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import Link from "next/link";

function contactLabel(c: ApiContact) {
  return `${c.first_name} ${c.last_name ?? ""}`.trim();
}

function roleLabel(c: ApiContact) {
  if (c.lead_type) {
    const t = c.lead_type.replace(/_/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  if (c.type) return c.type.charAt(0).toUpperCase() + c.type.slice(1);
  return "Contact";
}

function initials(c: ApiContact) {
  const a = c.first_name?.[0] ?? "";
  const b = c.last_name?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function contactLabelSort(a: ApiContact, b: ApiContact) {
  return contactLabel(a).localeCompare(contactLabel(b));
}

function buildQuickPickList(
  contacts: ApiContact[],
  recentIds: string[],
  selectedId: string,
): ApiContact[] {
  const seen = new Set<string>();
  const out: ApiContact[] = [];
  const add = (c: ApiContact | undefined) => {
    if (!c || seen.has(c.id)) return;
    seen.add(c.id);
    out.push(c);
  };
  if (selectedId) add(contacts.find((c) => c.id === selectedId));
  for (const id of recentIds) add(contacts.find((c) => c.id === id));
  for (const c of [...contacts].sort(contactLabelSort)) add(c);
  return out.slice(0, 8);
}

type PropertyFinderRecentContactsProps = {
  contacts: ApiContact[];
  recentIds: string[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function PropertyFinderRecentContacts({
  contacts,
  recentIds,
  selectedId,
  onSelect,
}: PropertyFinderRecentContactsProps) {
  const recentSet = new Set(recentIds);
  const display = buildQuickPickList(contacts, recentIds, selectedId);

  if (display.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-[22px] font-semibold text-ink">Quick pick clients</h2>
          <p className="mt-1 text-[13px] text-slate-text">
            Everyone stays visible here. &ldquo;Opened here&rdquo; means you selected them on Property
            Finder — not live client activity.
          </p>
        </div>
        <Link
          href="/dashboard/contacts"
          className="text-[13px] font-medium text-rose-gold-deep hover:underline"
        >
          View all contacts →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {display.map((c) => {
          const active = c.id === selectedId;
          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(c.id);
                }
              }}
              className={cn(
                "flex min-w-[200px] max-w-[220px] shrink-0 cursor-pointer flex-col rounded-2xl border bg-ivory p-4 text-left shadow-card transition-colors",
                active
                  ? "border-rose-gold/40 ring-1 ring-rose-gold/20"
                  : "border-outline-variant/10 hover:border-outline-variant/25",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-champagne font-serif text-[15px] font-semibold text-rose-gold-deep">
                  {initials(c)}
                </span>
                <span className="rounded-full p-1 text-taupe" aria-hidden>
                  <Icon name="more_horiz" className="text-[20px]" />
                </span>
              </div>
              <p className="mt-3 truncate text-[15px] font-semibold text-ink">{contactLabel(c)}</p>
              <p className="text-[12px] text-taupe">{roleLabel(c)}</p>
              {recentSet.has(c.id) ? (
                <p className="mt-2 text-[11px] font-medium text-rose-gold-deep">Opened here</p>
              ) : (
                <p className="mt-2 text-[11px] text-taupe">In your contacts</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
