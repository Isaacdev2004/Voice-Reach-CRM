"use client";

import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  CAMPAIGN_STEP_TYPES,
  getStepTypeOption,
  parseDayNumber,
} from "@/lib/crm/campaign-steps";
import type { CampaignStep, CampaignStepType } from "@/lib/crm/types";
import { useEffect, useState } from "react";

type EditCampaignStepModalProps = {
  open: boolean;
  step: CampaignStep | null;
  onClose: () => void;
  onSave: (step: CampaignStep) => void;
};

export function EditCampaignStepModal({
  open,
  step,
  onClose,
  onSave,
}: EditCampaignStepModalProps) {
  const [type, setType] = useState<CampaignStepType>("email");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState(1);
  const [timeLabel, setTimeLabel] = useState("9:00 AM");

  useEffect(() => {
    if (!open || !step) return;
    setType(step.type);
    setTitle(step.title);
    setDescription(step.description);
    setDay(parseDayNumber(step.dayLabel));
    setTimeLabel(step.timeLabel || "9:00 AM");
  }, [open, step]);

  if (!step) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      ...step,
      type,
      title: title.trim(),
      description: description.trim() || getStepTypeOption(type).defaultDescription,
      dayLabel: `Day ${Math.max(1, day)}`,
      timeLabel: timeLabel.trim() || "9:00 AM",
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit sequence step"
      description="Update the message copy, channel, and timing. Save the campaign afterward to keep changes."
      icon="edit"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel="Save step"
          primaryType="submit"
          formId="edit-campaign-step-form"
        />
      }
    >
      <form id="edit-campaign-step-form" onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className={cn("mb-3 text-[13px] font-medium text-taupe")}>Touchpoint type</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CAMPAIGN_STEP_TYPES.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => setType(option.type)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center transition-all",
                  type === option.type
                    ? "border-rose-gold bg-rose-gold/10 text-ink"
                    : "border-outline-variant/25 bg-cream/40 text-taupe hover:border-rose-gold/30",
                )}
              >
                <Icon name={option.icon} className="text-[24px] text-rose-gold-deep" />
                <span className="text-[12px] font-medium leading-tight">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <ModalField label="Step title" required>
          <input
            className={modalInputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </ModalField>

        <ModalField
          label={
            type === "email"
              ? "Email copy (optional first line: Subject: …)"
              : type === "sms"
                ? "SMS text"
                : "Script / description"
          }
        >
          <textarea
            className={`${modalInputClass} min-h-[140px] resize-y py-3`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder={
              type === "sms"
                ? "Hi {{first_name}}, this is {{agent_name}}…"
                : "Subject: …\n\nHi {{first_name}},…"
            }
          />
        </ModalField>

        <div className="grid grid-cols-2 gap-4">
          <ModalField label="Day in sequence" required>
            <input
              className={modalInputClass}
              type="number"
              min={1}
              max={90}
              value={day}
              onChange={(e) => setDay(Number.parseInt(e.target.value, 10) || 1)}
            />
          </ModalField>
          <ModalField label="Send time">
            <input
              className={modalInputClass}
              value={timeLabel}
              onChange={(e) => setTimeLabel(e.target.value)}
            />
          </ModalField>
        </div>

        <p className="rounded-xl bg-champagne/50 px-4 py-3 text-[13px] text-taupe">
          Use{" "}
          <code className="rounded bg-ivory px-1 text-[12px]">{"{{first_name}}"}</code>,{" "}
          <code className="rounded bg-ivory px-1 text-[12px]">{"{{property_address}}"}</code>,{" "}
          <code className="rounded bg-ivory px-1 text-[12px]">{"{{area}}"}</code>,{" "}
          <code className="rounded bg-ivory px-1 text-[12px]">{"{{agent_name}}"}</code> — they autofill
          when the campaign runs.
        </p>
      </form>
    </Modal>
  );
}
