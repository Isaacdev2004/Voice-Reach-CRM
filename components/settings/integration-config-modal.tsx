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
  const managed = /twilio|resend|slybroadcast|sms|voicemail|email/i.test(integration.id + " " + integration.name);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${integration.name} setup`}
      description={managed ? "MyARI manages messaging providers for your workspace." : "Provider credentials are managed by your workspace administrator."}
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
      {managed ? <p className="mb-3 text-sm leading-relaxed text-slate-text">You do not need a provider account or API key. MyARI will review your business details, assign an approved sender where eligible, and verify replies and delivery before enabling messaging. A configured platform provider does not mean your sender is approved.</p> : null}
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
