"use client";

import Link from "next/link";
import { CompliancePanel } from "@/components/crm/compliance-panel";
import { ComplianceBadge } from "@/components/crm/compliance-badge";
import { ContactAvatar } from "@/components/crm/contact-avatar";
import { ContactPageActions } from "@/components/crm/contact-page-actions";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { DEMO_CONTACT } from "@/lib/crm/mock-data";
import {
  CONTACT_SEGMENT_TABS,
  contactSegment,
  segmentBadgeClass,
  segmentBadgeLabel,
  type ContactSegment,
} from "@/lib/contacts/lifecycle";
import { useDashboardSearch } from "@/lib/hooks/use-dashboard-search";
import { useContacts, type ApiContact } from "@/lib/hooks/use-contacts";
import { safeFetch } from "@/lib/api-response";
import { DATABASE_SETUP_HINT } from "@/lib/supabase-errors";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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
  const [segment, setSegment] = useState<ContactSegment>(
    CONTACT_SEGMENT_TABS.some((t) => t.id === initialSegment) ? initialSegment : "all",
  );
  const { contacts, loading, error, refresh, meta } = useContacts(headerQuery, segment);
  const rows: ApiContact[] = contacts.length > 0 ? contacts : FALLBACK_ROWS;
  const total = meta?.total ?? (contacts.length > 0 ? contacts.length : rows.length);

  const selectableRows = useMemo<ApiContact[]>(() => (contacts.length > 0 ? contacts : []), [contacts]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkOpen, setBulkOpen] = useState<null | "consent" | "delete" | "type">(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkType, setBulkType] = useState("Past Client");
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
  };

  const counts = meta?.counts;

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
  };

  return (
    <div className="luxury-page p-8 max-w-[1400px] w-full mx-auto space-y-6">
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
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Contacts
          </p>
          <h1 className="font-serif text-[36px] font-semibold text-ink">Your relationships</h1>
          <p className="mt-1 text-[15px] text-slate-text">
            Click a name to open the full relationship profile.
          </p>
        </div>
        <ContactPageActions onRefresh={refresh} />
      </header>

      <div className="flex flex-wrap gap-2">
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
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-sage text-ivory shadow-sm"
                  : "border border-outline-variant/20 bg-cream text-taupe hover:bg-champagne"
              }`}
              title={tab.description}
            >
              {tab.label}
              {count !== undefined ? (
                <span className={`ml-2 ${active ? "text-ivory/80" : "text-taupe"}`}>
                  ({count})
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {segment === "past-client" ? (
        <p className="rounded-2xl border border-emerald-muted/20 bg-sage-light/40 px-4 py-3 text-[14px] text-emerald-muted">
          Past clients are excluded from cold outreach. Use bulk actions or edit a contact to reclassify.
        </p>
      ) : null}

      {contacts.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-outline-variant/10 bg-ivory px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-cream px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne"
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total contacts", value: loading ? "…" : total.toLocaleString() },
          {
            label: "Consent validated",
            value: loading ? "…" : `${rows.length ? Math.round((validated / rows.length) * 100) : 0}%`,
          },
          { label: "Past clients", value: loading ? "…" : String(counts?.pastClient ?? "—") },
          { label: "Cold leads", value: loading ? "…" : String(counts?.coldLead ?? "—") },
        ].map((stat) => (
          <LuxuryCard key={stat.label} padding="md">
            <p className="text-[13px] text-taupe">{stat.label}</p>
            <p className="mt-1 font-serif text-[28px] font-semibold text-ink">{stat.value}</p>
          </LuxuryCard>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-outline-variant/10 bg-champagne/40 px-4 py-3">
        <p className="flex items-center gap-2 text-[14px] text-slate-text">
          <Icon name="favorite" className="text-[18px] text-rose-gold-deep" />
          Each row opens timeline, signals, tasks, and AI suggestions.
        </p>
        <Link
          href={`/dashboard/contacts/${rows[0]?.id ?? DEMO_CONTACT.id}`}
          className="text-[13px] font-medium text-rose-gold-deep whitespace-nowrap hover:underline"
        >
          Try sample profile →
        </Link>
      </div>

      <LuxuryCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-taupe">Loading contacts…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-cream/80">
                  {contacts.length > 0 ? (
                    <th className="px-4 py-4 text-[12px] font-semibold uppercase tracking-wider text-taupe">
                      Select
                    </th>
                  ) : null}
                  <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-taupe">
                    Name
                  </th>
                  <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-taupe">
                    Phone
                  </th>
                  <th className="min-w-[100px] px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-taupe">
                    Type
                  </th>
                  <th className="min-w-[88px] px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-taupe">
                    Source
                  </th>
                  <th className="min-w-[96px] px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-taupe">
                    Compliance
                  </th>
                  <th className="min-w-[120px] px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {rows.map((contact) => (
                  <tr key={contact.id} className="transition-colors hover:bg-cream/50">
                    {contacts.length > 0 ? (
                      <td className="px-4 py-4 align-middle">
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
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="flex items-center gap-3 group"
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
                    <td className="px-6 py-4 text-[14px] text-ink">{contact.phone}</td>
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                      {(() => {
                        const seg = contactSegment(contact.type);
                        return (
                          <span
                            className={`inline-flex items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-medium leading-none ${segmentBadgeClass(seg)}`}
                          >
                            {segmentBadgeLabel(seg)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className="inline-flex max-w-[140px] truncate rounded-lg bg-champagne/80 px-2.5 py-1 text-[12px] text-taupe">
                        {contact.source ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                      <ComplianceBadge status={consentStatus(contact)} compact />
                    </td>
                    <td className="px-6 py-4 align-middle text-right whitespace-nowrap">
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
      description={`Updates lifecycle type for ${count} selected contact${count === 1 ? "" : "s"}.`}
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
            <option value="Past Client">Past client (closed)</option>
            <option value="Cold Lead">Cold lead</option>
            <option value="Active Lead">Active lead</option>
            <option value="Imported Contact">Imported / unclassified</option>
          </select>
        </ModalField>
        <p className="text-[12px] text-taupe">
          Mark closed transactions as Past client so they stay out of cold outreach campaigns.
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
