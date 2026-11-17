"use client";
import {useRecipientPage} from "@/lib/hooks/use-recipient-page";
import {ContactPageControls} from "@/components/crm/contact-page-controls";

import { Modal, ModalFooterActions } from "@/components/crm/modal";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useState } from "react";



type EnrollMode = "all" | "category" | "selected";

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
  const [enrollMode, setEnrollMode] = useState<EnrollMode>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);


  useEffect(() => {
    if (!open) return;
    setEnrollMode("category");
    setSelectedCategory(null);
    setSelectedIds(new Set());
    setSearch("");
    setSaveError(null);

  }, [open]);

  const recipientPage=useRecipientPage(open,search,existingContactIds);
  const contacts=recipientPage.data?.contacts??[];
  const categories=recipientPage.data?.categories??[];
  const loadingContacts=recipientPage.loading,contactError=recipientPage.error;
  const eligibleCount=recipientPage.data?.eligibleCount??0;
  const eligibleByCategory=new Map(Object.entries(recipientPage.data?.eligibleByCategory??{}).filter(([,count])=>count>0));
  const filteredContacts=contacts;
  const selectedEligibleCount=selectedIds.size;
  const categoryEligibleCount = selectedCategory
    ? (eligibleByCategory.get(selectedCategory) ?? 0)
    : 0;

  const toggleContact = (id: string, eligible: boolean) => {
    if (!eligible) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInCategory=(category:string)=>{setSelectedCategory(category);setEnrollMode("category");};

  const handleConfirm = async () => {
    setSaving(true);
    setSaveError(null);
    const body =
      enrollMode === "all"
        ? { enrollAllEligible: true }
        : enrollMode === "category" && selectedCategory
          ? { category: selectedCategory }
          : {
              enrollAllEligible: false,
              contactIds: [...selectedIds],
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
    Boolean(contactError) ||
    loadingContacts ||
    (enrollMode === "all" && eligibleCount === 0) ||
    (enrollMode === "category" && categoryEligibleCount === 0) ||
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
              <strong>{eligibleCount}</strong> eligible contact
              {eligibleCount === 1 ? "" : "s"} available to add
              {new Set(existingContactIds).size > 0
                ? ` · ${new Set(existingContactIds).size} already on this campaign`
                : ""}
              .
            </p>

            {eligibleCount === 0 ? (
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
                <div className="grid gap-2 sm:grid-cols-3">
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[14px]",
                      enrollMode === "category"
                        ? "border-rose-gold/40 bg-rose-gold/10"
                        : "border-outline-variant/15",
                    )}
                  >
                    <input
                      type="radio"
                      name="addPeopleMode"
                      checked={enrollMode === "category"}
                      onChange={() => setEnrollMode("category")}
                      className="accent-rose-gold-deep"
                    />
                    By category
                  </label>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[14px]",
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
                    All eligible ({eligibleCount})
                  </label>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[14px]",
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
                    Pick individually
                  </label>
                </div>

                {enrollMode === "category" ? (
                  <div className="rounded-xl border border-outline-variant/15 bg-cream/40 p-4">
                    <p className="text-[14px] font-medium text-ink">
                      Add all eligible contacts in a category
                    </p>
                    <p className="mt-1 text-[13px] text-taupe">
                      Use Residential or Commercial tags from Contacts. Only eligible contacts not
                      already on this campaign are added.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {categories.map((name) => {
                        const count = eligibleByCategory.get(name) ?? 0;
                        const active = selectedCategory === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            disabled={count === 0}
                            onClick={() => setSelectedCategory(name)}
                            className={cn(
                              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                              active
                                ? "bg-ink text-ivory shadow-sm"
                                : "border border-outline-variant/20 bg-ivory text-ink hover:bg-champagne",
                            )}
                          >
                            {name}
                            <span className={cn("ml-2", active ? "text-ivory/80" : "text-taupe")}>
                              ({count})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedCategory && categoryEligibleCount > 0 ? (
                      <p className="mt-3 text-[13px] text-emerald-muted">
                        {categoryEligibleCount} eligible {selectedCategory} contact
                        {categoryEligibleCount === 1 ? "" : "s"} will be added.
                      </p>
                    ) : null}
                    {eligibleByCategory.size === 0 ? (
                      <p className="mt-3 text-[13px] text-taupe">
                        No categorized contacts found. Set categories on the{" "}
                        <Link href="/dashboard/contacts" className="font-medium text-rose-gold-deep hover:underline">
                          Contacts
                        </Link>{" "}
                        page first.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {enrollMode === "selected" ? (
                  <div>
                    {eligibleByCategory.size > 0 ? (
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-medium uppercase tracking-wider text-taupe">
                          Quick select
                        </span>
                        {[...eligibleByCategory.entries()].map(([name, count]) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => selectAllInCategory(name)}
                            className="rounded-full border border-outline-variant/20 bg-ivory px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-champagne"
                          >
                            All {name} ({count})
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, category, phone, or email"
                      className="w-full rounded-xl border border-outline-variant/20 bg-cream/60 px-4 py-2.5 text-[14px] text-ink outline-none focus:border-rose-gold/50"
                    />
                    <ContactPageControls page={recipientPage.page} pages={recipientPage.pages} onPage={recipientPage.setPage} loading={loadingContacts}/>
                  <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
                      {filteredContacts.length === 0 ? (
                        <li className="py-4 text-center text-[13px] text-taupe">No contacts found</li>
                      ) : (
                        filteredContacts.map((c) => {
                          const name =
                            `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Contact";
                          const eligible = c.eligibility.eligible;
                          const checked = selectedIds.has(c.id);
                          const category = c.category?.trim() || ((c.type??"").toLowerCase().includes("commercial")?"Commercial":(c.type??"").toLowerCase().includes("residential")?"Residential":"");
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                disabled={!eligible}
                                onClick={() => toggleContact(c.id, eligible)}
                                aria-pressed={checked}
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
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-ink">{name}</span>
                                    {category ? (
                                      <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-taupe">
                                        {category}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="block truncate text-[12px] text-taupe">
                                    {c.phone ?? c.email ?? " - "}
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
