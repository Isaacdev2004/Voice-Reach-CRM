"use client";
import { Modal, ModalFooterActions } from "@/components/crm/modal";
import type { IntegrationConfig } from "@/lib/settings/types";
export function IntegrationConfigModal({
  integration,
  open,
  onClose,
}: {
  integration: IntegrationConfig | null;
  open: boolean;
  onClose: () => void;
  onSave: (integration: IntegrationConfig) => void;
}) {
  if (!integration) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${integration.name} setup`}
      description="Provider credentials are managed by your workspace administrator."
      icon={integration.icon}
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          cancelLabel="Close"
          primaryLabel="Done"
          onPrimary={onClose}
        />
      }
    >
      <p className="text-sm leading-relaxed text-slate-text">
        This Settings form does not securely provision provider credentials or
        verify a connection. Do not paste secret keys into profile or
        account-label fields.
      </p>
      <p className="mt-3 text-sm text-slate-text">
        Use the existing Google Calendar and Dotloop authorization actions where
        available. Server-managed SMS, email, AI and voicemail credentials must
        be configured through the authorized environment setup, then verified in
        staging.
      </p>
    </Modal>
  );
}
