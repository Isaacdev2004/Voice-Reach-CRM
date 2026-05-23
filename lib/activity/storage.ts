const READ_KEY = "vr-activity-read";
const DISMISSED_KEY = "vr-activity-dismissed";

function parseSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

export function loadReadIds(): Set<string> {
  return parseSet(READ_KEY);
}

export function loadDismissedIds(): Set<string> {
  return parseSet(DISMISSED_KEY);
}

export function markRead(ids: string[]) {
  const set = loadReadIds();
  ids.forEach((id) => set.add(id));
  saveSet(READ_KEY, set);
}

export function markDismissed(ids: string[]) {
  const set = loadDismissedIds();
  ids.forEach((id) => set.add(id));
  saveSet(DISMISSED_KEY, set);
}

export function clearDismissed(ids: string[]) {
  const set = loadDismissedIds();
  ids.forEach((id) => set.delete(id));
  saveSet(DISMISSED_KEY, set);
}

export async function fetchActivityLogs(): Promise<{
  entries: import("./types").ActivityLogEntry[];
  error?: string;
}> {
  const res = await fetch("/api/activity", { cache: "no-store" });
  const data = (await res.json()) as {
    entries?: import("./types").ActivityLogEntry[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Failed to load activity");
  return { entries: data.entries ?? [], error: data.error };
}

export async function acknowledgeOnServer(
  ids: string[],
  action: "read" | "dismiss" | "acknowledge",
) {
  await fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, action }),
  });
}

export function exportActivityCsv(
  entries: import("./types").ActivityLogEntry[],
  formatTime: (iso: string) => string,
) {
  const headers = ["id", "category", "title", "body", "time", "source", "action", "entity_type", "entity_id"];
  const rows = entries.map((e) =>
    [
      e.id,
      e.category,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.body.replace(/"/g, '""')}"`,
      formatTime(e.createdAt),
      e.source,
      e.action ?? "",
      e.entityType ?? "",
      e.entityId ?? "",
    ].join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `voicereach-activity-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
