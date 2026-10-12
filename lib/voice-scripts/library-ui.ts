import type { VoiceAsset } from "@/lib/hooks/use-voice-assets";

export type ScriptCollectionId =
  | "all"
  | "new"
  | "approved"
  | "pending"
  | "campaign_ready"
  | "archive";

export type ScriptStatus = "approved" | "pending" | "campaign_ready" | "new";

export const SCRIPT_COLLECTIONS: { id: ScriptCollectionId; label: string }[] = [
  { id: "all", label: "All scripts" },
  { id: "new", label: "New" },
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending review" },
  { id: "campaign_ready", label: "Campaign ready" },
  { id: "archive", label: "Archive" },
];

export const SCRIPT_FOLDERS = [
  { id: "commercial", label: "Commercial", pattern: /commercial|office|retail/i },
  { id: "residential", label: "Residential", pattern: /residential|buyer|seller|home/i },
  { id: "follow", label: "Follow up", pattern: /follow|day \d|re-engage/i },
  { id: "open", label: "Open house", pattern: /open house|showing/i },
  { id: "expired", label: "Expired listings", pattern: /expired|listing alert/i },
  { id: "fsbo", label: "FSBO", pattern: /fsbo|for sale by owner/i },
] as const;

export function scriptStatus(asset: VoiceAsset): ScriptStatus {
  const created = new Date(asset.created_at).getTime();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (created >= weekAgo && !asset.approved) return "new";
  if (asset.approved && asset.script_id && asset.script_id !== "studio-default") return "campaign_ready";
  if (asset.approved) return "approved";
  return "pending";
}

export function statusBadge(status: ScriptStatus) {
  switch (status) {
    case "approved":
      return { label: "Approved", className: "bg-sage-light text-emerald-muted" };
    case "campaign_ready":
      return { label: "Campaign ready", className: "bg-violet-100 text-violet-900" };
    case "new":
      return { label: "New", className: "bg-sky-100 text-sky-900" };
    default:
      return { label: "Pending", className: "bg-amber-100 text-amber-900" };
  }
}

export function scriptCategory(title: string): string {
  for (const folder of SCRIPT_FOLDERS) {
    if (folder.pattern.test(title)) return folder.label;
  }
  return "General";
}

export function matchesCollection(asset: VoiceAsset, collection: ScriptCollectionId): boolean {
  const status = scriptStatus(asset);
  switch (collection) {
    case "all":
      return true;
    case "new":
      return status === "new";
    case "approved":
      return status === "approved";
    case "pending":
      return status === "pending";
    case "campaign_ready":
      return status === "campaign_ready";
    case "archive":
      return false;
    default:
      return true;
  }
}

export function formatScriptDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export function estimateDuration(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash + title.charCodeAt(i)) % 997;
  const sec = 45 + (hash % 90);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function transcriptBlocks(text: string): { time: string; body: string }[] {
  const parts = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return [{ time: "0:00", body: text }];
  const stamps = ["0:00", "0:12", "0:28", "0:45", "1:02"];
  return parts.map((body, i) => ({ time: stamps[i] ?? `1:${10 + i * 8}`, body }));
}
