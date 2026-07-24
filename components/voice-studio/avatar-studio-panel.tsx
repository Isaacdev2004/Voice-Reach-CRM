"use client";

import { AvatarDraftsStrip } from "@/components/crm/avatar-drafts-strip";
import { LuxuryCard } from "@/components/crm/luxury-card";
import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useCampaignOptions } from "@/lib/hooks/use-campaign-options";
import {
  addAvatarDraft,
  loadAvatarDrafts,
  removeAvatarDraft,
  saveAvatarDrafts,
  type AvatarDraft,
} from "@/lib/voice-studio/storage";
import Link from "next/link";
import { useEffect, useState } from "react";

const SEED_DRAFTS: AvatarDraft[] = [
  {
    id: "seed-1",
    title: "Elena — market update",
    description: "Personalized video for luxury seller nurture, Day 3 touch.",
    status: "pending_approval",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-2",
    title: "Seller nurture — Day 2",
    description: "AI avatar intro with property highlights.",
    status: "pending_approval",
    createdAt: new Date().toISOString(),
  },
];

type Toast = { message: string; tone: "success" | "error" };

export function AvatarStudioPanel() {
  const { options: campaigns } = useCampaignOptions();
  const [drafts, setDrafts] = useState<AvatarDraft[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const stored = loadAvatarDrafts();
    if (stored.length === 0) {
      saveAvatarDrafts(SEED_DRAFTS);
      setDrafts(SEED_DRAFTS);
    } else {
      setDrafts(stored);
    }
    setCampaignId(campaigns[0]?.id ?? "");
  }, [campaigns]);

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    const draft = addAvatarDraft({
      title: title.trim(),
      description: description.trim() || "Avatar message draft — pending approval before send.",
      campaignId: campaignId || undefined,
    });
    setDrafts(loadAvatarDrafts());
    setCreateOpen(false);
    setTitle("");
    setDescription("");
    showToast(`Draft "${draft.title}" created`);
  };

  const handleDelete = (id: string) => {
    removeAvatarDraft(id);
    setDrafts(loadAvatarDrafts());
    showToast("Draft removed");
  };

  const handleApprove = (draft: AvatarDraft) => {
    const next = loadAvatarDrafts().map((d) =>
      d.id === draft.id ? { ...d, status: "ready" as const } : d,
    );
    saveAvatarDrafts(next);
    setDrafts(next);
    showToast("Marked ready for campaign (preview)");
  };

  return (
    <>
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[150] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-card",
            toast.tone === "success" ? "border-emerald-muted/30 bg-ivory" : "border-error/30",
          )}
          role="status"
        >
          <Icon name="check_circle" className="text-emerald-muted" />
          <span className="text-[14px] text-ink">{toast.message}</span>
        </div>
      ) : null}

      <AvatarDraftsStrip onCreateClick={() => setCreateOpen(true)} />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory"
        >
          <Icon name="add" className="text-[20px]" />
          Create avatar draft
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {drafts.map((draft) => (
          <LuxuryCard key={draft.id} padding="md">
            <div className="aspect-video rounded-2xl bg-champagne flex items-center justify-center relative">
              <Icon name="smart_display" className="text-[48px] text-taupe/50" />
              <button
                type="button"
                onClick={() => handleDelete(draft.id)}
                className="absolute top-2 right-2 rounded-full bg-ivory/90 p-1.5 text-taupe hover:text-error"
                aria-label="Delete draft"
              >
                <Icon name="delete" className="text-[18px]" />
              </button>
            </div>
            <h4 className="mt-3 font-medium text-ink">{draft.title}</h4>
            <p className="mt-1 text-[13px] text-slate-text line-clamp-2">{draft.description}</p>
            <p className="mt-2 text-[12px] text-taupe">
              {draft.status === "ready"
                ? "Ready for campaign"
                : "Draft · Pending approval"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApprove(draft)}
                className="rounded-full bg-sage-light px-3 py-1.5 text-[12px] font-medium text-emerald-muted"
              >
                Approve draft
              </button>
              <Link
                href="/dashboard/campaigns"
                className="rounded-full border border-outline-variant/30 px-3 py-1.5 text-[12px] font-medium text-rose-gold-deep hover:bg-champagne"
              >
                Use in campaign →
              </Link>
            </div>
          </LuxuryCard>
        ))}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create avatar draft"
        description="Placeholder for AI avatar video — assign to a campaign when ready."
        icon="smart_display"
        size="lg"
        footer={
          <ModalFooterActions
            onCancel={() => setCreateOpen(false)}
            primaryLabel="Create draft"
            onPrimary={handleCreate}
            primaryDisabled={!title.trim()}
          />
        }
      >
        <div className="space-y-4">
          <ModalField label="Draft title" required>
            <input
              className={modalInputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Elena — market update"
              autoFocus
            />
          </ModalField>
          <ModalField label="Message outline">
            <textarea
              className={`${modalInputClass} min-h-[88px] resize-none py-3`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should the avatar say?"
              rows={3}
            />
          </ModalField>
          <ModalField label="Campaign">
            <select
              className={modalInputClass}
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">No campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </ModalField>
        </div>
      </Modal>
    </>
  );
}
