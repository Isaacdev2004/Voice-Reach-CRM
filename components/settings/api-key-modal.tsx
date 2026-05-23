"use client";

import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import { useState } from "react";

type ApiKeyModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (label: string) => { fullKey: string } | void;
  createdKey: string | null;
};

export function ApiKeyModal({ open, onClose, onCreate, createdKey }: ApiKeyModalProps) {
  const [label, setLabel] = useState("");

  const handleCreate = () => {
    if (!label.trim()) return;
    onCreate(label.trim());
    setLabel("");
  };

  const copyKey = () => {
    if (createdKey) void navigator.clipboard.writeText(createdKey);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={createdKey ? "API key created" : "Create API key"}
      description={
        createdKey
          ? "Copy this key now — you won't be able to see it again."
          : "Keys authenticate server-side requests to VoiceReach."
      }
      icon="key"
      size="md"
      footer={
        createdKey ? (
          <ModalFooterActions
            onCancel={onClose}
            cancelLabel="Done"
            primaryLabel="Copy key"
            onPrimary={copyKey}
          />
        ) : (
          <ModalFooterActions
            onCancel={onClose}
            primaryLabel="Generate key"
            onPrimary={handleCreate}
            primaryDisabled={!label.trim()}
          />
        )
      }
    >
      {createdKey ? (
        <div className="rounded-xl border border-outline-variant/20 bg-champagne/50 p-4">
          <code className="break-all text-[13px] text-ink">{createdKey}</code>
        </div>
      ) : (
        <ModalField label="Key label" required>
          <input
            className={modalInputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Production CRM"
          />
        </ModalField>
      )}
    </Modal>
  );
}
