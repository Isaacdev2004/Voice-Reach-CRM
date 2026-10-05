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
  EMAIL_ATTACHMENT_MIME_TYPES,
  EMAIL_MAX_ATTACHMENTS,
  SMS_MAX_ATTACHMENTS,
  SMS_MMS_MIME_TYPES,
} from "@/lib/campaigns/attachments";
import { uploadCampaignAttachment } from "@/lib/campaigns/upload-attachment";
import {
  CAMPAIGN_STEP_TYPES,
  getStepTypeOption,
  parseDayNumber,
} from "@/lib/crm/campaign-steps";
import type { CampaignStep, CampaignStepAttachment, CampaignStepType } from "@/lib/crm/types";
import { useEffect, useRef, useState } from "react";

type EditCampaignStepModalProps = {
  open: boolean;
  step: CampaignStep | null;
  onClose: () => void;
  onSave: (step: CampaignStep) => void;
};

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [attachments, setAttachments] = useState<CampaignStepAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !step) return;
    setType(step.type);
    setTitle(step.title);
    setDescription(step.description);
    setDay(parseDayNumber(step.dayLabel));
    setTimeLabel(step.timeLabel || "9:00 AM");
    setAttachments(step.attachments ?? []);
    setUploadError(null);
  }, [open, step]);

  if (!step) return null;

  const supportsAttachments = type === "sms" || type === "email";
  const maxAttachments = type === "sms" ? SMS_MAX_ATTACHMENTS : EMAIL_MAX_ATTACHMENTS;
  const accept =
    type === "sms"
      ? SMS_MMS_MIME_TYPES.join(",")
      : EMAIL_ATTACHMENT_MIME_TYPES.join(",");

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
      attachments: supportsAttachments && attachments.length ? attachments : undefined,
    });
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !supportsAttachments) return;

    if (attachments.length >= maxAttachments) {
      setUploadError(
        type === "sms"
          ? "SMS supports one image attachment (MMS)."
          : `Email supports up to ${EMAIL_MAX_ATTACHMENTS} attachments.`,
      );
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadCampaignAttachment(file, type === "sms" ? "sms" : "email");
      setAttachments((prev) =>
        type === "sms" ? [uploaded] : [...prev, uploaded].slice(0, EMAIL_MAX_ATTACHMENTS),
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
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

        {supportsAttachments ? (
          <div className="rounded-xl border border-outline-variant/15 bg-cream/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-ink">
                  {type === "sms" ? "MMS image" : "Email attachments"}
                </p>
                <p className="mt-1 text-[12px] text-taupe">
                  {type === "sms"
                    ? "Optional JPEG, PNG, or GIF (max 5 MB)."
                    : "Optional PDF, images, or text files (max 10 MB each, up to 5 files)."}
                </p>
              </div>
              <button
                type="button"
                disabled={uploading || attachments.length >= maxAttachments}
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 rounded-full border border-rose-gold px-4 py-2 text-[12px] font-semibold text-rose-gold-deep transition-colors hover:bg-rose-gold/5 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Add file"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => void handleFileSelect(e)}
            />
            {attachments.length ? (
              <ul className="mt-3 space-y-2">
                {attachments.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-ivory px-3 py-2 text-[13px]"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-ink">
                      <Icon name="attach_file" className="shrink-0 text-[18px] text-rose-gold-deep" />
                      <span className="truncate">{file.fileName}</span>
                      {file.sizeBytes ? (
                        <span className="shrink-0 text-taupe">({formatFileSize(file.sizeBytes)})</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== file.id))}
                      className="shrink-0 text-[12px] font-medium text-taupe hover:text-error"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {uploadError ? (
              <p className="mt-2 text-[12px] text-error">{uploadError}</p>
            ) : null}
          </div>
        ) : null}

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
          <code className="rounded bg-ivory px-1 text-[12px]">{"{{agent_name}}"}</code> - they autofill
          when the campaign runs.
        </p>
      </form>
    </Modal>
  );
}
