"use client";

import { useId, useRef, type ReactNode } from "react";
import { PropertyFinderClientBar } from "./property-finder-client-bar";
import { Icon } from "@/components/ui/icon";
import { formatUsd } from "@/lib/mortgage/calculate";
import type { ApiContact } from "@/lib/hooks/use-contacts";

export function PropertySearchWorkspace(props: {
  mode: "properties" | "client"; onModeChange: (value: "properties" | "client") => void;
  contacts: ApiContact[]; loading: boolean; selectedId: string; onSelectContact: (id: string) => void;
  area: string; onAreaChange: (value: string) => void; budget: string; onBudgetChange: (value: string) => void;
  budgetNumber: number | null; budgetError: string | null; searchUrl: string;
  preferencesEditor?: ReactNode; preferenceError?: string | null;
  onSearch?: () => void;
  saving: boolean; saveError: string | null; saved: boolean; onSave: () => void;
}) {
  const { mode, onModeChange } = props;
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  return <section id="client-workspace" className="pf-search-workspace" aria-label="Property search workspace">
    <div className="pf-search-tabs" role="tablist" aria-label="Property search mode">
      {(["properties","client"] as const).map((tab,index) => <button key={tab} ref={node => {tabs.current[index]=node;}} type="button" role="tab" id={`${id}-${tab}`} aria-controls={`${id}-panel`} aria-selected={mode===tab} tabIndex={mode===tab ? 0 : -1} onClick={() => onModeChange(tab)} onKeyDown={event => {
        if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
        event.preventDefault();const next = event.key==="Home" ? 0 : event.key==="End" ? 1 : 1-index;
        onModeChange(next ? "client" : "properties");tabs.current[next]?.focus();
      }}><span aria-hidden="true"><Icon name={tab==="properties" ? "search" : "person_outline"} /></span>{tab==="properties" ? "Find Properties" : "Search by Client"}</button>)}
    </div>
    <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${mode}`}>
      {mode === "client" ? <div className="pf-client-selector"><PropertyFinderClientBar contacts={props.contacts} loading={props.loading} value={props.selectedId} onChange={props.onSelectContact} /></div> : null}
      <form className="pf-location-search" onSubmit={event => {event.preventDefault();if (!props.budgetError) {window.open(props.searchUrl,"_blank","noopener,noreferrer");props.onSearch?.();}}}>
        <label className="pf-location-field"><span aria-hidden="true"><Icon name="search" /></span><input id="property-location" type="search" maxLength={200} aria-label="Location, address or ZIP" placeholder="Enter a city, neighborhood, address, or ZIP code…" value={props.area} onChange={event => props.onAreaChange(event.target.value)} /></label>
        <button type="submit" className="pf-primary-button" disabled={Boolean(props.budgetError)}>Search Properties <span aria-hidden="true"><Icon name="arrow_forward" /></span></button>
      </form>
      <div className="pf-search-controls">
        <details className="pf-price-filter"><summary><span aria-hidden="true"><Icon name="payments" /></span>{props.budgetNumber ? `Up to ${formatUsd(props.budgetNumber)}` : "Price"}<span aria-hidden="true"><Icon name="expand_more" /></span></summary>
          <div><label htmlFor="property-max-price">Maximum price</label><input id="property-max-price" inputMode="decimal" placeholder="Any price" value={props.budget} aria-invalid={Boolean(props.budgetError)} aria-describedby={props.budgetError ? "property-budget-error" : undefined} onChange={event => props.onBudgetChange(event.target.value)} /><button type="button" className="pf-text-action" onClick={event => event.currentTarget.closest("details")?.removeAttribute("open")}>Done</button></div>
        </details>
        <p className="pf-search-provider">Zillow external search · location & maximum price</p>
        <button type="button" className="pf-save-button" disabled={!props.selectedId || props.loading || props.saving || Boolean(props.budgetError) || Boolean(props.preferenceError)} title={!props.selectedId ? "Select a client to save their search criteria" : "Save preferences to the selected client"} onClick={props.onSave}><span aria-hidden="true"><Icon name="bookmark_border" /></span>{props.saving ? "Saving…" : "Save Search"}</button>
      </div>
      {props.preferencesEditor}
      {!props.selectedId ? <p className="pf-workspace-hint">Choose Search by Client to save criteria and share a tailored search.</p> : null}
      {props.budgetError ? <p id="property-budget-error" role="alert" className="pf-form-error">{props.budgetError}</p> : null}
      {props.saveError ? <p role="alert" className="pf-form-error">{props.saveError}</p> : null}
      {props.saved ? <p role="status" className="pf-save-success">Search criteria saved to this client.</p> : null}
    </div>
  </section>;
}
