"use client";
import { useAiRecordContext } from "@/components/ai/ai-assistant-context";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ContactTasksPanel } from "@/components/crm/contact-tasks-panel";
import { AssignContactToCampaignModal } from "@/components/crm/assign-contact-to-campaign-modal";
import {PropertyLifestyleArt} from "@/components/property-finder/property-lifestyle-art";
import { PropertyFinderActionCards } from "@/components/property-finder/property-finder-action-cards";
import { PropertyFinderBottomRow, type SuggestedStep } from "@/components/property-finder/property-finder-bottom-row";
import { PropertyFinderHero } from "@/components/property-finder/property-finder-hero";
import { PropertyFinderRecentContacts } from "@/components/property-finder/property-finder-recent-contacts";
import { PropertyFinderSavedSearches } from "@/components/property-finder/property-finder-saved-searches";
import { PropertyPreferencesEditor } from "@/components/property-finder/property-preferences-editor";
import { changedPropertyPreferences, parsePropertyPreferences, propertyPreferenceDraft, savedPropertyPreferenceLabels } from "@/lib/property-finder/preferences";
import { PropertySearchWorkspace } from "@/components/property-finder/property-search-workspace";
import { Icon } from "@/components/ui/icon";
import { useContacts } from "@/lib/hooks/use-contacts";
import { notifyContactsChanged } from "@/lib/contacts/change-events";
import { formatUsd } from "@/lib/mortgage/calculate";
import { RECENT_CONTACTS_STORAGE_KEY } from "@/lib/property-finder/home-ui";
import { propertyBudget, restoredPropertyClient, rememberPropertyClient } from "@/lib/property-finder/criteria";
import { zillowSearchUrl } from "@/lib/property-finder/zillow";

type TaskRow = {id: string; title: string; due_at?: string | null; completed?: boolean; contact_id?: string; contacts?: {first_name:string; last_name?:string | null} | null};

function formatStepWhen(iso?: string | null) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "No date set";
  return new Date(iso).toLocaleDateString(undefined,{month:"short",day:"numeric"});
}

export function PropertyFinderPage() {
  const { user } = useUser();
  return <PropertyFinderWorkspace key={user?.id ?? "signed-out"} ownerId={user?.id} />;
}

