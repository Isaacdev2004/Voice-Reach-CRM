"use client";

import { useContactViewMemory } from "@/lib/hooks/use-contact-view-memory";
import { notifyContactsChanged } from "@/lib/contacts/change-events";
import { contactMetricCounts } from "@/lib/contacts/metrics";
import { contactLastActivity, contactConsentStatus as consentStatus, filterWorkspaceContacts, sortWorkspaceContacts, readWorkspaceState, type ContactSort } from "@/lib/contacts/workspace";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { CompliancePanel } from "@/components/crm/compliance-panel";
import { ComplianceBadge } from "@/components/crm/compliance-badge";
import { ContactAvatar } from "@/components/crm/contact-avatar";
import { ContactsLuxuryHero } from "@/components/crm/contacts-luxury-hero";
import { ContactPreviewPanel } from "@/components/crm/contact-preview-panel";
import { KpiCard } from "@/components/crm/kpi-card";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";

import {
  CONTACT_SEGMENT_TABS,
  CONTACT_TYPE_OPTIONS,
  contactSegment,
  segmentBadgeClass,
  segmentBadgeLabel,
  type ContactSegment,
} from "@/lib/contacts/lifecycle";
import { mergeCategoryLists, DEFAULT_CONTACT_CATEGORIES } from "@/lib/contacts/categories";
import { ManageCategoriesModal } from "@/components/crm/manage-categories-modal";
import { ContactMobileList } from "@/components/crm/contact-mobile-list";
import { RelationshipPulseSection } from "@/components/crm/relationship-pulse-section";
import { useContacts, type ApiContact } from "@/lib/hooks/use-contacts";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import type { PulseLaneId, RelationshipPulseResult } from "@/lib/contacts/relationship-pulse";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";


function contactFilterPill(active: boolean, variant: "category" | "stage" | "sort") {
  return cn(
    "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors sm:px-3.5 sm:py-2 sm:text-[13px]",
    active
      ? variant === "stage"
        ? "bg-sage text-ivory shadow-sm"
        : "bg-rose-gold-deep text-ivory shadow-sm"
      : "border border-outline-variant/20 bg-ivory text-taupe hover:border-rose-gold/30 hover:bg-champagne",
  );
}

export function ContactManagementPage() {
  const { user } = useUser();
  return <ContactManagementWorkspace key={user?.id ?? "signed-out"} ownerId={user?.id} />;
}

