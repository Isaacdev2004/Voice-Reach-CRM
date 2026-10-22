import { readWorkspaceState } from "./workspace";

const PREFIX = "myari:contacts:view:v1:";
export const CONTACT_VIEW_KEYS = ["segment", "category", "type", "source", "compliance", "activity", "search", "q", "sort", "page"] as const;
type StorageAccess = Pick<Storage, "getItem" | "setItem">;

/** Store view controls only, never contact records, selection, consent evidence or AI output. */
export function normalizedContactView(query: string): string {
  const state = readWorkspaceState(new URLSearchParams(query));
  const defaults = readWorkspaceState(new URLSearchParams());
  const result = new URLSearchParams();
  for (const key of CONTACT_VIEW_KEYS) {
    const value = String(state[key]);
    if (value !== String(defaults[key])) result.set(key, value);
  }
  return result.toString();
}

/** Explicit links win on first entry; an account switch restores only the new owner's view. */
export function restoreContactView(storage: StorageAccess, ownerId: string, query: string, queryOwner?: string): string {
  const hasExplicitView = ["market", ...CONTACT_VIEW_KEYS].some(key => new URLSearchParams(query).has(key));
  const saved = storage.getItem(PREFIX + ownerId) ?? "";
  const next = queryOwner && queryOwner !== ownerId ? saved : hasExplicitView ? query : saved;
  return normalizedContactView(next);
}

export function saveContactView(storage: StorageAccess, ownerId: string, query: string): void {
  storage.setItem(PREFIX + ownerId, normalizedContactView(query));
}
