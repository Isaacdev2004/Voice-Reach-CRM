"use client";

import Link from "next/link";
import { CompliancePanel } from "@/components/crm/compliance-panel";
import { ComplianceBadge } from "@/components/crm/compliance-badge";
import { ContactAvatar } from "@/components/crm/contact-avatar";
import { ContactPageActions } from "@/components/crm/contact-page-actions";
import { KpiCard } from "@/components/crm/kpi-card";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { DEMO_CONTACT } from "@/lib/crm/mock-data";
import {
  CONTACT_SEGMENT_TABS,
  CONTACT_TYPE_OPTIONS,
  contactSegment,
  segmentBadgeClass,
  segmentBadgeLabel,
  type ContactSegment,
} from "@/lib/contacts/lifecycle";
import { DEFAULT_CONTACT_CATEGORIES } from "@/lib/contacts/categories";
import { ManageCategoriesModal } from "@/components/crm/manage-categories-modal";
import { RelationshipPulseSection } from "@/components/crm/relationship-pulse-section";
import { useDashboardSearch } from "@/lib/hooks/use-dashboard-search";
import { useContacts, type ApiContact } from "@/lib/hooks/use-contacts";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import { DATABASE_SETUP_HINT } from "@/lib/supabase-errors";
import type { PulseLaneId, RelationshipPulseResult } from "@/lib/contacts/relationship-pulse";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ContactSort = "name-asc" | "name-desc" | "recent";

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

function contactSortKey(c: ApiContact): string {
  return `${c.first_name} ${c.last_name ?? ""}`.trim().toLowerCase();
}

function consentStatus(contact: ApiContact): "valid" | "pending" | "blocked" | "review" {
  if (contact.dnc) return "blocked";
  const status = contact.consent_records?.[0]?.status;
  if (status === "Yes") return "valid";
  if (status === "No") return "blocked";
  return "pending";
}

const FALLBACK_ROWS: ApiContact[] = [
  {
    id: DEMO_CONTACT.id,
    first_name: DEMO_CONTACT.firstName,
    last_name: DEMO_CONTACT.lastName,
    phone: DEMO_CONTACT.phone ?? "",
    email: DEMO_CONTACT.email,
    source: "Referral",
    consent_records: [{ status: "Yes" }],
  },
];

