"use client";

import { Modal, ModalFooterActions } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/activity/format";
import type { ActivityLogEntry } from "@/lib/activity/types";
import Link from "next/link";
import { toneIconClass } from "./activity-tone";

type ActivityDetailModalProps = {
  entry: ActivityLogEntry | null;
  open: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAcknowledge: (id: string) => void;
  isRead: boolean;
};

const CATEGORY_LABELS: Record<ActivityLogEntry["category"], string> = {
  engagement: "Engagement",
  campaigns: "Campaigns",
  contacts: "Contacts",
  voice: "Voice studio",
  automation: "Automations",
  compliance: "Compliance",
  system: "System",
};

export function ActivityDetailModal({
  entry,
  open,
  onClose,
  onMarkRead,
  onDismiss,
  onAcknowledge,
  isRead,
}: ActivityDetailModalProps) {
  if (!entry) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry.title}
      description={formatAbsoluteTime(entry.createdAt)}
      icon={entry.icon}
      size="lg"
      footer={
        <ModalFooterActions
          cancelLabel="Close"
          onCancel={onClose}
          primaryLabel="Done"
          onPrimary={onClose}
        />
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneIconClass(entry.tone)}`}
          >
            <Icon name={entry.icon} className="text-[22px]" />
          </div>
          <div>
            <p className="text-[15px] leading-relaxed text-slate-text">{entry.body}</p>
            <p className="mt-2 text-[13px] text-taupe">{formatRelativeTime(entry.createdAt)}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-outline-variant/15 bg-champagne/30 p-4 text-[13px]">
          <div>
            <dt className="text-taupe">Category</dt>
            <dd className="mt-0.5 font-medium text-ink">{CATEGORY_LABELS[entry.category]}</dd>
          </div>
          <div>
            <dt className="text-taupe">Source</dt>
            <dd className="mt-0.5 font-medium capitalize text-ink">{entry.source}</dd>
          </div>
          {entry.action ? (
            <div className="col-span-2">
              <dt className="text-taupe">Action</dt>
              <dd className="mt-0.5 font-mono text-[12px] text-ink">{entry.action}</dd>
            </div>
          ) : null}
          {entry.entityType ? (
            <div>
              <dt className="text-taupe">Entity</dt>
              <dd className="mt-0.5 font-medium text-ink">{entry.entityType}</dd>
            </div>
          ) : null}
          {entry.entityId ? (
            <div>
              <dt className="text-taupe">Entity ID</dt>
              <dd className="mt-0.5 truncate font-mono text-[11px] text-ink">{entry.entityId}</dd>
            </div>
          ) : null}
        </dl>

        {entry.alert ? (
          <p className="flex items-center gap-2 rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
            <Icon name="warning" className="shrink-0" />
            This item may require your attention for compliance or delivery issues.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {entry.href ? (
            <Link
              href={entry.href}
              className="inline-flex items-center gap-1 rounded-full bg-rose-gold/15 px-4 py-2 text-[13px] font-medium text-rose-gold-deep hover:bg-rose-gold/25"
              onClick={onClose}
            >
              Go to {CATEGORY_LABELS[entry.category].toLowerCase()}
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          ) : null}
          {!isRead ? (
            <button
              type="button"
              onClick={() => onMarkRead(entry.id)}
              className="rounded-full border border-outline-variant/30 px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne"
            >
              Mark as read
            </button>
          ) : null}
          {entry.alert ? (
            <button
              type="button"
              onClick={() => onAcknowledge(entry.id)}
              className="rounded-full border border-emerald-muted/30 bg-sage-light px-4 py-2 text-[13px] font-medium text-emerald-muted"
            >
              Acknowledge alert
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDismiss(entry.id)}
            className="rounded-full px-4 py-2 text-[13px] text-taupe hover:text-ink"
          >
            Dismiss from feed
          </button>
        </div>
      </div>
    </Modal>
  );
}
