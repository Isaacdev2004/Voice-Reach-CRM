"use client";

import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import type { TeamMember } from "@/lib/settings/types";

type TeamMemberModalProps = {
  member: TeamMember | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (member: TeamMember) => void;
  onRemove: (id: string) => void;
  onResendInvite: (member: TeamMember) => void;
};

export function TeamMemberModal({
  member,
  open,
  onClose,
  onUpdate,
  onRemove,
  onResendInvite,
}: TeamMemberModalProps) {
  if (!member) return null;

  const isOwner = member.role === "owner";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member.name}
      description={member.email}
      icon="manage_accounts"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          cancelLabel="Close"
          primaryLabel="Save"
          onPrimary={onClose}
        />
      }
    >
      <div className="space-y-4">
        <ModalField label="Role">
          <select
            className={modalInputClass}
            value={member.role}
            disabled={isOwner}
            onChange={(e) =>
              onUpdate({ ...member, role: e.target.value as TeamMember["role"] })
            }
          >
            <option value="owner">Workspace owner</option>
            <option value="admin">Admin</option>
            <option value="billing">Billing manager</option>
            <option value="user">User</option>
          </select>
        </ModalField>
        <ModalField label="Status">
          <select
            className={modalInputClass}
            value={member.status}
            disabled={isOwner}
            onChange={(e) =>
              onUpdate({ ...member, status: e.target.value as TeamMember["status"] })
            }
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </ModalField>
        {member.status === "pending" ? (
          <button
            type="button"
            onClick={() => onResendInvite(member)}
            className="text-[13px] font-medium text-rose-gold-deep hover:underline"
          >
            Resend invitation email
          </button>
        ) : null}
        {!isOwner ? (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Remove ${member.name} from the workspace?`)) {
                onRemove(member.id);
                onClose();
              }
            }}
            className="text-[13px] font-medium text-error hover:underline"
          >
            Remove from workspace
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
