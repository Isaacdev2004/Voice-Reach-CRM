export type AvatarDraft = {
  id: string;
  title: string;
  description: string;
  campaignId?: string;
  status: "draft" | "pending_approval" | "ready";
  createdAt: string;
};

const SCRIPT_KEY = "voicereach-studio-script-v2";
const ASSIGNMENT_KEY = "voicereach-studio-campaign-id";
const AVATAR_KEY = "voicereach-avatar-drafts";
const NOTIFY_KEY = "voicereach-voice-clone-notify";
const LOCAL_RECORDINGS_KEY = "voicereach-local-recordings";

export type LocalRecording = {
  id: string;
  title: string;
  blobUrl: string;
  durationSec: number;
  createdAt: string;
  approved: boolean;
};

/** Neutral sample for any subscriber — edit before recording or sending. */
export const DEFAULT_VOICE_SCRIPT =
  "Hi [FirstName], this is [Agent] with [Brokerage]. I wanted to leave a quick note and see if I can help with anything in [City] this week. No pressure — just a friendly check-in. Feel free to call or text me back when you have a moment. Talk soon.";

export function loadScriptText(): string {
  if (typeof window === "undefined") return DEFAULT_VOICE_SCRIPT;
  return localStorage.getItem(SCRIPT_KEY) || DEFAULT_VOICE_SCRIPT;
}

export function saveScriptText(text: string) {
  localStorage.setItem(SCRIPT_KEY, text);
}

export function loadCampaignAssignment(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ASSIGNMENT_KEY) || "";
}

export function saveCampaignAssignment(campaignId: string) {
  localStorage.setItem(ASSIGNMENT_KEY, campaignId);
}

export function loadAvatarDrafts(): AvatarDraft[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(AVATAR_KEY) || "[]") as AvatarDraft[];
  } catch {
    return [];
  }
}

export function saveAvatarDrafts(drafts: AvatarDraft[]) {
  localStorage.setItem(AVATAR_KEY, JSON.stringify(drafts));
}

export function addAvatarDraft(draft: Omit<AvatarDraft, "id" | "createdAt" | "status">) {
  const drafts = loadAvatarDrafts();
  const entry: AvatarDraft = {
    ...draft,
    id: `avatar-${crypto.randomUUID()}`,
    status: "pending_approval",
    createdAt: new Date().toISOString(),
  };
  drafts.unshift(entry);
  saveAvatarDrafts(drafts);
  return entry;
}

export function removeAvatarDraft(id: string) {
  saveAvatarDrafts(loadAvatarDrafts().filter((d) => d.id !== id));
}

export function saveNotifyEmail(email: string) {
  const list: string[] = JSON.parse(localStorage.getItem(NOTIFY_KEY) || "[]");
  if (!list.includes(email)) list.push(email);
  localStorage.setItem(NOTIFY_KEY, JSON.stringify(list));
}

export function loadLocalRecordings(): LocalRecording[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_RECORDINGS_KEY) || "[]") as LocalRecording[];
  } catch {
    return [];
  }
}

export function addLocalRecording(rec: LocalRecording) {
  const list = loadLocalRecordings();
  list.unshift(rec);
  localStorage.setItem(LOCAL_RECORDINGS_KEY, JSON.stringify(list.slice(0, 20)));
}

export function removeLocalRecording(id: string) {
  const next = loadLocalRecordings().filter((r) => r.id !== id);
  localStorage.setItem(LOCAL_RECORDINGS_KEY, JSON.stringify(next));
  return next;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
