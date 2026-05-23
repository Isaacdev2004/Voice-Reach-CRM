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
  suggestNextScheduling,
} from "@/lib/crm/campaign-steps";
import type { CampaignStep, CampaignStepType } from "@/lib/crm/types";
import { useEffect, useState } from "react";

type AddCampaignStepModalProps = {
  open: boolean;
  onClose: () => void;
  existingSteps: CampaignStep[];
  onAdd: (step: CampaignStep) => void;
};

export function AddCampaignStepModal({
  open,
  onClose,
  existingSteps,
  onAdd,
}: AddCampaignStepModalProps) {
  const [type, setType] = useState<CampaignStepType>("email");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState(1);
  const [timeLabel, setTimeLabel] = useState("9:00 AM");

  useEffect(() => {
    if (!open) return;
    const suggested = suggestNextScheduling(existingSteps);
    const option = getStepTypeOption("email");
    setType("email");
    setTitle(option.defaultTitle);
    setDescription(option.defaultDescription);
    setDay(suggested.day);
    setTimeLabel(suggested.timeLabel);
  }, [open, existingSteps]);

  const applyTypeDefaults = (nextType: CampaignStepType) => {
    const option = getStepTypeOption(nextType);
    setType(nextType);
    setTitle(option.defaultTitle);
    setDescription(option.defaultDescription);
    setTimeLabel(option.defaultTime);
  };

  const handleClose = () => onClose();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const step: CampaignStep = {
      id: `step-${crypto.randomUUID()}`,
      order: existingSteps.length + 1,
      type,
      title: title.trim(),
      description: description.trim() || getStepTypeOption(type).defaultDescription,
      dayLabel: `Day ${Math.max(1, day)}`,
      timeLabel: timeLabel.trim() || "9:00 AM",
      status: "draft",
    };

    onAdd(step);
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add automation step"
      description="Choose a touchpoint, schedule it, and add it to your sequence."
      icon="add_circle"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={handleClose}
          primaryLabel="Add to sequence"
          primaryType="submit"
          formId="add-campaign-step-form"
        />
      }
    >
      <form id="add-campaign-step-form" onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className={cn("mb-3 text-[13px] font-medium text-taupe")}>Touchpoint type</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CAMPAIGN_STEP_TYPES.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => applyTypeDefaults(option.type)}
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
            placeholder="e.g. Follow-up email"
            required
          />
        </ModalField>

        <ModalField label="Description">
          <textarea
            className={`${modalInputClass} min-h-[80px] resize-none py-3`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
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
              placeholder="9:00 AM"
            />
          </ModalField>
        </div>

        <p className="rounded-xl bg-champagne/50 px-4 py-3 text-[13px] text-taupe">
          New steps are saved as <strong className="text-ink">Draft</strong> until you activate the
          campaign. Compliance checks run before each send.
        </p>
      </form>
    </Modal>
  );
}
