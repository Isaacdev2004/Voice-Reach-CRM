"use client";

import { modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { useEffect, useMemo, useRef, useState } from "react";

function contactLabel(c: ApiContact) {
  return `${c.first_name} ${c.last_name ?? ""}`.trim();
}

type SearchableContactSelectProps = {
  contacts: ApiContact[];
  loading?: boolean;
  value: string;
  onChange: (contactId: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchableContactSelect({
  contacts,
  loading = false,
  value,
  onChange,
  placeholder = "Select a client",
  className,
}: SearchableContactSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = contacts.find((c) => c.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = contactLabel(c).toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      const phone = (c.phone ?? "").replace(/\D/g, "");
      const qDigits = q.replace(/\D/g, "");
      return (
        name.includes(q) ||
        email.includes(q) ||
        (qDigits.length >= 3 && phone.includes(qDigits))
      );
    });
  }, [contacts, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !loading && setOpen((o) => !o)}
        disabled={loading}
        className={cn(
          modalInputClass,
          "flex w-full items-center justify-between gap-2 border-rose-gold-deep/40 text-left disabled:opacity-60",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={cn("truncate", !selected && "text-taupe")}>
          {loading
            ? "Loading clients…"
            : selected
              ? contactLabel(selected)
              : placeholder}
        </span>
        <Icon name={open ? "expand_less" : "expand_more"} className="shrink-0 text-taupe" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-outline-variant/20 bg-ivory shadow-card">
          <div className="border-b border-outline-variant/10 p-2">
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, or phone"
                className="h-10 w-full rounded-xl border border-outline-variant/20 bg-champagne/40 pl-10 pr-3 text-[14px] text-ink outline-none focus:ring-2 focus:ring-rose-gold/20"
                autoComplete="off"
              />
            </div>
          </div>
          <ul className="max-h-[280px] overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-[13px] text-taupe">No clients match your search</li>
            ) : (
              filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.id === value}
                    onClick={() => pick(c.id)}
                    className={cn(
                      "flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-champagne",
                      c.id === value && "bg-rose-gold/10",
                    )}
                  >
                    <span className="text-[14px] font-medium text-ink">{contactLabel(c)}</span>
                    {(c.email || c.phone) && (
                      <span className="truncate text-[12px] text-taupe">{c.email ?? c.phone}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
