"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { modalInputClass } from "@/components/crm/modal";
import { PropertyFinderActionCards } from "@/components/property-finder/property-finder-action-cards";
import {
  PropertyFinderBottomRow,
  type SuggestedStep,
} from "@/components/property-finder/property-finder-bottom-row";
import { PropertyFinderHero } from "@/components/property-finder/property-finder-hero";
import { PropertyFinderRecentContacts } from "@/components/property-finder/property-finder-recent-contacts";
import { PropertyFinderSavedSearches } from "@/components/property-finder/property-finder-saved-searches";
import { Icon } from "@/components/ui/icon";
import { useContacts } from "@/lib/hooks/use-contacts";
import { formatUsd } from "@/lib/mortgage/calculate";
import { PROPERTY_FINDER_PAGE } from "@/lib/dashboard/layout";
import { RECENT_CONTACTS_STORAGE_KEY } from "@/lib/property-finder/home-ui";
import { zillowSearchUrl } from "@/lib/property-finder/zillow";
import { useCallback, useEffect, useMemo, useState } from "react";

type TaskRow = {
  id: string;
  title: string;
  due_at?: string | null;
  completed?: boolean;
  contact_id?: string;
  contacts?: { first_name: string; last_name?: string | null } | null;
};

function pushRecentContact(id: string) {
  try {
    const raw = localStorage.getItem(RECENT_CONTACTS_STORAGE_KEY);
    const prev = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, 8);
    localStorage.setItem(RECENT_CONTACTS_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [id];
  }
}

function formatStepWhen(iso?: string | null) {
  if (!iso) return "Soon";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Soon";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) {
    return `Today, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function PropertyFinderPage() {
  const { contacts, loading, refresh } = useContacts();
  const [selectedId, setSelectedId] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [steps, setSteps] = useState<SuggestedStep[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_CONTACTS_STORAGE_KEY);
      if (raw) setRecentIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/tasks", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) return;
        const tasks = (data.tasks ?? []) as TaskRow[];
        const open = tasks.filter((t) => !t.completed).slice(0, 5);
        if (open.length === 0) return;
        setSteps(
          open.map((t) => {
            const fromJoin = t.contacts
              ? `${t.contacts.first_name} ${t.contacts.last_name ?? ""}`.trim()
              : "";
            const fromList = contacts.find((x) => x.id === t.contact_id);
            const name =
              fromJoin ||
              (fromList
                ? `${fromList.first_name} ${fromList.last_name ?? ""}`.trim()
                : "Client");
            return {
              id: t.id,
              contactId: t.contact_id,
              contactName: name,
              task: t.title,
              when: formatStepWhen(t.due_at),
            };
          }),
        );
      } catch {
        /* leave empty */
      }
    })();
  }, [contacts]);

  const contact = contacts.find((c) => c.id === selectedId) ?? null;

  const pickContact = useCallback(
    (id: string) => {
      setSelectedId(id);
      const next = contacts.find((c) => c.id === id);
      setArea(next?.preferred_area ?? "");
      setBudget(next?.budget != null ? String(next.budget) : "");
      setCopied(false);
      setSaveError(null);
      if (id) setRecentIds(pushRecentContact(id));
    },
    [contacts],
  );

  const pickContactAndOpenWorkspace = useCallback(
    (id: string) => {
      pickContact(id);
      window.requestAnimationFrame(() => {
        document.getElementById("client-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [pickContact],
  );

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
    <div className={PROPERTY_FINDER_PAGE}>
      <PropertyFinderHero
        contacts={contacts}
        loading={loading}
        selectedId={selectedId}
        onSelectContact={pickContact}
      />

      <PropertyFinderRecentContacts
        contacts={contacts}
        recentIds={recentIds}
        selectedId={selectedId}
        onSelect={pickContact}
      />

      <PropertyFinderActionCards />

      <PropertyFinderSavedSearches
        contacts={contacts}
        selectedId={selectedId}
        onSelect={pickContactAndOpenWorkspace}
      />

      <PropertyFinderBottomRow steps={steps} onSelectContact={pickContact} />

      <div id="client-workspace" className="scroll-mt-6">
        {contact ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <LuxuryCard padding="lg">
              <h2 className="font-serif text-[22px] font-semibold text-ink">Client criteria</h2>
              <p className="mt-1 text-[13px] text-slate-text">
                {`${contact.first_name} ${contact.last_name ?? ""}`.trim()}
              </p>
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
              <h2 className="font-serif text-[22px] font-semibold text-ink">Tailored Zillow search</h2>
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
          </div>
        ) : (
          <LuxuryCard padding="lg">
            <p className="text-[15px] text-slate-text">
              Select a client from the hero bar or recently opened contacts to set search criteria
              and share a tailored Zillow link.
            </p>
          </LuxuryCard>
        )}
      </div>
    </div>
  );
}