function ContactManagementWorkspace({ ownerId }: { ownerId?: string }) {
  useContactViewMemory(ownerId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = readWorkspaceState(searchParams);
  const { segment, category, sort, search: viewQuery, q: headerQuery, source: sourceFilter, activity: activityFilter, type: typeFilter, compliance: complianceFilter } = state;
  const updateFilter = (key: string, value: string, replace = false) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || !value || (key === "sort" && value === "name-asc")) params.delete(key);
    else params.set(key, value);
    if (key === "category") params.delete("market");
    if (key !== "page") params.delete("page");
    setSelected({});
    const url = `/dashboard/contacts${params.size ? `?${params}` : ""}`;
    if (replace) window.history.replaceState(null, "", url); else router.push(url, { scroll: false });
  };
  const setSegment = (value: ContactSegment) => updateFilter("segment", value);
  const setCategory = (value: string) => updateFilter("category", value);
  const setSort = (value: ContactSort) => updateFilter("sort", value);
  const [customCategories, setCustomCategories] = useState<string[]>([
    ...DEFAULT_CONTACT_CATEGORIES,
  ]);
  const [manageCatsOpen, setManageCatsOpen] = useState(false);
  const { contacts, loading, error, refresh, meta } = useContacts();
  const rows: ApiContact[] = contacts;
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pulse, setPulse] = useState<RelationshipPulseResult | null>(null);
  const [pulseLoading, setPulseLoading] = useState(true);
  const [activePulseLane, setActivePulseLane] = useState<PulseLaneId | null>(null);
  const [pulseToast, setPulseToast] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  useEffect(() => { setMobileFiltersOpen(window.matchMedia("(min-width: 768px)").matches); }, []);

  const loadPulse = useCallback(async () => {
    setPulseLoading(true);
    const envelope = await safeFetch<RelationshipPulseResult>(
      "/api/contacts/relationship-pulse?ai=1",
    );
    setPulseLoading(false);
    if (envelope.success) setPulse(envelope.data);
    else setPulse(null);
  }, []);

  useEffect(() => {
    void loadPulse();
  }, [loadPulse]);

  const pulseFilterIds = useMemo(() => {
    if (!activePulseLane || !pulse) return null;
    const lane = pulse.lanes.find((l) => l.id === activePulseLane);
    if (!lane?.contacts.length) return new Set<string>();
    return new Set(lane.contacts.map((c) => c.contactId));
  }, [activePulseLane, pulse]);

  const viewRows = filterWorkspaceContacts(rows, state).filter(contact => !pulseFilterIds || pulseFilterIds.has(contact.id));
  const viewCounts = contactMetricCounts(viewRows);
  const sortedRows = sortWorkspaceContacts(viewRows, segment, sort);
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const page = Math.min(state.page, pages);
  const pageRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const previewContact = pageRows.find(c => c.id === previewId) ?? pageRows[0];
  const total = meta?.total;

  const selectableRows = pageRows;
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkOpen, setBulkOpen] = useState<null | "consent" | "delete" | "type" | "category">(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkType, setBulkType] = useState("Residential Lead");
  const [bulkCategory, setBulkCategory] = useState("Residential");
  const [bulkConsent, setBulkConsent] = useState({
    consent: "Yes" as "Yes" | "No" | "Unknown",
    consentDate: new Date().toISOString().slice(0, 10),
    consentSource: "",
    proof: "",
  });

  const selectedIds = useMemo(
    () => sortedRows.filter(contact => selected[contact.id]).map(contact => contact.id),
    [selected, sortedRows],
  );
  const allSelected = selectableRows.length > 0 && selectableRows.every(contact => selected[contact.id]);

  const validated = rows.filter((c) => consentStatus(c) === "valid").length;
  const dncCount = rows.filter((c) => c.dnc || consentStatus(c) === "blocked").length;

  const toggleAll = () => {
    if (!selectableRows.length) return;
    setSelected(previous => {
      const next = { ...previous };
      for (const contact of selectableRows) {
        if (allSelected) delete next[contact.id]; else next[contact.id] = true;
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setPreviewId(id);
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const closeBulk = () => {
    setBulkError(null);
    setBulkSubmitting(false);
    setBulkOpen(null);
  };

  const runBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Delete ${selectedIds.length} contact${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    )
      return;
    setBulkSubmitting(true);
    setBulkError(null);
    const envelope = await safeFetch<{ deleted: number }>("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: selectedIds }),
    });
    setBulkSubmitting(false);
    if (!envelope.success) {
      setBulkError(envelope.error);
      return;
    }
    setSelected({});
    closeBulk();
    notifyContactsChanged();
    void refresh();
    void loadPulse();
  };

  const runBulkType = async () => {
    if (selectedIds.length === 0) return;
    setBulkSubmitting(true);
    setBulkError(null);
    const envelope = await safeFetch<{ updated: number }>("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_type", ids: selectedIds, type: bulkType }),
    });
    setBulkSubmitting(false);
    if (!envelope.success) {
      setBulkError(envelope.error);
      return;
    }
    setSelected({});
    closeBulk();
    notifyContactsChanged();
    void refresh();
    void loadPulse();
  };

  const counts = meta?.counts;
  const categoryTabs = useMemo(() => mergeCategoryLists([...DEFAULT_CONTACT_CATEGORIES, ...(meta?.categories ?? customCategories)]), [meta?.categories, customCategories]);
  const typeOptions = Array.from(new Set([...CONTACT_TYPE_OPTIONS.map(option => option.value), ...rows.flatMap(contact => contact.type ? [contact.type] : [])]));

  const runBulkCategory = async () => {
    if (selectedIds.length === 0) return;
    setBulkSubmitting(true);
    setBulkError(null);
    const envelope = await safeFetch<{ updated: number }>("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set_category",
        ids: selectedIds,
        category: bulkCategory || null,
      }),
    });
    setBulkSubmitting(false);
    if (!envelope.success) {
      setBulkError(envelope.error);
      return;
    }
    setSelected({});
    closeBulk();
    notifyContactsChanged();
    void refresh();
    void loadPulse();
  };

  const runBulkConsent = async () => {
    if (selectedIds.length === 0) return;
    setBulkSubmitting(true);
    setBulkError(null);
    const envelope = await safeFetch<{ updated: number }>("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_consent", ids: selectedIds, ...bulkConsent }),
    });
    setBulkSubmitting(false);
    if (!envelope.success) {
      setBulkError(envelope.error);
      return;
    }
    setSelected({});
    closeBulk();
    notifyContactsChanged();
    void refresh();
    void loadPulse();
  };

  const openMetric = (stage: ContactSegment) => {
    setActivePulseLane(null); setSelected({});
    router.push(`/dashboard/contacts${stage === "all" ? "" : `?segment=${stage}`}`, { scroll: false });
  };
  const clearAll = () => { setActivePulseLane(null); setSelected({}); router.push("/dashboard/contacts", { scroll: false }); };
  const filterLabels: Record<string, string> = {category:"Category", type:"Type", segment:"Stage", source:"Source", compliance:"Compliance", activity:"Last Activity", search:"Search", q:"Top-bar search"};

  return (
    <div className={DASHBOARD_PAGE_BODY}>
      <ManageCategoriesModal
        open={manageCatsOpen}
        onClose={() => setManageCatsOpen(false)}
        categories={categoryTabs}
        onChanged={(next) => {
          setCustomCategories(next);
          if (category !== "all" && !next.some(name => name.toLowerCase() === category.toLowerCase())) setCategory("all");
          notifyContactsChanged();
          void refresh();
          void loadPulse();
        }}
      />
      <BulkConsentModal
        open={bulkOpen === "consent"}
        onClose={bulkSubmitting ? () => undefined : closeBulk}
        count={selectedIds.length}
        value={bulkConsent}
        onChange={setBulkConsent}
        onSubmit={() => void runBulkConsent()}
        submitting={bulkSubmitting}
        error={bulkError}
      />
      <BulkDeleteModal
        open={bulkOpen === "delete"}
        onClose={bulkSubmitting ? () => undefined : closeBulk}
        count={selectedIds.length}
        onSubmit={() => void runBulkDelete()}
        submitting={bulkSubmitting}
        error={bulkError}
      />
      <BulkTypeModal
        open={bulkOpen === "type"}
        onClose={bulkSubmitting ? () => undefined : closeBulk}
        count={selectedIds.length}
        value={bulkType}
        options={typeOptions}
        onChange={setBulkType}
        onSubmit={() => void runBulkType()}
        submitting={bulkSubmitting}
        error={bulkError}
      />
      <BulkCategoryModal
        open={bulkOpen === "category"}
        onClose={bulkSubmitting ? () => undefined : closeBulk}
        count={selectedIds.length}
        value={bulkCategory}
        options={categoryTabs}
        onChange={setBulkCategory}
        onSubmit={() => void runBulkCategory()}
        submitting={bulkSubmitting}
        error={bulkError}
      />
      <ContactsLuxuryHero onRefresh={() => { void refresh(); void loadPulse(); }} />
      <div className="contacts-kpi-grid">
        {[
          { id: "total", segment: "all" as const, label: "Total Contacts", value: total, icon: "group" },
          { id: "cold", segment: "cold-lead" as const, label: "Cold Leads", value: counts?.coldLead, icon: "handshake" },
          { id: "active", segment: "active-lead" as const, label: "Active Leads", value: counts?.activeLead, icon: "local_fire_department" },
          { id: "past", segment: "past-client" as const, label: "Past Clients", value: counts?.pastClient, icon: "verified_user" },
        ].map(kpi => <button key={kpi.id} type="button" className="contacts-metric-button" disabled={loading || Boolean(error)} onClick={() => openMetric(kpi.segment)} aria-label={`${kpi.label}: ${loading ? "loading" : kpi.value ?? "unavailable"}. Show all matching contacts`}><KpiCard id={kpi.id} label={kpi.label} value={loading ? "…" : kpi.value?.toLocaleString() ?? "—"} icon={kpi.icon} compact luxury /></button>)}
      </div>
      <p className="contacts-metric-scope">Summary: all contacts in your workspace. Tabs below reflect the current filters.</p>
      <div className="contacts-workspace">
        <div className="contacts-toolbar">
          <div className="contacts-stage-tabs" aria-label="Contact lifecycle">
            {CONTACT_SEGMENT_TABS.map(tab => {
              const count = !meta ? undefined : tab.id === "all" ? viewCounts.all : tab.id === "cold-lead" ? viewCounts.coldLead : tab.id === "active-lead" ? viewCounts.activeLead : viewCounts.pastClient;
              return <button key={tab.id} type="button" aria-pressed={segment === tab.id} onClick={() => setSegment(tab.id)} className={contactFilterPill(segment === tab.id, "stage")}>{tab.id === "all" ? "All Contacts" : tab.id === "cold-lead" ? "Cold Leads" : tab.id === "active-lead" ? "Active Leads" : "Past Clients"}{count !== undefined ? ` (${count})` : ""}</button>;
            })}
          </div>
          <label className="contacts-view-search"><Icon name="search" className="text-[18px]" /><input aria-label="Search in this view" placeholder="Search in this view…" value={viewQuery} onChange={event => updateFilter("search", event.target.value, true)} /></label>
          <button type="button" className="contacts-filter-toggle" aria-label="Filters" aria-expanded={mobileFiltersOpen} aria-controls="contacts-filter-controls" onClick={() => setMobileFiltersOpen(value => !value)}><Icon name="filter_list" className="text-[18px]" />Filters</button>
        </div>
        <div id="contacts-filter-controls" className={cn("contacts-filter-row", !mobileFiltersOpen && "contacts-filters-collapsed")}>
          <label>Category<select aria-label="Category" value={category} onChange={event => setCategory(event.target.value)}><option value="all">All</option>{categoryTabs.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label>Type<select aria-label="Type" value={typeFilter} onChange={event => updateFilter("type", event.target.value)}><option value="all">All</option>{typeOptions.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
          <label>Stage<select aria-label="Stage" value={segment} onChange={event => setSegment(event.target.value as ContactSegment)}>{CONTACT_SEGMENT_TABS.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}</select></label>
          <label>Source<select aria-label="Source" value={sourceFilter} onChange={event => updateFilter("source", event.target.value)}><option value="all">All</option>{Array.from(new Set(rows.flatMap(contact => contact.source ? [contact.source] : []))).sort().map(source => <option key={source} value={source}>{source}</option>)}</select></label>
          <label>Compliance<select aria-label="Compliance" value={complianceFilter} onChange={event => updateFilter("compliance", event.target.value)}><option value="all">All</option><option value="valid">Consent Valid</option><option value="pending">Pending Review</option><option value="blocked">Blocked</option></select></label>
          <label>Last Activity<select aria-label="Last Activity — recorded outreach or engagement" value={activityFilter} onChange={event => updateFilter("activity", event.target.value)}><option value="all">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="none">Not recorded</option></select></label>
          <label>Sort<select aria-label="Sort" value={sort} onChange={event => setSort(event.target.value as ContactSort)}><option value="name-asc">A–Z</option><option value="name-desc">Z–A</option><option value="recent">Newest</option></select></label>
          <button type="button" className="contacts-manage-categories" aria-label="Manage categories" title="Manage categories" onClick={() => setManageCatsOpen(true)}><span aria-hidden="true"><Icon name="settings" className="text-[17px]" /></span></button>
          <button type="button" className="contacts-clear" onClick={clearAll}>Clear all</button>
        </div>
      <div className="flex flex-wrap gap-2 px-4 py-2" aria-label="Active filters">
        {Object.entries(filterLabels).map(([key, label]) => {
          const value = searchParams.get(key) || (key === "category" ? searchParams.get("market") : null);
          return value && value !== "all" ? <button key={key} type="button" className="rounded-full border border-outline-variant/20 px-3 py-1 text-[12px] text-rose-gold-deep" aria-label={`Remove ${label} filter`} onClick={() => updateFilter(key, "all")}>{label}: {value} ×</button> : null;
        })}
        {activePulseLane ? <button type="button" onClick={() => setActivePulseLane(null)}>Relationship Pulse: {activePulseLane} ×</button> : null}
      </div>
      {pulseToast ? (
        <p className="rounded-2xl border border-sage/25 bg-sage-light/40 px-4 py-3 text-[13px] text-emerald-muted">
          {pulseToast}
        </p>
      ) : null}


      {category !== "all" ? (
        <p className="rounded-2xl border border-outline-variant/15 bg-ivory px-4 py-3 text-[14px] text-slate-text">
          Showing <span className="font-medium text-ink">{category}</span> only. Select contacts →
          Set category to move people into your groups.
        </p>
      ) : null}

      {segment === "past-client" ? (
        <p className="rounded-2xl border border-emerald-muted/20 bg-sage-light/40 px-4 py-3 text-[14px] text-emerald-muted">
          Past clients are excluded from cold outreach. Use bulk actions or edit a contact to reclassify.
        </p>
      ) : null}


      {selectedIds.length > 0 && !loading && !error ? (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
            selectedIds.length > 0
              ? "border-rose-gold/25 bg-champagne/50"
              : "border-outline-variant/10 bg-ivory",
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-cream px-3.5 py-1.5 text-[13px] font-medium text-ink hover:bg-champagne sm:px-4 sm:py-2"
            >
              <Icon name={allSelected ? "check_box" : "check_box_outline_blank"} className="text-[18px]" />
              {allSelected ? "Unselect all" : "Select all"}
            </button>
            <span className="text-[13px] text-taupe">
              Selected: <span className="font-medium text-ink">{selectedIds.length}</span>
            </span>
          </div>
          <div className="flex max-md:-mx-1 max-md:flex-nowrap max-md:gap-2 max-md:overflow-x-auto max-md:pb-1 max-md:[scrollbar-width:none] flex-wrap gap-2 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => setBulkOpen("category")}
              className="inline-flex max-md:shrink-0 items-center gap-2 rounded-full bg-cream px-4 py-2 text-[13px] font-medium text-ink disabled:opacity-50"
            >
              <Icon name="category" className="text-[18px]" />
              Set category
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => setBulkOpen("type")}
              className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-[13px] font-medium text-ink disabled:opacity-50"
            >
              <Icon name="label" className="text-[18px]" />
              Change type
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => setBulkOpen("consent")}
              className="inline-flex items-center gap-2 rounded-full bg-sage-light px-4 py-2 text-[13px] font-medium text-emerald-muted disabled:opacity-50"
            >
              <Icon name="verified_user" className="text-[18px]" />
              Mark consent valid
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => setBulkOpen("delete")}
              className="inline-flex items-center gap-2 rounded-full bg-error/10 px-4 py-2 text-[13px] font-medium text-error disabled:opacity-50"
            >
              <Icon name="delete" className="text-[18px]" />
              Delete selected
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-gold/25 bg-champagne px-4 py-4 text-[14px] text-slate-text">
          <p className="font-medium text-ink" role="alert">Contact totals unavailable</p>
          <p className="mt-1">We couldn&apos;t verify your contact records. Totals are hidden until a complete read succeeds.</p>
          <button type="button" onClick={() => void refresh()} className="mt-2 text-[13px] font-medium text-rose-gold-deep">Retry contacts</button>
        </div>
      ) : null}

      <div className="contacts-data-layout">
      <LuxuryCard padding="none" className="contacts-table-card overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-taupe">Loading contacts…</p>
        ) : (
          <>
            <div className="contacts-mobile-rows"><ContactMobileList
              contacts={pageRows}
              selected={selected}
              onToggle={toggleOne}
              selectable={contacts.length > 0}
              consentStatus={consentStatus}
            />
            </div><div className="contacts-table-scroll hidden overflow-x-auto md:block">
            <table className="contacts-table w-full text-left">
              <thead className="sticky top-0 z-[1]">
                <tr className="border-b border-outline-variant/20 bg-cream/95 backdrop-blur-sm">
                  {contacts.length > 0 ? (
                    <th scope="col" className="w-12 px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-taupe sm:px-4">
                      <input type="checkbox" aria-label="Select all contacts on this page" checked={allSelected} onChange={toggleAll} />
                    </th>
                  ) : null}
                  <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-taupe sm:px-5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-rose-gold-deep"
                      onClick={() =>
                        setSort(sort === "name-asc" ? "name-desc" : "name-asc")
                      }
                      title="Sort by name"
                    >
                      Contact
                      <Icon
                        name={
                          sort === "name-desc"
                            ? "arrow_downward"
                            : sort === "name-asc"
                              ? "arrow_upward"
                              : "swap_vert"
                        }
                        className="text-[16px]"
                      />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-taupe sm:px-5">
                    Phone
                  </th>
                  <th scope="col" className="min-w-[100px] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-taupe sm:px-5">
                    Type
                  </th>
                  <th scope="col" className="min-w-[88px] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-taupe sm:px-5">
                    Stage
                  </th>
                  <th scope="col" className="contacts-activity-col" title="Latest recorded outreach or engagement">Last Activity</th>
                  <th scope="col" className="contacts-tags-col">Tags</th>
                  <th scope="col" className="contacts-compliance-col min-w-[96px] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-taupe sm:px-5">
                    Compliance
                  </th>
                  <th scope="col" className="min-w-[108px] px-4 py-3 sm:px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/12">
                {pageRows.map((contact) => (
                  <tr key={contact.id} data-previewed={previewContact?.id === contact.id} className="transition-colors hover:bg-champagne/35">
                    {contacts.length > 0 ? (
                      <td className="px-3 py-3 align-middle sm:px-4">
                        <input type="checkbox" checked={Boolean(selected[contact.id])} onChange={() => toggleOne(contact.id)} aria-label={`Select ${contact.first_name}`} />
                      </td>
                    ) : null}
                    <td className="px-4 py-3 sm:px-5">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="group flex items-center gap-3"
                      >
                        <ContactAvatar
                          firstName={contact.first_name}
                          lastName={contact.last_name}
                          size="sm"
                          className="ring-0"
                        />
                        <div>
                          <p className="font-medium text-ink group-hover:text-rose-gold-deep">
                            {contact.first_name} {contact.last_name ?? ""}
                          </p>
                          {contact.email ? (
                            <p className="text-[12px] text-slate-text">{contact.email}</p>
                          ) : null}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink tabular-nums sm:px-5 sm:text-[14px]">
                      {contact.phone}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle sm:px-5">
                      {(() => {
                        const seg = contactSegment(contact.type);
                        const cat = contact.category?.trim();
                        return (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {cat ? (
                              <span className="inline-flex items-center whitespace-nowrap rounded-lg bg-rose-gold/12 px-2.5 py-1 text-[12px] font-medium leading-none text-rose-gold-deep">
                                {cat}
                              </span>
                            ) : null}
                            <span
                              className={`inline-flex items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-medium leading-none ${segmentBadgeClass(seg)}`}
                            >
                              {contact.type || "Not recorded"}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 align-middle sm:px-5">
                      <span className="inline-flex max-w-[140px] truncate rounded-lg bg-champagne/80 px-2.5 py-1 text-[12px] text-taupe">
                        {segmentBadgeLabel(contactSegment(contact.type))}
                      </span>
                    </td>
                    <td className="contacts-activity-col">{contactLastActivity(contact) ? new Date(contactLastActivity(contact)!).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : <span className="contacts-unavailable">Not recorded</span>}</td>
                    <td className="contacts-tags-col">{Array.isArray(contact.tags) && contact.tags.some(tag => typeof tag === "string" && tag.trim()) ? contact.tags.filter(tag => typeof tag === "string" && tag.trim()).map(tag => <span key={tag} className="contacts-neutral-tag">{tag}</span>) : <span className="contacts-unavailable" title="No tags supplied by the current contact feed">—</span>}</td>
                    <td className="contacts-compliance-col whitespace-nowrap px-4 py-3 align-middle sm:px-5">
                      <ComplianceBadge status={consentStatus(contact)} compact />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right align-middle sm:px-5">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="contacts-row-profile text-rose-gold-deep"
                        aria-label={`Open profile for ${contact.first_name} ${contact.last_name ?? ""}`.trim()}
                        title="Open profile"
                      >
                        <span aria-hidden="true"><Icon name="open_in_new" className="text-[17px]" /></span>
                      </Link>
                      <button type="button" className="contacts-preview-button" aria-label={`Preview ${contact.first_name} ${contact.last_name ?? ""}`.trim()} aria-pressed={previewContact?.id === contact.id} onClick={() => setPreviewId(contact.id)}><Icon name="visibility" className="text-[17px]" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
        {!loading && !error && sortedRows.length === 0 ? <div className="contacts-empty"><Icon name="person_search" className="text-[30px]" /><h2>No contacts in this view</h2><p>Try another search or adjust your filters.</p></div> : null}
      </LuxuryCard>
      {previewContact && !loading ? <ContactPreviewPanel key={previewContact.id} contact={previewContact} consent={consentStatus(previewContact)} /> : null}
      </div>
      {pages > 1 ? <nav aria-label="Contacts pagination" className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" disabled={page <= 1} onClick={() => updateFilter("page", String(page - 1))}>Previous</button>
        <span>Page {page} of {pages} · {sortedRows.length} matching contacts</span>
        <button type="button" disabled={page >= pages} onClick={() => updateFilter("page", String(page + 1))}>Next</button>
      </nav> : null}
      <p role="status" className="contacts-view-count">{loading ? "Loading contact totals…" : error ? "Totals unavailable" : `Showing ${sortedRows.length ? (page - 1) * pageSize + 1 : 0}–${Math.min(page * pageSize, sortedRows.length)} of ${sortedRows.length} matching contacts · ${total} workspace contacts`}</p>
      {meta ? <p className="contacts-consent-summary">Consent validated: {loading ? "…" : validated} of {rows.length} loaded contacts · Blocked / DNC: {dncCount}</p> : null}
      </div>
      <details className="contacts-pulse-disclosure"><summary>Relationship Pulse <span>Signals, follow-ups, and existing outreach tools</span></summary>
      <RelationshipPulseSection
        pulse={pulse}
        loading={pulseLoading}
        activeLane={activePulseLane}
        onSelectLane={setActivePulseLane}
        onOpenContact={(id) => router.push(`/dashboard/contacts/${id}`)}
        onEnrollSuccess={(msg) => {
          setPulseToast(msg);
          window.setTimeout(() => setPulseToast(null), 6000);
        }}
      />

      </details>

      {headerQuery.trim() && contacts.length > 0 ? (
        <p className="text-[14px] text-taupe">
          Showing {sortedRows.length} of {total} contacts matching &quot;{headerQuery}&quot;
        </p>
      ) : null}

      <details className="contacts-pulse-disclosure"><summary>Consent & compliance <span>Review records, eligibility, and audit tools</span></summary><CompliancePanel databaseUnavailable={Boolean(error)} /></details>
    </div>
  );
}

function BulkConsentModal(props: {
  open: boolean;
  onClose: () => void;
  count: number;
  value: { consent: "Yes" | "No" | "Unknown"; consentDate: string; consentSource: string; proof: string };
  onChange: (next: { consent: "Yes" | "No" | "Unknown"; consentDate: string; consentSource: string; proof: string }) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const { open, onClose, count, value, onChange, onSubmit, submitting, error } = props;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark consent valid"
      description={`Adds a consent record for ${count} selected contact${count === 1 ? "" : "s"}. Use only when you have documented opt-in.`}
      icon="verified_user"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={submitting ? "Saving…" : "Save consent"}
          onPrimary={onSubmit}
          primaryDisabled={submitting}
          primaryLoading={submitting}
        />
      }
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
            {error}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ModalField label="Consent status">
            <select
              className={modalInputClass}
              value={value.consent}
              onChange={(e) => onChange({ ...value, consent: e.target.value as typeof value.consent })}
            >
              <option value="Yes">Yes</option>
              <option value="Unknown">Unknown</option>
              <option value="No">No</option>
            </select>
          </ModalField>
          <ModalField label="Consent date">
            <input
              type="date"
              className={modalInputClass}
              value={value.consentDate}
              onChange={(e) => onChange({ ...value, consentDate: e.target.value })}
            />
          </ModalField>
          <ModalField label="Consent source">
            <input
              className={modalInputClass}
              value={value.consentSource}
              onChange={(e) => onChange({ ...value, consentSource: e.target.value })}
              placeholder="Zillow"
            />
          </ModalField>
          <ModalField label="Proof reference">
            <input
              className={modalInputClass}
              value={value.proof}
              onChange={(e) => onChange({ ...value, proof: e.target.value })}
              placeholder="Zillow lead form / export"
            />
          </ModalField>
        </div>
        <p className="text-[12px] text-taupe">
          This records the documented consent status. Sending eligibility is checked separately. If you don’t have explicit opt-in,
          keep consent as Unknown/No.
        </p>
      </div>
    </Modal>
  );
}

function BulkTypeModal(props: {
  open: boolean;
  onClose: () => void;
  count: number;
  value: string;
  options: string[];
  onChange: (next: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const { open, onClose, count, value, options, onChange, onSubmit, submitting, error } = props;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change contact type"
      description={`Set market + stage for ${count} selected contact${count === 1 ? "" : "s"}.`}
      icon="label"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={submitting ? "Saving…" : "Update type"}
          onPrimary={onSubmit}
          primaryDisabled={submitting}
          primaryLoading={submitting}
        />
      }
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
            {error}
          </p>
        ) : null}
        <ModalField label="Contact type">
          <select
            className={modalInputClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {options.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </ModalField>
        <p className="text-[12px] text-taupe">
          Mark closed transactions as Past client so they stay out of cold outreach campaigns.
        </p>
      </div>
    </Modal>
  );
}

function BulkCategoryModal(props: {
  open: boolean;
  onClose: () => void;
  count: number;
  value: string;
  options: string[];
  onChange: (next: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const { open, onClose, count, value, options, onChange, onSubmit, submitting, error } = props;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set category"
      description={`Assign a custom group to ${count} selected contact${count === 1 ? "" : "s"}.`}
      icon="category"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={submitting ? "Saving…" : "Set category"}
          onPrimary={onSubmit}
          primaryDisabled={submitting}
          primaryLoading={submitting}
        />
      }
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
            {error}
          </p>
        ) : null}
        <ModalField label="Category">
          <select
            className={modalInputClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </ModalField>
        <p className="text-[12px] text-taupe">
          Add more groups anytime with Manage categories. No code changes needed.
        </p>
      </div>
    </Modal>
  );
}

function BulkDeleteModal(props: {
  open: boolean;
  onClose: () => void;
  count: number;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const { open, onClose, count, onSubmit, submitting, error } = props;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete selected contacts"
      description={`This permanently deletes ${count} contact${count === 1 ? "" : "s"} and their consent records.`}
      icon="delete"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={submitting ? "Deleting…" : "Delete"}
          onPrimary={onSubmit}
          primaryDisabled={submitting}
          primaryLoading={submitting}
        />
      }
    >
      {error ? (
        <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          {error}
        </p>
      ) : null}
      <p className="text-[13px] text-slate-text">
        Use this if you want to re-upload your CSV with consent columns, or remove a bad import.
      </p>
    </Modal>
  );
}
