"use client";

import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import type { IntegrationConfig } from "@/lib/settings/types";
import { useEffect, useState } from "react";

type IntegrationConfigModalProps = {
  integration: IntegrationConfig | null;
  open: boolean;
  onClose: () => void;
  onSave: (integration: IntegrationConfig) => void;
};

export function IntegrationConfigModal({
  integration,
  open,
  onClose,
  onSave,
}: IntegrationConfigModalProps) {
  const [accountId, setAccountId] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (integration) {
      setAccountId(integration.accountLabel ?? "");
      setApiSecret("");
    }
  }, [integration]);

  if (!integration) return null;

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    onSave({
      ...integration,
      connected: true,
      accountLabel: accountId || integration.accountLabel || "configured",
      secretHint: apiSecret ? `••••${apiSecret.slice(-4)}` : integration.secretHint,
      lastSync: new Date().toISOString(),
    });
    setSaving(false);
    onClose();
  };

  const handleDisconnect = () => {
    onSave({
      ...integration,
      connected: false,
      accountLabel: undefined,
      secretHint: undefined,
      lastSync: undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Configure ${integration.name}`}
      description="Store credentials securely for outbound voice and messaging."
      icon={integration.icon}
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          cancelLabel="Cancel"
          primaryLabel={integration.connected ? "Update" : "Connect"}
          onPrimary={handleSave}
          primaryLoading={saving}
        />
      }
    >
      <div className="space-y-4">
        <ModalField label="Account SID / API key">
          <input
            className={modalInputClass}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="ACxxxxxxxx or SG.xxxxxxxx"
          />
        </ModalField>
        <ModalField label="Auth token / secret">
          <input
            type="password"
            className={modalInputClass}
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Enter secret to update"
          />
        </ModalField>
        {integration.connected ? (
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-[13px] font-medium text-error hover:underline"
          >
            Disconnect integration
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
