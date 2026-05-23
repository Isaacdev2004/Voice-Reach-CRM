"use client";

import {
  Modal,
  ModalFooterActions,
} from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import type { CampaignDefinition } from "@/lib/crm/types";

type ActivateCampaignModalProps = {
  open: boolean;
  onClose: () => void;
  campaign: CampaignDefinition;
  durationDays: number;
  onConfirm: () => void;
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
  const draftSteps = campaign.steps.filter((s) => s.status === "draft").length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Activate campaign"
      description="Your sequence will be queued. Eligible contacts with documented consent are enrolled automatically."
      icon="rocket_launch"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={loading ? "Activating…" : "Activate now"}
          onPrimary={onConfirm}
          primaryDisabled={loading || campaign.steps.length === 0}
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
              icon: "schedule",
              text: "Provider delivery connects in a later milestone (queued now)",
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
      </div>
    </Modal>
  );
}
