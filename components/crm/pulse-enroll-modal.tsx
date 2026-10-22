"use client";

import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import { safeFetch } from "@/lib/api-response";
import type { PulseLaneId } from "@/lib/contacts/relationship-pulse";
import { useEffect, useState } from "react";

type CampaignOption = { id: string; name: string; status: string };

type PulseEnrollModalProps = {
  open: boolean;
  onClose: () => void;
  laneId: PulseLaneId;
  laneTitle: string;
  contactCount: number;
  onSuccess: (message: string) => void;
};

export function PulseEnrollModal({
  open,
  onClose,
  laneId,
  laneTitle,
  contactCount,
  onSuccess,
}: PulseEnrollModalProps) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [activate, setActivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      const data = (await res.json()) as { campaigns?: CampaignOption[] };
      const list = (data.campaigns ?? []).filter((c) =>
        ["draft", "queued", "partial"].includes(c.status),
      );
      setCampaigns(list);
      setCampaignId(list[0]?.id ?? "");
    })();
  }, [open]);

  const submit = async () => {
    if (!campaignId) {
      setError("Choose a campaign first.");
      return;
    }
    setLoading(true);
    setError(null);
    const envelope = await safeFetch<{ message: string }>(
      "/api/contacts/relationship-pulse/enroll",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laneId, campaignId, activate }),
      },
    );
    setLoading(false);
    if (!envelope.success) {
      setError(envelope.error);
      return;
    }
    onSuccess(envelope.data?.message ?? "Contacts enrolled.");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enroll lane in campaign"
      description={`Add ${contactCount} contact${contactCount === 1 ? "" : "s"} from “${laneTitle}” to a campaign.`}
      icon="campaign"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          cancelLabel="Cancel"
          primaryLabel={loading ? "Enrolling…" : "Enroll lane"}
          onPrimary={() => void submit()}
          primaryDisabled={loading || campaigns.length === 0}
          primaryLoading={loading}
        />
      }
    >
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <p className="text-[13px] text-slate-text">
            No draft campaigns yet. Create one from Campaigns or use MyARI AI → Campaign idea, then
            return here.
          </p>
        ) : (
          <ModalField label="Campaign">
            <select
              className={modalInputClass}
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </ModalField>
        )}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant/15 bg-cream/30 px-3 py-3">
          <input
            type="checkbox"
            checked={activate}
            onChange={(e) => setActivate(e.target.checked)}
            className="mt-1"
          />
          <span className="text-[13px] leading-relaxed text-slate-text">
            <span className="font-medium text-ink">Activate and schedule sends</span>
            <br />
            Queues step runs for enrolled contacts with valid consent. Review campaign steps first.
          </span>
        </label>
        {error ? (
          <p className="rounded-xl border border-error/25 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
