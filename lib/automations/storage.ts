import { DEFAULT_WORKFLOW } from "./defaults";
import type { AutomationWorkflow } from "./types";

const STORAGE_KEY = "voicereach-automation-workflows";
const ACTIVE_KEY = "voicereach-active-workflow-id";

export function loadWorkflowsLocal(): AutomationWorkflow[] {
  if (typeof window === "undefined") return [DEFAULT_WORKFLOW];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as AutomationWorkflow[]) : [];
    return list.length > 0 ? list : [DEFAULT_WORKFLOW];
  } catch {
    return [DEFAULT_WORKFLOW];
  }
}

export function saveWorkflowsLocal(workflows: AutomationWorkflow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
}

export function loadActiveWorkflowId(): string {
  if (typeof window === "undefined") return DEFAULT_WORKFLOW.id;
  return localStorage.getItem(ACTIVE_KEY) || DEFAULT_WORKFLOW.id;
}

export function saveActiveWorkflowId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export async function fetchWorkflowsRemote(): Promise<AutomationWorkflow[] | null> {
  const res = await fetch("/api/automations");
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return (data.workflows as AutomationWorkflow[]) ?? null;
}

export async function persistWorkflowRemote(workflow: AutomationWorkflow) {
  const res = await fetch("/api/automations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Save failed");
  return data;
}
