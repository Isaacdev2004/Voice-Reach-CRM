"use client";

import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import { NODE_KIND_OPTIONS } from "@/lib/automations/defaults";
import type { WorkflowNode, WorkflowNodeKind } from "@/lib/automations/types";
import { useEffect, useState } from "react";

type WorkflowNodeModalProps = {
  open: boolean;
  mode: "add" | "edit";
  initial?: WorkflowNode | null;
  onClose: () => void;
  onSave: (node: WorkflowNode) => void;
};

export function WorkflowNodeModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
}: WorkflowNodeModalProps) {
  const [kind, setKind] = useState<WorkflowNodeKind>("action");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meta, setMeta] = useState("");
  const [yesTitle, setYesTitle] = useState("End Workflow");
  const [yesDesc, setYesDesc] = useState("");
  const [noTitle, setNoTitle] = useState("Send SMS");
  const [noDesc, setNoDesc] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setKind(initial.kind);
      setTitle(initial.title);
      setDescription(initial.description);
      setMeta(initial.meta ?? "");
      setYesTitle(initial.decision?.yes.title ?? "End Workflow");
      setYesDesc(initial.decision?.yes.description ?? "");
      setNoTitle(initial.decision?.no.title ?? "Send SMS");
      setNoDesc(initial.decision?.no.description ?? "");
    } else {
      const opt = NODE_KIND_OPTIONS[1];
      setKind(opt.kind);
      setTitle(opt.defaultTitle);
      setDescription(opt.defaultDescription);
      setMeta("");
      setYesTitle("End Workflow");
      setYesDesc("Contact engaged");
      setNoTitle("Send SMS");
      setNoDesc("Follow-up message");
    }
  }, [open, initial]);

  const applyKind = (k: WorkflowNodeKind) => {
    const opt = NODE_KIND_OPTIONS.find((o) => o.kind === k)!;
    setKind(k);
    if (mode === "add") {
      setTitle(opt.defaultTitle);
      setDescription(opt.defaultDescription);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    const node: WorkflowNode = {
      id: initial?.id ?? `node-${crypto.randomUUID()}`,
      kind,
      title: title.trim(),
      description: description.trim(),
      meta: meta.trim() || undefined,
      decision:
        kind === "decision"
          ? {
              yes: { title: yesTitle.trim(), description: yesDesc.trim() },
              no: { title: noTitle.trim(), description: noDesc.trim() },
            }
          : undefined,
    };
    onSave(node);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add workflow step" : "Edit workflow step"}
      description="Configure triggers, actions, delays, and decisions for this automation."
      icon="account_tree"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={mode === "add" ? "Add step" : "Save changes"}
          onPrimary={handleSubmit}
          primaryDisabled={!title.trim()}
        />
      }
    >
      {mode === "add" ? (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {NODE_KIND_OPTIONS.map((opt) => (
            <button
              key={opt.kind}
              type="button"
              onClick={() => applyKind(opt.kind)}
              className={`rounded-xl border px-2 py-3 text-center text-[12px] font-medium transition-colors ${
                kind === opt.kind
                  ? "border-rose-gold bg-rose-gold/10 text-ink"
                  : "border-outline-variant/20 text-taupe hover:bg-champagne"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        <ModalField label="Title" required>
          <input className={modalInputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </ModalField>
        <ModalField label="Description">
          <textarea
            className={`${modalInputClass} min-h-[72px] resize-none py-3`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </ModalField>
        <ModalField label="Notes (optional)">
          <input className={modalInputClass} value={meta} onChange={(e) => setMeta(e.target.value)} />
        </ModalField>

        {kind === "decision" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-muted/20 bg-sage-light/30 p-4 space-y-3">
              <p className="text-[12px] font-semibold uppercase text-emerald-muted">Yes branch</p>
              <input
                className={modalInputClass}
                value={yesTitle}
                onChange={(e) => setYesTitle(e.target.value)}
                placeholder="Title"
              />
              <input
                className={modalInputClass}
                value={yesDesc}
                onChange={(e) => setYesDesc(e.target.value)}
                placeholder="Description"
              />
            </div>
            <div className="rounded-xl border border-error/20 bg-error-container/20 p-4 space-y-3">
              <p className="text-[12px] font-semibold uppercase text-error">No branch</p>
              <input
                className={modalInputClass}
                value={noTitle}
                onChange={(e) => setNoTitle(e.target.value)}
                placeholder="Title"
              />
              <input
                className={modalInputClass}
                value={noDesc}
                onChange={(e) => setNoDesc(e.target.value)}
                placeholder="Description"
              />
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
