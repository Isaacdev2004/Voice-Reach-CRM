"use client";

import { Modal, ModalFooterActions } from "@/components/crm/modal";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  eligibility: { eligible: boolean; issues: string[] };
};

type AddCampaignPeopleModalProps = {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  existingContactIds?: string[];
  onAdded: (message: string) => void;
};

export function AddCampaignPeopleModal({
  open,
  onClose,
  campaignId,
  campaignName,
  existingContactIds = [],
  onAdded,
}: AddCampaignPeopleModalProps) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [enrollMode, setEnrollMode] = useState<"all" | "selected">("selected");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const alreadyOnCampaign = useMemo(() => new Set(existingContactIds), [existingContactIds]);

  useEffect(() => {
    if (!open) return;
    setEnrollMode("selected");
    setSelectedIds(new Set());
    setSearch("");
    setSaveError(null);
    (async () => {
      setLoadingContacts(true);
      setContactError(null);
      const envelope = await safeFetch<{ contacts: ContactRow[]; eligibleCount: number }>(
        "/api/contacts",
      );
      setLoadingContacts(false);
      if (envelope.success) {
        setContacts(envelope.data.contacts ?? []);
      } else {
        setContactError(envelope.error);
      }
    })();
  }, [open]);

  const eligibleContacts = useMemo(
    () =>
      contacts.filter(
        (c) => c.eligibility.eligible && !alreadyOnCampaign.has(c.id),
      ),
    [contacts, alreadyOnCampaign],
  );

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = contacts.filter((c) => !alreadyOnCampaign.has(c.id));
    if (!q) return base;
    return base.filter((c) => {
      const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim().toLowerCase();
      return (
        name.includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, search, alreadyOnCampaign]);

  const selectedEligibleCount = useMemo(() => {
    const eligibleIds = new Set(eligibleContacts.map((c) => c.id));
    return [...selectedIds].filter((id) => eligibleIds.has(id)).length;
  }, [eligibleContacts, selectedIds]);

  const toggleContact = (id: string, eligible: boolean) => {
    if (!eligible) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    setSaving(true);
    setSaveError(null);
    const body =
      enrollMode === "all"
        ? { enrollAllEligible: true }
        : {
            enrollAllEligible: false,
            contactIds: [...selectedIds].filter((id) =>
              eligibleContacts.some((c) => c.id === id),
            ),
          };

    const envelope = await safeFetch<{ message: string }>(
      `/api/campaigns/${campaignId}/recipients`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setSaving(false);

    if (!envelope.success) {
      setSaveError(envelope.error);
      return;
    }

    onAdded(envelope.data.message ?? "People added.");
    onClose();
  };

  const primaryDisabled =
    saving ||
    loadingContacts ||
    (enrollMode === "all" && eligibleContacts.length === 0) ||
    (enrollMode === "selected" && selectedEligibleCount === 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add people"
      description={`Choose contacts to add to “${campaignName}”. Only eligible contacts with valid consent can be enrolled.`}
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={saving ? "Adding…" : "Add to campaign"}
          onPrimary={() => void handleConfirm()}
          primaryDisabled={primaryDisabled}
          primaryLoading={saving}
        />
      }
    >
      <div className="space-y-4">
        {loadingContacts ? (
          <p className="text-[14px] text-taupe">Loading contacts…</p>
        ) : contactError ? (
          <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
            <p>{contactError}</p>
            <Link href="/dashboard/contacts" className="mt-2 inline-block font-medium underline">
              Open Contacts →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[14px] text-slate-text">
              <strong>{eligibleContacts.length}</strong> eligible contact
              {eligibleContacts.length === 1 ? "" : "s"} available to add
              {alreadyOnCampaign.size > 0
                ? ` · ${alreadyOnCampaign.size} already on this campaign`
                : ""}
              .
            </p>

            {eligibleContacts.length === 0 ? (
              <div className="rounded-xl border border-rose-gold/25 bg-champagne px-4 py-3 text-[14px] text-slate-text">
                <p className="font-medium text-ink">No new eligible contacts</p>
                <p className="mt-1">
                  Import contacts and mark consent valid on the Contacts page, then come back.
                </p>
                <Link
                  href="/dashboard/contacts"
                  className="mt-2 inline-block text-[13px] font-medium text-rose-gold-deep hover:underline"
                >
                  Go to Contacts →
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label
                    className={cn(
                      "flex flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[14px]",
                      enrollMode === "all"
                        ? "border-rose-gold/40 bg-rose-gold/10"
                        : "border-outline-variant/15",
                    )}
                  >
                    <input
                      type="radio"
                      name="addPeopleMode"
                      checked={enrollMode === "all"}
                      onChange={() => setEnrollMode("all")}
                      className="accent-rose-gold-deep"
                    />
                    All remaining eligible ({eligibleContacts.length})
                  </label>
                  <label
                    className={cn(
                      "flex flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[14px]",
                      enrollMode === "selected"
                        ? "border-rose-gold/40 bg-rose-gold/10"
                        : "border-outline-variant/15",
                    )}
                  >
                    <input
                      type="radio"
                      name="addPeopleMode"
                      checked={enrollMode === "selected"}
                      onChange={() => setEnrollMode("selected")}
                      className="accent-rose-gold-deep"
                    />
                    Choose specific contacts
                  </label>
                </div>

                {enrollMode === "selected" ? (
                  <div>
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, phone, or email"
                      className="w-full rounded-xl border border-outline-variant/20 bg-cream/60 px-4 py-2.5 text-[14px] text-ink outline-none focus:border-rose-gold/50"
                    />
                    <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
                      {filteredContacts.length === 0 ? (
                        <li className="py-4 text-center text-[13px] text-taupe">No contacts found</li>
                      ) : (
                        filteredContacts.map((c) => {
                          const name =
                            `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Contact";
                          const eligible = c.eligibility.eligible;
                          const checked = selectedIds.has(c.id);
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                disabled={!eligible}
                                onClick={() => toggleContact(c.id, eligible)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px]",
                                  eligible ? "hover:bg-champagne/60" : "opacity-50",
                                  checked && "bg-rose-gold/10",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px]",
                                    checked
                                      ? "border-rose-gold bg-rose-gold text-ivory"
                                      : "border-outline-variant/40",
                                  )}
                                >
                                  {checked ? "✓" : ""}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block font-medium text-ink">{name}</span>
                                  <span className="block truncate text-[12px] text-taupe">
                                    {c.phone ?? c.email ?? "—"}
                                    {!eligible ? " · Not eligible" : ""}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                    {selectedEligibleCount > 0 ? (
                      <p className="mt-2 text-[13px] text-taupe">
                        {selectedEligibleCount} selected
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </>
        )}

        {saveError ? (
          <p className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">
            {saveError}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
