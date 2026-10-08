"use client";

import { Modal, ModalFooterActions } from "@/components/crm/modal";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useState } from "react";

type CampaignRow = {
  id: string;
  name: string;
  status: string;
};

type AssignContactToCampaignModalProps = {
  open: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  onAssigned: (message: string) => void;
};

export function AssignContactToCampaignModal({
  open,
  onClose,
  contactId,
  contactName,
  onAssigned,
}: AssignContactToCampaignModalProps) {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setSaveError(null);
    setLoadError(null);
    void (async () => {
      setLoading(true);
      const envelope = await safeFetch<{ campaigns: CampaignRow[] }>("/api/campaigns");
      setLoading(false);
      if (envelope.success) {
        setCampaigns(envelope.data.campaigns ?? []);
      } else {
        setLoadError(envelope.error);
        setCampaigns([]);
      }
    })();
  }, [open]);

  const handleAssign = async () => {
    if (!selectedId) return;
    setSaving(true);
    setSaveError(null);
    const envelope = await safeFetch<{ enrolled?: number; skipped?: number }>(
      `/api/campaigns/${selectedId}/recipients`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: [contactId] }),
      },
    );
    setSaving(false);
    if (!envelope.success) {
      setSaveError(envelope.error);
      return;
    }
    const name = campaigns.find((c) => c.id === selectedId)?.name ?? "campaign";
    onAssigned(`${contactName} added to “${name}”. Open the campaign to launch or run the scheduler.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign to campaign"
      description={`Enroll ${contactName} in a sequence. Consent rules still apply.`}
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          cancelLabel="Cancel"
          primaryLabel={saving ? "Adding…" : "Add to campaign"}
          onPrimary={handleAssign}
          primaryDisabled={!selectedId || saving}
          primaryLoading={saving}
        />
      }
    >
      {loading ? (
        <p className="text-[13px] text-taupe">Loading campaigns…</p>
      ) : loadError ? (
        <p className="text-[13px] text-error">{loadError}</p>
      ) : campaigns.length === 0 ? (
        <p className="text-[13px] text-taupe">
          No campaigns yet.{" "}
          <Link href="/dashboard/campaigns" className="font-medium text-rose-gold-deep hover:underline">
            Create one
          </Link>{" "}
          first.
        </p>
      ) : (
        <ul className="max-h-[320px] space-y-2 overflow-y-auto">
          {campaigns.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-[14px] transition-colors",
                  selectedId === c.id
                    ? "border-rose-gold/50 bg-rose-gold/10"
                    : "border-outline-variant/20 bg-champagne/30 hover:bg-champagne",
                )}
              >
                <span className="font-medium text-ink">{c.name}</span>
                <span className="text-[11px] uppercase tracking-wider text-taupe">{c.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {saveError ? <p className="mt-3 text-[13px] text-error">{saveError}</p> : null}
    </Modal>
  );
}