function PropertyFinderWorkspace({ownerId}: {ownerId?:string}) {
  const {contacts, loading, error, refresh} = useContacts();
  const [mode, setMode] = useState<"properties" | "client">("properties");
  const [selectedId, setSelectedId] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [preferences, setPreferences] = useState(() => propertyPreferenceDraft());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [tasksError, setTasksError] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksVersion, setTasksVersion] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignmentStatus, setAssignmentStatus] = useState<string | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    if (!ownerId) return;
    try {
      const value = JSON.parse(localStorage.getItem(`${RECENT_CONTACTS_STORAGE_KEY}:${ownerId}`) || "[]");
      if (Array.isArray(value)) setRecentIds(value.filter((id): id is string => typeof id === "string").slice(0,8));
    } catch { /* History is optional; client selection remains available. */ }
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) return;
    const controller = new AbortController();
    setTasksLoading(true);setTasksError(false);
    void (async () => {
      try {
        const res = await fetch("/api/tasks",{cache:"no-store",signal:controller.signal});
        const data = await res.json();
        if (!res.ok || data.success === false || data.error || !Array.isArray(data.tasks)) throw new Error("Tasks unavailable");
        if (!controller.signal.aborted) setTasks(data.tasks);
      } catch { if (!controller.signal.aborted) setTasksError(true); }
      finally { if (!controller.signal.aborted) setTasksLoading(false); }
    })();
    return () => controller.abort();
  }, [ownerId,tasksVersion]);

  const steps: SuggestedStep[] = useMemo(() => tasks.filter(task => !task.completed).slice(0,5).map(task => {
    const related = contacts.find(contact => contact.id === task.contact_id);
    return {id:task.id,contactId:related?.id,contactName:related ? `${related.first_name} ${related.last_name ?? ""}`.trim() : "Follow-up",task:task.title,when:formatStepWhen(task.due_at)};
  }),[tasks,contacts]);

  const contact = contacts.find(row => row.id === selectedId) ?? null;
  useAiRecordContext({page:"/dashboard/properties",contactId:contact?.id});
  const parsedBudget = propertyBudget(budget);
  const parsedPreferences = parsePropertyPreferences(preferences);
  const budgetNumber = parsedBudget.value;
  const searchUrl = zillowSearchUrl({area,budget:budgetNumber});
  const pickContact = useCallback((id:string) => {
    const next = contacts.find(row => row.id === id);
    if (!next) return;
    setSelectedId(id); setArea(next.preferred_area ?? "");setBudget(next.budget == null ? "" : String(next.budget));setPreferences(propertyPreferenceDraft(next));
    setSaved(false);setSaveError(null);setCopied(false);setCopyError(false);setMode("client");setAssignOpen(false);setAssignmentStatus(null);
    try {if (ownerId) rememberPropertyClient(sessionStorage,ownerId,id);} catch { /* Selection remains usable without storage. */ }
    setRecentIds(previous => {
      const value = [id,...previous.filter(value => value !== id)].slice(0,8);
      try { if (ownerId) localStorage.setItem(`${RECENT_CONTACTS_STORAGE_KEY}:${ownerId}`,JSON.stringify(value)); } catch { /* Optional history. */ }
      return value;
    });
  },[contacts,ownerId]);

  useEffect(() => {
    if (!ownerId || loading || error || restored.current) return;
    restored.current = true;
    try {
      const requested = new URLSearchParams(window.location.search).get("contactId");
      const previous = contacts.find(c => c.id === requested) ?? restoredPropertyClient(sessionStorage,ownerId,contacts);
      if (previous) pickContact(previous.id);
    } catch { /* Optional client memory. */ }
  },[ownerId,loading,error,contacts,pickContact]);

  const pickContactAndOpenWorkspace = (id:string) => {
    pickContact(id);
    requestAnimationFrame(() => document.getElementById("client-workspace")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",block:"start"}));
  };
  const changeArea = (value:string) => {setArea(value);setSaved(false);setCopied(false);setCopyError(false);};
  const changeBudget = (value:string) => {setBudget(value);setSaved(false);setCopied(false);setCopyError(false);};

  const saveCriteria = async () => {
    if (!contact || saving || parsedBudget.error || parsedPreferences.error) return;
    setSaving(true);setSaved(false);setSaveError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({preferredArea:area.trim() || null,budget:budgetNumber,...(Object.keys(changedPropertyPreferences(contact,preferences)).length ? {propertyPreferences:changedPropertyPreferences(contact,preferences)} : {})})});
      const data = await res.json();
      if (!res.ok || data.success !== true || !data.contact || data.contact.id !== contact.id || data.contact.owner_id !== ownerId) {if (data.code === "property_preferences_unavailable") {setSaveError("Additional preferences are not available in this workspace yet. Your changes have not been saved.");return;}throw new Error("Unable to save");}
      await refresh();notifyContactsChanged();setSaved(true);
    } catch {setSaveError("Your search criteria could not be saved. Please try again.");}
    finally {setSaving(false);}
  };
  const copyLink = async () => {
    try {await navigator.clipboard.writeText(searchUrl);setCopied(true);setCopyError(false);}
    catch {setCopied(false);setCopyError(true);}
  };
  const smsHref = contact?.phone ? `sms:${contact.phone}?body=${encodeURIComponent(`Homes for you: ${searchUrl}`)}` : null;
  const emailHref = contact?.email ? `mailto:${contact.email}?subject=${encodeURIComponent("Homes I found for you")}&body=${encodeURIComponent(`I pulled a tailored search for you:\n\n${searchUrl}`)}` : null;

  return <div className="property-finder-page property-finder-premium">
    <PropertyFinderHero />
    <PropertySearchWorkspace mode={mode} onModeChange={setMode} contacts={contacts} loading={loading} selectedId={contact?.id ?? ""} onSelectContact={pickContact} area={area} onAreaChange={changeArea} budget={budget} onBudgetChange={changeBudget} budgetNumber={budgetNumber} budgetError={parsedBudget.error} preferenceError={parsedPreferences.error} preferencesEditor={mode === "client" && contact ? <PropertyPreferencesEditor value={preferences} onChange={next => {setPreferences(next);setSaved(false);}} error={parsedPreferences.error} /> : null} searchUrl={searchUrl} saving={saving} saveError={saveError} saved={saved} onSave={() => void saveCriteria()} />
    {mode === "client" ? <div className="pf-client-tools">
      {contact ? <section className="pf-client-share" aria-label="Selected client and Zillow sharing"><PropertyLifestyleArt tile={6} className="pf-client-hero-art"/>
        <div><p className="pf-eyebrow">TAILORED TO YOUR CLIENT</p><h2>{contact.first_name} {contact.last_name ?? ""}</h2><p>{area.trim() || "Any area"}{budgetNumber ? ` · up to ${formatUsd(budgetNumber)}` : ""}</p><p className="pf-client-contact">{contact.email || contact.phone || "No contact details on file"}{contact.lead_type || contact.type ? ` · ${contact.lead_type || contact.type}` : ""}</p>{savedPropertyPreferenceLabels(contact).length ? <div className="pf-client-preference-tags">{savedPropertyPreferenceLabels(contact).map(value => <span key={value}>{value}</span>)}</div> : null}<Link href={`/dashboard/contacts/${contact.id}`} className="pf-text-action">Open client profile →</Link></div>
        <div className="pf-share-actions"><button type="button" className="pf-save-button" disabled={Boolean(parsedBudget.error)} onClick={() => void copyLink()}>{copied ? "Copied" : "Copy link"}</button>{smsHref && !parsedBudget.error ? <a href={smsHref}>Text client</a> : null}{emailHref && !parsedBudget.error ? <a href={emailHref}>Email client</a> : null}<a href={searchUrl} target="_blank" rel="noreferrer">Open Zillow <span aria-hidden="true"><Icon name="open_in_new" className="text-[16px]" /></span></a></div>
        {copyError ? <p role="alert" className="pf-form-error">Copy isn&apos;t available. Open Zillow and copy the address from your browser.</p> : null}
      </section> : null}
      {contact ? <>
        <div className="pf-client-followups"><button type="button" className="pf-save-button" onClick={() => setAssignOpen(true)}>Assign to campaign</button><Link href="/dashboard/campaigns#campaign-builder" className="pf-text-action">Create a new campaign →</Link><span>Choose recipients in the campaign workflow.</span></div>
        {assignmentStatus ? <p role="status" className="pf-save-success">{assignmentStatus}</p> : null}
        <AssignContactToCampaignModal key={contact.id} open={assignOpen} onClose={() => setAssignOpen(false)} contactId={contact.id} contactName={`${contact.first_name} ${contact.last_name ?? ""}`.trim()} onAssigned={setAssignmentStatus} />
        <details className="pf-recent-disclosure"><summary>Follow-ups for {contact.first_name}</summary><ContactTasksPanel key={contact.id} contactId={contact.id} onChanged={() => setTasksVersion(value => value + 1)} /></details>
      </> : null}
      <details className="pf-recent-disclosure"><summary>Quick pick clients</summary><PropertyFinderRecentContacts contacts={contacts} recentIds={recentIds} selectedId={selectedId} onSelect={pickContact} /></details>
    </div> : null}
    <PropertyFinderActionCards onSearch={()=>{setMode("properties");requestAnimationFrame(()=>{document.getElementById("client-workspace")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});document.getElementById("property-location")?.focus({preventScroll:true});});}} />
    <PropertyFinderSavedSearches contacts={contacts} selectedId={selectedId} onSelect={pickContactAndOpenWorkspace} loading={loading} error={error} onRetry={() => void refresh()} />
    <section className="pf-suggestions" aria-labelledby="suggested-properties-heading">
      <div className="pf-section-heading"><div><h2 id="suggested-properties-heading">Suggested properties</h2><p>Your clients&apos; next chapter starts with the right search.</p></div></div>
      <div className="pf-listings-empty"><span className="pf-empty-icon" aria-hidden="true"><Icon name="home_work" /></span><div><h3>Find a home worth a closer look.</h3><p>Explore current listings on Zillow using your area and budget, then share a tailored search with your client.</p></div><a href={searchUrl} target="_blank" rel="noreferrer" className="pf-save-button">Search listings <span aria-hidden="true"><Icon name="open_in_new" className="text-[16px]" /></span></a></div>
    </section>
    <details className="pf-followup-disclosure"><summary>Client follow-ups & insights</summary>{tasksLoading ? <p role="status" className="pf-inline-state">Loading follow-ups…</p> : tasksError ? <p className="pf-inline-state">Follow-ups are unavailable. <Link href="/dashboard/tasks" className="pf-text-action">Open Tasks →</Link></p> : <PropertyFinderBottomRow steps={steps} onSelectContact={pickContactAndOpenWorkspace} />}</details>
  </div>;
}