export function ContactManagementPage() {
  const headerQuery = useDashboardSearch();
  const searchParams = useSearchParams();
  const initialSegment = (searchParams.get("segment") ?? "all") as ContactSegment;
  const initialCategory = searchParams.get("category") ?? searchParams.get("market") ?? "all";
  const [segment, setSegment] = useState<ContactSegment>(
    CONTACT_SEGMENT_TABS.some((t) => t.id === initialSegment) ? initialSegment : "all",
  );
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<ContactSort>("name-asc");
  const [customCategories, setCustomCategories] = useState<string[]>([
    ...DEFAULT_CONTACT_CATEGORIES,
  ]);
  const [manageCatsOpen, setManageCatsOpen] = useState(false);
  const { contacts, loading, error, refresh, meta } = useContacts(
    headerQuery,
    segment,
    category,
  );
  const rows: ApiContact[] = contacts.length > 0 ? contacts : FALLBACK_ROWS;
  const [pulse, setPulse] = useState<RelationshipPulseResult | null>(null);
  const [pulseLoading, setPulseLoading] = useState(true);
  const [activePulseLane, setActivePulseLane] = useState<PulseLaneId | null>(null);

  const loadPulse = useCallback(async () => {
    setPulseLoading(true);
    const envelope = await safeFetch<RelationshipPulseResult>("/api/contacts/relationship-pulse");
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

  const sortedRows = useMemo(() => {
    let list = [...rows];
    if (pulseFilterIds) {
      list = list.filter((c) => pulseFilterIds.has(c.id));
    }
    if (sort === "name-asc") {
      list.sort((a, b) => contactSortKey(a).localeCompare(contactSortKey(b)));
    } else if (sort === "name-desc") {
      list.sort((a, b) => contactSortKey(b).localeCompare(contactSortKey(a)));
    } else {
      list.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
    }
    return list;
  }, [rows, sort, pulseFilterIds]);
  const total = meta?.total ?? (contacts.length > 0 ? contacts.length : rows.length);

  const selectableRows = useMemo<ApiContact[]>(() => (contacts.length > 0 ? contacts : []), [contacts]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkOpen, setBulkOpen] = useState<null | "consent" | "delete" | "type" | "category">(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkType, setBulkType] = useState("Residential Lead");
  const [bulkCategory, setBulkCategory] = useState("Residential");
  const [bulkConsent, setBulkConsent] = useState({
    consent: "Yes" as "Yes" | "No" | "Unknown",
    consentDate: new Date().toISOString().slice(0, 10),
    consentSource: "Zillow",
    proof: "Zillow lead export / documented opt-in",
  });

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected],
  );
  const allSelected = selectableRows.length > 0 && selectedIds.length === selectableRows.length;

  const validated = rows.filter((c) => consentStatus(c) === "valid").length;
  const dncCount = rows.filter((c) => c.dnc || consentStatus(c) === "blocked").length;

  const toggleAll = () => {
    if (selectableRows.length === 0) return;
    if (allSelected) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    selectableRows.forEach((c) => {
      next[c.id] = true;
    });
    setSelected(next);
  };

  const toggleOne = (id: string) => {
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
    void refresh();
    void loadPulse();
  };

  const counts = meta?.counts;
  const categoryTabs = meta?.categories?.length ? meta.categories : customCategories;

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
    closeBulk();
    void refresh();
    void loadPulse();
  };

  return (
    <div className={DASHBOARD_PAGE_BODY}>
      <ManageCategoriesModal
        open={manageCatsOpen}
        onClose={() => setManageCatsOpen(false)}
        categories={categoryTabs}
        onChanged={(next) => {
          setCustomCategories(next);
          void refresh();
    void loadPulse();
        }}
      />
      <BulkConsentModal
        open={bulkOpen === "consent"}
        onClose={closeBulk}
        count={selectedIds.length}
        value={bulkConsent}
        onChange={setBulkConsent}
        onSubmit={() => void runBulkConsent()}
        submitting={bulkSubmitting}
        error={bulkError}
      />
      <BulkDeleteModal
        open={bulkOpen === "delete"}
        onClose={closeBulk}
        count={selectedIds.length}
        onSubmit={() => void runBulkDelete()}
        submitting={bulkSubmitting}
        error={bulkError}
      />
      <BulkTypeModal
        open={bulkOpen === "type"}
        onClose={closeBulk}
        count={selectedIds.length}
        value={bulkType}
        onChange={setBulkType}
        onSubmit={() => void runBulkType()}
        submitting={bulkSubmitting}
        error={bulkError}
      />
      <BulkCategoryModal
        open={bulkOpen === "category"}
        onClose={closeBulk}
        count={selectedIds.length}
        value={bulkCategory}
        options={categoryTabs}
        onChange={setBulkCategory}
        onSubmit={() => void runBulkCategory()}
        submitting={bulkSubmitting}
        error={bulkError}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <ContactPageActions
          onRefresh={() => {
            refresh();
            void loadPulse();
          }}
        />
      </div>

      <LuxuryCard padding="md" className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-taupe">
            Category
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={contactFilterPill(category === "all", "category")}
            >
              All categories
              {counts?.all !== undefined ? (
                <span className={cn("ml-1.5 tabular-nums", category === "all" ? "opacity-90" : "")}>
                  ({counts.all})
                </span>
              ) : null}
            </button>
            {categoryTabs.map((name) => {
              const active = category.toLowerCase() === name.toLowerCase();
              const count = counts?.byCategory?.[name] ?? counts?.byCategory?.[name.toLowerCase()];
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={contactFilterPill(active, "category")}
                >
                  {name}
                  {count !== undefined ? (
                    <span className={cn("ml-1.5 tabular-nums", active ? "opacity-90" : "")}>
                      ({count})
                    </span>
                  ) : null}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setManageCatsOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-outline-variant/40 bg-cream/50 px-3 py-1.5 text-[12px] font-medium text-rose-gold-deep hover:bg-champagne sm:px-3.5 sm:py-2 sm:text-[13px]"
            >
              <Icon name="add" className="text-[16px]" />
              Manage categories
            </button>
          </div>
        </div>

        <div className="border-t border-outline-variant/10 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-taupe">
            Lifecycle stage
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONTACT_SEGMENT_TABS.map((tab) => {
              const count =
                tab.id === "all"
                  ? counts?.all
                  : tab.id === "cold-lead"
                    ? counts?.coldLead
                    : tab.id === "active-lead"
                      ? counts?.activeLead
                      : counts?.pastClient;
              const active = segment === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSegment(tab.id)}
                  className={contactFilterPill(active, "stage")}
                  title={tab.description}
                >
                  {tab.label}
                  {count !== undefined ? (
                    <span className={cn("ml-1.5 tabular-nums", active ? "opacity-90" : "")}>
                      ({count})
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-outline-variant/10 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-taupe">Sort by</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSort("name-asc")}
              className={contactFilterPill(sort === "name-asc", "sort")}
            >
              A–Z
            </button>
            <button
              type="button"
              onClick={() => setSort("name-desc")}
              className={contactFilterPill(sort === "name-desc", "sort")}
            >
              Z–A
            </button>
            <button
              type="button"
              onClick={() => setSort("recent")}
              className={contactFilterPill(sort === "recent", "sort")}
            >
              Newest
            </button>
          </div>
        </div>
      </LuxuryCard>

      <RelationshipPulseSection
        pulse={pulse}
        loading={pulseLoading}
        activeLane={activePulseLane}
        onSelectLane={setActivePulseLane}
        onOpenContact={() => undefined}
      />

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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <KpiCard
          id="contacts-total"
          label="Total contacts"
          value={loading ? "…" : total.toLocaleString()}
          icon="group"
          tone="default"
          compact
        />
        <KpiCard
          id="contacts-consent"
          label="Consent validated"
          value={loading ? "…" : `${rows.length ? Math.round((validated / rows.length) * 100) : 0}%`}
          icon="verified_user"
          tone="sage"
          compact
        />
        <KpiCard
          id="contacts-past"
          label="Past clients"
          value={loading ? "…" : String(counts?.pastClient ?? "—")}
          icon="handshake"
          tone="bronze"
          compact
        />
        <KpiCard
          id="contacts-cold"
          label="Cold leads"
          value={loading ? "…" : String(counts?.coldLead ?? "—")}
          icon="ac_unit"
          tone="rose"
          compact
        />
      </div>

      {contacts.length > 0 ? (
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => setBulkOpen("category")}
              className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-[13px] font-medium text-ink disabled:opacity-50"
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
          <p className="font-medium text-ink">Database not connected</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-[13px] text-taupe">{DATABASE_SETUP_HINT}</p>
        </div>
      ) : null}

      <LuxuryCard padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-outline-variant/15 bg-champagne/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="flex items-center gap-2 text-[13px] text-slate-text">
            <Icon name="favorite" className="text-[17px] text-rose-gold-deep" />
            Open a row for timeline, signals, tasks, and AI suggestions.
          </p>
          <Link
            href={`/dashboard/contacts/${rows[0]?.id ?? DEMO_CONTACT.id}`}
            className="text-[12px] font-medium text-rose-gold-deep whitespace-nowrap hover:underline sm:text-[13px]"
          >
            Sample profile →
          </Link>
        </div>
        {loading ? (
          <p className="p-8 text-center text-taupe">Loading contacts…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="sticky top-0 z-[1]">
                <tr className="border-b border-outline-variant/20 bg-cream/95 backdrop-blur-sm">
                  {contacts.length > 0 ? (
                    <th scope="col" className="w-12 px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-taupe sm:px-4">
                      <span className="sr-only">Select</span>
                    </th>
                  ) : null}
                  <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-taupe sm:px-5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-rose-gold-deep"
                      onClick={() =>
                        setSort((s) => (s === "name-asc" ? "name-desc" : "name-asc"))
                      }
                      title="Sort by name"
                    >
                      Name
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
                    Source
                  </th>
                  <th scope="col" className="min-w-[96px] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-taupe sm:px-5">
                    Compliance
                  </th>
                  <th scope="col" className="min-w-[108px] px-4 py-3 sm:px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/12">
                {sortedRows.map((contact) => (
                  <tr key={contact.id} className="transition-colors hover:bg-champagne/35">
                    {contacts.length > 0 ? (
                      <td className="px-3 py-3 align-middle sm:px-4">
                        <button
                          type="button"
                          onClick={() => toggleOne(contact.id)}
                          className="rounded-full p-2 hover:bg-champagne"
                          aria-label={`Select ${contact.first_name}`}
                        >
                          <Icon
                            name={selected[contact.id] ? "check_box" : "check_box_outline_blank"}
                            className="text-[20px] text-taupe"
                          />
                        </button>
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
                              {segmentBadgeLabel(seg)}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 align-middle sm:px-5">
                      <span className="inline-flex max-w-[140px] truncate rounded-lg bg-champagne/80 px-2.5 py-1 text-[12px] text-taupe">
                        {contact.source ?? "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle sm:px-5">
                      <ComplianceBadge status={consentStatus(contact)} compact />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right align-middle sm:px-5">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="text-[13px] font-medium text-rose-gold-deep hover:underline"
                      >
                        Open profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LuxuryCard>

      {headerQuery.trim() && contacts.length > 0 ? (
        <p className="text-[14px] text-taupe">
          Showing {meta?.filtered ?? rows.length} of {total} contacts matching &quot;{headerQuery}&quot;
        </p>
      ) : null}

      <CompliancePanel databaseUnavailable={Boolean(error)} />
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
          This records consent in the database so compliance checks allow VM/SMS. If you don’t have explicit opt-in,
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
  onChange: (next: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const { open, onClose, count, value, onChange, onSubmit, submitting, error } = props;
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
            {CONTACT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
