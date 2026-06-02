"use client";

import { WorkflowNodeCard } from "@/components/automations/workflow-node-card";
import { WorkflowNodeModal } from "@/components/automations/workflow-node-modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { DEFAULT_WORKFLOW } from "@/lib/automations/defaults";
import {
  fetchWorkflowsRemote,
  loadActiveWorkflowId,
  loadWorkflowsLocal,
  persistWorkflowRemote,
  saveActiveWorkflowId,
  saveWorkflowsLocal,
} from "@/lib/automations/storage";
import type { AutomationWorkflow, WorkflowNode } from "@/lib/automations/types";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Toast = { message: string; tone: "success" | "error" };

export function AutomationWorkflowsPage() {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([DEFAULT_WORKFLOW]);
  const [activeId, setActiveId] = useState(DEFAULT_WORKFLOW.id);
  const [zoom, setZoom] = useState(100);
  const [nodeModal, setNodeModal] = useState<{ mode: "add" | "edit"; node?: WorkflowNode } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const active = workflows.find((w) => w.id === activeId) ?? workflows[0];

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  const persistLocal = useCallback((list: AutomationWorkflow[]) => {
    setWorkflows(list);
    saveWorkflowsLocal(list);
  }, []);

  const updateActive = useCallback(
    (patch: Partial<AutomationWorkflow>) => {
      if (!active) return;
      const updated = { ...active, ...patch, updatedAt: new Date().toISOString() };
      persistLocal(workflows.map((w) => (w.id === active.id ? updated : w)));
    },
    [active, workflows, persistLocal],
  );

  useEffect(() => {
    (async () => {
      const local = loadWorkflowsLocal();
      const remote = await fetchWorkflowsRemote();
      // Merge remote + local so unsaved local workflows don't disappear.
      // Prefer remote values when ids collide.
      const byId = new Map<string, AutomationWorkflow>();
      (local ?? []).forEach((w) => byId.set(w.id, w));
      (remote ?? []).forEach((w) => byId.set(w.id, w));
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      persistLocal(merged.length ? merged : [DEFAULT_WORKFLOW]);
      const id = loadActiveWorkflowId();
      if (merged.some((w) => w.id === id)) setActiveId(id);
      else setActiveId((merged[0] ?? DEFAULT_WORKFLOW).id);
    })();
  }, [persistLocal]);

  const saveWorkflow = async (wf: AutomationWorkflow, message?: string) => {
    setSaving(true);
    try {
      await persistWorkflowRemote(wf);
      persistLocal(workflows.map((w) => (w.id === wf.id ? wf : w)));
      showToast(message ?? "Workflow saved");
    } catch (e) {
      persistLocal(workflows.map((w) => (w.id === wf.id ? wf : w)));
      showToast(
        e instanceof Error ? `${e.message} — saved on this device` : "Saved locally",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSelectWorkflow = (id: string) => {
    setActiveId(id);
    saveActiveWorkflowId(id);
  };

  const handleNewWorkflow = () => {
    const wf: AutomationWorkflow = {
      id: `wf-${crypto.randomUUID()}`,
      name: "Untitled workflow",
      description: "Describe what this automation does…",
      status: "draft",
      nodes: [
        {
          id: `node-${crypto.randomUUID()}`,
          kind: "trigger",
          title: "New trigger",
          description: "When an event occurs",
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    persistLocal([wf, ...workflows]);
    setActiveId(wf.id);
    saveActiveWorkflowId(wf.id);
    showToast("New workflow created");
  };

  const handleDuplicate = () => {
    if (!active) return;
    const copy: AutomationWorkflow = {
      ...active,
      id: `wf-${crypto.randomUUID()}`,
      name: `${active.name} (copy)`,
      status: "draft",
      nodes: active.nodes.map((n) => ({ ...n, id: `node-${crypto.randomUUID()}` })),
      updatedAt: new Date().toISOString(),
    };
    persistLocal([copy, ...workflows]);
    setActiveId(copy.id);
    showToast("Workflow duplicated");
  };

  const handleDeleteWorkflow = () => {
    if (workflows.length <= 1) {
      showToast("Keep at least one workflow", "error");
      return;
    }
    if (!confirm(`Delete "${active?.name}"?`)) return;
    const next = workflows.filter((w) => w.id !== activeId);
    persistLocal(next);
    setActiveId(next[0].id);
    showToast("Workflow deleted");
  };

  const handleSaveNode = (node: WorkflowNode) => {
    if (!active) return;
    const exists = active.nodes.some((n) => n.id === node.id);
    const nodes = exists
      ? active.nodes.map((n) => (n.id === node.id ? node : n))
      : [...active.nodes, node];
    const updated = { ...active, nodes, updatedAt: new Date().toISOString() };
    persistLocal(workflows.map((w) => (w.id === active.id ? updated : w)));
    showToast(exists ? "Step updated" : "Step added");
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!active || active.nodes.length <= 1) {
      showToast("Workflow needs at least one step", "error");
      return;
    }
    const nodes = active.nodes.filter((n) => n.id !== nodeId);
    updateActive({ nodes });
    showToast("Step removed");
  };

  const handleActivate = async () => {
    if (!active) return;
    const updated = { ...active, status: "active" as const };
    await saveWorkflow(updated, "Workflow activated — runs when triggers fire");
  };

  const handlePause = async () => {
    if (!active) return;
    const updated = { ...active, status: "paused" as const };
    await saveWorkflow(updated, "Workflow paused");
  };

  const handleFitView = () => {
    setZoom(100);
    canvasRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!active) return null;

  const statusBadge =
    active.status === "active"
      ? "bg-sage-light text-emerald-muted"
      : active.status === "paused"
        ? "bg-champagne text-taupe"
        : "bg-rose-gold/15 text-rose-gold-deep";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-cream">
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[150] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-card",
            toast.tone === "success" ? "border-emerald-muted/30 bg-ivory" : "border-error/30",
          )}
          role="status"
        >
          <Icon
            name={toast.tone === "success" ? "check_circle" : "error"}
            className={toast.tone === "success" ? "text-emerald-muted" : "text-error"}
          />
          <span className="text-[14px] text-ink">{toast.message}</span>
        </div>
      ) : null}

      <header className="shrink-0 border-b border-outline-variant/10 bg-ivory px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
              Automations
            </p>
            <input
              className="mt-1 w-full max-w-md bg-transparent font-serif text-[28px] font-semibold text-ink outline-none border-b border-transparent focus:border-rose-gold/40"
              value={active.name}
              onChange={(e) => updateActive({ name: e.target.value })}
            />
            <input
              className="mt-1 block w-full max-w-lg bg-transparent text-[14px] text-slate-text outline-none"
              value={active.description}
              onChange={(e) => updateActive({ description: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-[11px] font-bold uppercase", statusBadge)}>
              {active.status}
            </span>
            <button
              type="button"
              onClick={() => void saveWorkflow(active)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-ivory px-4 py-2 text-[13px] font-medium text-ink disabled:opacity-50"
            >
              <Icon name="save" className="text-[18px]" />
              {saving ? "Saving…" : "Save"}
            </button>
            {active.status === "active" ? (
              <button
                type="button"
                onClick={() => void handlePause()}
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 px-4 py-2 text-[13px] font-medium text-taupe"
              >
                <Icon name="pause" />
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleActivate()}
                disabled={active.nodes.length === 0}
                className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-4 py-2 text-[13px] font-medium text-ivory disabled:opacity-50"
              >
                <Icon name="play_arrow" />
                Activate
              </button>
            )}
            <Link
              href="/dashboard/automations/rules"
              className="inline-flex items-center gap-2 rounded-full border border-rose-gold/40 bg-rose-gold/10 px-4 py-2 text-[13px] font-medium text-rose-gold-deep transition-colors hover:bg-rose-gold/20"
            >
              <Icon name="bolt" className="text-[16px]" />
              Trigger rules
            </Link>
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-4 py-2 text-[13px] text-rose-gold-deep"
            >
              Campaigns
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-outline-variant/10 bg-ivory p-4">
          <button
            type="button"
            onClick={handleNewWorkflow}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-gold py-2.5 text-[13px] font-medium text-ivory"
          >
            <Icon name="add" />
            New workflow
          </button>
          <ul className="space-y-2">
            {workflows.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => handleSelectWorkflow(w.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                    w.id === activeId
                      ? "border-rose-gold/40 bg-champagne"
                      : "border-transparent hover:bg-cream",
                  )}
                >
                  <p className="truncate text-[14px] font-medium text-ink">{w.name}</p>
                  <p className="text-[11px] text-taupe">
                    {w.nodes.length} steps · {w.status}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-outline-variant/10 pt-4">
            <button
              type="button"
              onClick={handleDuplicate}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-taupe hover:bg-cream"
            >
              <Icon name="content_copy" className="text-[18px]" />
              Duplicate
            </button>
            <button
              type="button"
              onClick={handleDeleteWorkflow}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-error hover:bg-error-container/20"
            >
              <Icon name="delete" className="text-[18px]" />
              Delete workflow
            </button>
          </div>
        </aside>

        <div className="relative min-w-0 flex-1 overflow-hidden workflow-canvas">
          <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setNodeModal({ mode: "add" })}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-gold text-ivory shadow-card hover:opacity-90"
              aria-label="Add step"
            >
              <Icon name="add" />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory text-[11px] font-bold shadow-card">
              {zoom}%
            </div>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory shadow-card text-taupe hover:text-ink"
              aria-label="Zoom in"
            >
              <Icon name="zoom_in" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory shadow-card text-taupe hover:text-ink"
              aria-label="Zoom out"
            >
              <Icon name="remove" />
            </button>
            <button
              type="button"
              onClick={handleFitView}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory shadow-card text-taupe hover:text-ink"
              aria-label="Reset view"
            >
              <Icon name="center_focus_strong" />
            </button>
          </div>

          <div
            ref={canvasRef}
            className="h-full w-full overflow-auto p-8"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          >
            <div className="mx-auto flex max-w-lg flex-col items-center gap-14 pb-24">
              {active.nodes.map((node, index) => (
                <WorkflowNodeCard
                  key={node.id}
                  node={node}
                  showConnector={index < active.nodes.length - 1}
                  onEdit={() => setNodeModal({ mode: "edit", node })}
                  onDelete={() => handleDeleteNode(node.id)}
                />
              ))}

              <button
                type="button"
                onClick={() => setNodeModal({ mode: "add" })}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-rose-gold/40 text-rose-gold-deep transition-colors hover:border-rose-gold hover:bg-rose-gold/5"
                aria-label="Add step to workflow"
              >
                <Icon name="add" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <WorkflowNodeModal
        open={Boolean(nodeModal)}
        mode={nodeModal?.mode ?? "add"}
        initial={nodeModal?.node}
        onClose={() => setNodeModal(null)}
        onSave={handleSaveNode}
      />
    </div>
  );
}
