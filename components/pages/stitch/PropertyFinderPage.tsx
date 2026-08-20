"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { useContacts } from "@/lib/hooks/use-contacts";
import { formatUsd } from "@/lib/mortgage/calculate";
import { zillowSearchUrl } from "@/lib/property-finder/zillow";
import { useMemo, useState } from "react";

function contactName(c: ApiContact) {
  return `${c.first_name} ${c.last_name ?? ""}`.trim();
}

export function PropertyFinderPage() {
  const { contacts, loading, refresh } = useContacts();
  const [selectedId, setSelectedId] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const contact = contacts.find((c) => c.id === selectedId) ?? null;

  const pickContact = (id: string) => {
    setSelectedId(id);
    const next = contacts.find((c) => c.id === id);
    setArea(next?.preferred_area ?? "");
    setBudget(next?.budget != null ? String(next.budget) : "");
    setCopied(false);
    setSaveError(null);
  };

  const budgetNumber = Number(budget.replace(/,/g, "")) || null;
  const searchUrl = useMemo(
    () => zillowSearchUrl({ area, budget: budgetNumber }),
    [area, budgetNumber],
  );

  const saveCriteria = async () => {
    if (!contact) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredArea: area.trim() || null,
          budget: budgetNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save criteria");
      await refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save criteria");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(searchUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const smsHref = contact?.phone
    ? `sms:${contact.phone}?body=${encodeURIComponent(`Homes for you: ${searchUrl}`)}`
    : null;
  const emailHref = contact?.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent("Homes I found for you")}&body=${encodeURIComponent(`I pulled a tailored search for you:\n\n${searchUrl}`)}`
    : null;

  return (
    <div className="luxury-page mx-auto w-full max-w-[720px] space-y-8 p-4 sm:p-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">Search</p>
        <h1 className="mt-1 font-serif text-[36px] font-semibold text-ink">Property Finder</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          Select a client to generate a tailored Zillow search from their criteria, then send it in
          one tap.
        </p>
      </header>

      <label className="block">
        <span className="mb-2 block text-[13px] font-medium text-taupe">Client</span>
        <select
          className={cn(modalInputClass, "border-rose-gold-deep/40")}
          value={selectedId}
          onChange={(e) => pickContact(e.target.value)}
        >
          <option value="">{loading ? "Loading clients…" : "Select a client"}</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {contactName(c)}
            </option>
          ))}
        </select>
      </label>

      {contact ? (
        <>
          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[22px] font-semibold text-ink">Client Criteria</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 flex items-center gap-1 text-[13px] font-medium text-taupe">
                  <Icon name="location_on" className="text-[16px]" />
                  Preferred area
                </span>
                <input
                  className={modalInputClass}
                  placeholder="City, neighborhood, or zip"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </label>
              <label>
                <span className="mb-2 block text-[13px] font-medium text-taupe">Budget</span>
                <input
                  className={modalInputClass}
                  inputMode="numeric"
                  placeholder="3200000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </label>
              <div>
                <p className="mb-2 text-[13px] font-medium text-taupe">Client type</p>
                <span className="inline-flex rounded-full bg-champagne px-3 py-1 text-[13px] font-medium text-ink">
                  {contact.lead_type
                    ? contact.lead_type.charAt(0).toUpperCase() + contact.lead_type.slice(1)
                    : contact.type ?? "Client"}
                </span>
              </div>
            </div>
            {contact.email ? (
              <p className="mt-4 text-[13px] text-slate-text">Contact · {contact.email}</p>
            ) : contact.phone ? (
              <p className="mt-4 text-[13px] text-slate-text">Contact · {contact.phone}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void saveCriteria()}
              className="mt-5 text-[13px] font-medium text-rose-gold-deep hover:underline"
            >
              {saving ? "Saving…" : "Save criteria to this client"}
            </button>
            {saveError ? <p className="mt-2 text-[13px] text-error">{saveError}</p> : null}
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <h2 className="font-serif text-[22px] font-semibold text-ink">Tailored Zillow Search</h2>
            <p className="mt-2 text-[14px] text-slate-text">
              {area.trim() ? area.trim() : "Any area"}
              {budgetNumber ? ` · up to ${formatUsd(budgetNumber)}` : ""}
            </p>
            <a
              href={searchUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block break-all rounded-2xl bg-cream px-4 py-3 text-[13px] text-rose-gold-deep hover:underline"
            >
              {searchUrl}
            </a>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="rounded-full bg-rose-gold-deep px-5 py-2.5 text-[14px] font-medium text-ivory"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              {smsHref ? (
                <a
                  href={smsHref}
                  className="rounded-full border border-outline-variant/30 px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-champagne"
                >
                  Text client
                </a>
              ) : null}
              {emailHref ? (
                <a
                  href={emailHref}
                  className="rounded-full border border-outline-variant/30 px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-champagne"
                >
                  Email client
                </a>
              ) : null}
              <a
                href={searchUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-outline-variant/30 px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-champagne"
              >
                Open Zillow
              </a>
            </div>
          </LuxuryCard>
        </>
      ) : (
        <LuxuryCard>
          <p className="text-[15px] text-slate-text">
            Choose a client to see their budget, area, and a Zillow link you can send in one tap.
          </p>
        </LuxuryCard>
      )}
    </div>
  );
}
