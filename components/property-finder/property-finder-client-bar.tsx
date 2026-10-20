"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { useEffect, useMemo, useRef, useState } from "react";

function contactLabel(c: ApiContact) {
  return `${c.first_name} ${c.last_name ?? ""}`.trim();
}

type PropertyFinderClientBarProps = {
  contacts: ApiContact[];
  loading?: boolean;
  value: string;
  onChange: (contactId: string) => void;
};

export function PropertyFinderClientBar({
  contacts,
  loading = false,
  value,
  onChange,
}: PropertyFinderClientBarProps) {
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
    if (open) window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-full">
      <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-ivory shadow-card sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={() => !loading && setOpen((o) => !o)}
          disabled={loading}
          className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-outline-variant/15 px-4 py-3.5 text-left sm:w-[240px] sm:border-b-0 sm:border-r sm:py-4"
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <p className="whitespace-normal text-[11px] font-semibold uppercase tracking-[0.12em] text-taupe">
              Select a client
            </p>
            <p className={cn("truncate text-[14px] font-medium", selected ? "text-ink" : "text-taupe")}>
              {loading
                ? "Loading…"
                : selected
                  ? contactLabel(selected)
                  : "Choose client"}
            </p>
          </div>
          <Icon
            name={open ? "expand_less" : "expand_more"}
            className="shrink-0 text-[22px] text-taupe"
          />
        </button>
        <div className="relative flex min-w-0 flex-1 items-center px-4 py-3 sm:py-0">
          <Icon
            name="search"
            className="pointer-events-none absolute left-6 shrink-0 text-[20px] text-taupe"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => !loading && setOpen(true)}
            placeholder="Search by name, email, or phone…"
            className="h-11 w-full min-w-0 bg-transparent pl-11 pr-3 text-[14px] text-ink outline-none placeholder:text-taupe/80 sm:pl-12"
            autoComplete="off"
          />
        </div>
      </div>

      {open ? (
        <ul
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(280px,45vh)] overflow-y-auto rounded-2xl border border-outline-variant/20 bg-ivory py-1 shadow-card"
          role="listbox"
        >
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
      ) : null}
    </div>
  );
}
