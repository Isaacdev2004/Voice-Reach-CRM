"use client";

import { useState } from "react";
import { ContactAvatar } from "@/components/crm/contact-avatar";
import { Icon } from "@/components/ui/icon";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { formatUsd } from "@/lib/mortgage/calculate";
import { savedPropertyCriteria } from "@/lib/property-finder/criteria";

export function PropertyFinderSavedSearches({ contacts, selectedId, onSelect, loading, error, onRetry }: {
  contacts: ApiContact[]; selectedId: string; onSelect: (id: string) => void;
  loading?: boolean; error?: string | null; onRetry?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const saved = contacts.filter(contact => savedPropertyCriteria(contact).hasCriteria).sort((a,b) => `${a.first_name} ${a.last_name ?? ""}`.localeCompare(`${b.first_name} ${b.last_name ?? ""}`));
  return <section id="saved-searches" className="pf-saved-section">
    <div className="pf-section-heading"><div><h2>Saved searches</h2><p>Area and budget saved with your clients, ready for their next search.</p></div>
      {saved.length > 4 ? <button type="button" className="pf-text-action" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? "Show fewer" : `View all (${saved.length})`} <span aria-hidden="true">→</span></button> : null}
    </div>
    {loading ? <div className="pf-inline-state" role="status">Loading saved searches…</div> : error ? <div className="pf-inline-state" role="alert"><p>Saved searches are unavailable right now.</p><button type="button" className="pf-text-action" onClick={onRetry}>Retry clients</button></div> : !saved.length ? <div className="pf-inline-state"><span aria-hidden="true"><Icon name="bookmark_border" /></span><div><h3>A place for your clients&apos; next chapter.</h3><p>Select a client and save their search preferences to build a search.</p></div></div> : <div className="pf-saved-grid">
      {(expanded ? saved : saved.slice(0,4)).map(contact => {
        const criteria = savedPropertyCriteria(contact);
        const name = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
        return <button key={contact.id} type="button" className="pf-saved-card" aria-pressed={selectedId === contact.id} aria-label={`Open saved search for ${name}`} onClick={() => onSelect(contact.id)}>
          <ContactAvatar firstName={contact.first_name} lastName={contact.last_name} size="sm" />
          <span className="pf-saved-copy"><strong>{name}</strong><span>{criteria.area || "Area not specified"}</span><span className="pf-saved-budget">{criteria.budget ? `Up to ${formatUsd(criteria.budget)}` : "Budget not specified"}</span>{criteria.preferences.length ? <span className="pf-saved-preferences">{criteria.preferences.slice(0,3).join(" · ")}</span> : null}</span>
          <span className="pf-saved-arrow" aria-hidden="true"><Icon name="chevron_right" /></span>
        </button>;
      })}
    </div>}
  </section>;
}
