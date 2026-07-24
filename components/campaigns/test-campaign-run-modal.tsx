"use client";

import { Modal, ModalFooterActions } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { useEffect, useMemo, useState } from "react";

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
};

type TestCampaignRunModalProps = {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  onDone: (message: string) => void;
};

export function TestCampaignRunModal({
  open,
  onClose,
  campaignId,
  campaignName,
  onDone,
}: TestCampaignRunModalProps) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setSearch("");
    setError(null);
    (async () => {
      setLoading(true);
      const envelope = await safeFetch<{ contacts: ContactRow[] }>("/api/contacts");
      setLoading(false);
      if (envelope.success) setContacts(envelope.data.contacts);
      else setError(envelope.error);
    })();
  }, [open]);

  const filtered = useMemo(() => {
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

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRun = async () => {
    if (selectedIds.size === 0) return;
    setRunning(true);
    setError(null);
    const envelope = await safeFetch<{ message: string }>(
      `/api/campaigns/${campaignId}/test-run`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: [...selectedIds] }),
      },
    );
    setRunning(false);
    if (!envelope.success) {
      setError(envelope.error);
      return;
    }
    onDone(envelope.data.message);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Run test sequence"
      description={`Dry-run “${campaignName}” with mock delivery (voicemail, SMS, email steps). Missing consent is auto-documented for this test only.`}
      icon="science"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={running ? "Running test…" : "Run test now"}
          onPrimary={() => void handleRun()}
          primaryDisabled={running || loading || selectedIds.size === 0}
          primaryLoading={running}
        />
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950">
          <p className="font-medium">Before you run</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>Approve a voice recording and tap Use for campaign on Voice Scripts</li>
            <li>Pick 1–2 contacts below (Ariel is fine)</li>
            <li>We&apos;ll mock-send the full sequence so you can verify the pipeline</li>
          </ol>
        </div>

        {loading ? (
          <p className="text-[13px] text-taupe">Loading contacts…</p>
        ) : (
          <>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts"
              className="w-full rounded-xl border border-outline-variant/20 bg-cream/60 px-4 py-2.5 text-[14px] outline-none focus:border-rose-gold/50"
            />
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {filtered.map((c) => {
                const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Contact";
                const checked = selectedIds.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] hover:bg-champagne/60",
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
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {error ? (
          <p className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}

        {selectedIds.size > 0 ? (
          <p className="flex items-center gap-2 text-[12px] text-taupe">
            <Icon name="check_circle" className="text-[16px] text-emerald-muted" />
            {selectedIds.size} contact{selectedIds.size === 1 ? "" : "s"} selected for test
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
