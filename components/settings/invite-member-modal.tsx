"use client";

import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import type { TeamMember } from "@/lib/settings/types";
import { useState } from "react";

type InviteMemberModalProps = {
  open: boolean;
  onClose: () => void;
  onInvite: (member: TeamMember) => void;
};

export function InviteMemberModal({ open, onClose, onInvite }: InviteMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamMember["role"]>("user");
  const [sending, setSending] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setRole("user");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 600));
    onInvite({
      id: `tm-${crypto.randomUUID()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      status: "pending",
    });
    setSending(false);
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Invite team member"
      description="They'll receive an email to join your workspace."
      icon="person_add"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel="Send invite"
          onPrimary={() => {}}
          primaryType="submit"
          formId="invite-member-form"
          primaryLoading={sending}
          primaryDisabled={!name.trim() || !email.trim()}
        />
      }
    >
      <form id="invite-member-form" onSubmit={handleSubmit} className="space-y-4">
        <ModalField label="Full name" required>
          <input
            className={modalInputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </ModalField>
        <ModalField label="Email" required>
          <input
            type="email"
            className={modalInputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </ModalField>
        <ModalField label="Role">
          <select
            className={modalInputClass}
            value={role}
            onChange={(e) => setRole(e.target.value as TeamMember["role"])}
          >
            <option value="admin">Admin</option>
            <option value="billing">Billing manager</option>
            <option value="user">User</option>
          </select>
        </ModalField>
      </form>
    </Modal>
  );
}
