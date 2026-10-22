"use client";

import { PROPERTY_PREFERENCE_FIELDS, type PropertyPreferenceDraft } from "@/lib/property-finder/preferences";

export function PropertyPreferencesEditor({value,onChange,error}: {
  value:PropertyPreferenceDraft; onChange:(next:PropertyPreferenceDraft)=>void; error:string | null;
}) {
  return <details className="pf-preferences-editor">
    <summary>Additional client preferences <span>Optional</span></summary>
    <p>Save what matters to your client. Zillow links currently include location and price; apply these additional preferences on Zillow.</p>
    <div className="pf-preferences-grid">{PROPERTY_PREFERENCE_FIELDS.map(field => <label key={field.key} htmlFor={`property-pref-${field.key}`}>
      <span>{field.label}</span><input id={`property-pref-${field.key}`} type={field.step === null ? "text" : "number"} step={field.step ?? undefined} min={field.key === "squareFeet" || field.key === "lotSquareFeet" ? 1 : 0} max={field.key === "propertyType" ? undefined : field.key === "beds" || field.key === "garageSpaces" ? 100 : undefined} maxLength={field.key === "propertyType" ? 80 : undefined} placeholder="Not specified" value={value[field.key]} onChange={event => onChange({...value,[field.key]:event.target.value})} />
    </label>)}</div>
    {error ? <p role="alert" className="pf-form-error">{error}</p> : null}
  </details>;
}
