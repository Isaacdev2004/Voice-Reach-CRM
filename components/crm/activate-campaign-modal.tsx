"use client";

import {
  Modal,
  ModalFooterActions,
} from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { safeFetch } from "@/lib/api-response";
import type { ActivateCampaignOptions, CampaignDefinition } from "@/lib/crm/types";
import { useEffect, useMemo, useState } from "react";

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  eligibility: { eligible: boolean; issues: string[] };
};

type ActivateCampaignModalProps = {
  open: boolean;
  onClose: () => void;
  campaign: CampaignDefinition;
  durationDays: number;
  onConfirm: (options: ActivateCampaignOptions) => void;
  loading?: boolean;
};

export function ActivateCampaignModal({
  open,
  onClose,
  campaign,
  durationDays,
  onConfirm,
  loading,
}: ActivateCampaignModalProps) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [enrollMode, setEnrollMode] = useState<"all" | "selected">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setEnrollMode("all");
    setSelectedIds(new Set());
    setSearch("");
    (async () => {
      setLoadingContacts(true);
      setContactError(null);
      const envelope = await safeFetch<{ contacts: ContactRow[]; eligibleCount: number }>(
        "/api/contacts",
      );
      setLoadingContacts(false);
      if (envelope.success) {
        setContacts(envelope.data.contacts);
      } else {
        setContactError(envelope.error);
      }
    })();
  }, [open]);

  const eligibleContacts = useMemo(
    () => contacts.filter((c) => c.eligibility.eligible),
    [contacts],
  );

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim().toLowerCase();
      return (
        name.includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, search]);

  const selectedEligibleCount = useMemo(() => {
    const eligibleIds = new Set(eligibleContacts.map((c) => c.id));
    return [...selectedIds].filter((id) => eligibleIds.has(id)).length;
  }, [eligibleContacts, selectedIds]);

  const draftSteps = campaign.steps.filter((s) => s.status === "draft").length;

  const toggleContact = (id: string, eligible: boolean) => {
    if (!eligible) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (enrollMode === "all") {
      onConfirm({ enrollAllEligible: true });
      return;
    }
    if (selectedEligibleCount === 0) return;
    onConfirm({
      enrollAllEligible: false,
      contactIds: [...selectedIds].filter((id) =>
        eligibleContacts.some((c) => c.id === id),
      ),
    });
  };

  const primaryDisabled =
    loading ||
    campaign.steps.length === 0 ||
    loadingContacts ||
    (enrollMode === "all" && eligibleContacts.length === 0) ||
    (enrollMode === "selected" && selectedEligibleCount === 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Activate campaign"
      description="Choose who receives this sequence. Only contacts with documented consent are enrolled."
      icon="rocket_launch"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={loading ? "Activating…" : "Activate now"}
          onPrimary={handleConfirm}
          primaryDisabled={primaryDisabled}
          primaryLoading={loading}
        />
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-outline-variant/15 bg-cream/60 p-4">
          <p className="font-medium text-ink">{campaign.name}</p>
          <p className="mt-1 text-[13px] text-taupe">Audience: {campaign.audience}</p>
        </div>

        <ul className="space-y-2">
          {[
            {
              icon: "linear_scale",
              text: `${campaign.steps.length} automation steps over ${durationDays} days`,
            },
            {
              icon: "verified_user",
              text: "Compliance check runs for each enrolled contact",
            },
            {
              icon: "send",
              text: "Live delivery via Slybroadcast, Twilio SMS, and Resend email when configured",
            },
          ].map((row) => (
            <li
              key={row.text}
              className="flex items-start gap-3 rounded-xl bg-ivory px-4 py-3 text-[14px] text-slate-text"
            >
              <Icon name={row.icon} className="mt-0.5 shrink-0 text-[20px] text-rose-gold-deep" />
              {row.text}
            </li>
          ))}
        </ul>

        {draftSteps > 0 ? (
          <p className="rounded-xl border border-rose-gold/20 bg-rose-gold/5 px-4 py-3 text-[13px] text-taupe">
            {draftSteps} step{draftSteps === 1 ? "" : "s"} still in <strong>Draft</strong> — they are
            included in this sequence.
          </p>
        ) : null}

        <div className="rounded-xl border border-outline-variant/15 bg-ivory p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
            Recipients
          </p>

          {loadingContacts ? (
            <p className="mt-3 text-[13px] text-taupe">Loading contacts…</p>
          ) : contactError ? (
            <p className="mt-3 text-[13px] text-error">{contactError}</p>
          ) : (
            <>
              <p className="mt-2 text-[13px] text-slate-text">
                <strong>{eligibleContacts.length}</strong> eligible of{" "}
                <strong>{contacts.length}</strong> total contacts. Use bulk &ldquo;Mark consent
                valid&rdquo; on Contacts if imports are pending review.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
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
                    name="enrollMode"
                    checked={enrollMode === "all"}
                    onChange={() => setEnrollMode("all")}
                    className="accent-rose-gold-deep"
                  />
                  All eligible contacts ({eligibleContacts.length})
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
                    name="enrollMode"
                    checked={enrollMode === "selected"}
                    onChange={() => setEnrollMode("selected")}
                    className="accent-rose-gold-deep"
                  />
                  Choose specific contacts
                </label>
              </div>

              {enrollMode === "selected" ? (
                <div className="mt-4">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone, or email"
                    className="w-full rounded-xl border border-outline-variant/20 bg-cream/60 px-4 py-2.5 text-[14px] text-ink outline-none focus:border-rose-gold/50"
                  />
                  <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
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
                            <label
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                                eligible ? "hover:bg-cream/80" : "cursor-not-allowed opacity-60",
                                checked && eligible && "bg-rose-gold/10",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!eligible}
                                onChange={() => toggleContact(c.id, eligible)}
                                className="mt-0.5 accent-rose-gold-deep"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="font-medium text-ink">{name}</span>
                                <span className="block text-taupe">{c.phone ?? "No phone"}</span>
                                {!eligible && c.eligibility.issues[0] ? (
                                  <span className="block text-[12px] text-error/90">
                                    {c.eligibility.issues[0]}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          </li>
                        );
                      })
                    )}
                  </ul>
                  {selectedEligibleCount > 0 ? (
                    <p className="mt-2 text-[12px] text-taupe">
                      {selectedEligibleCount} contact
                      {selectedEligibleCount === 1 ? "" : "s"} will be enrolled.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {eligibleContacts.length === 0 ? (
                <p className="mt-3 rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
                  No eligible contacts yet. Fix consent on your contacts, then try again.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
