import type { NoteKind } from "@/lib/notes/types";

export type NotesFilterTab =
  | "all"
  | "note"
  | "strategy"
  | "clients"
  | "goal"
  | "ideas"
  | "tasks"
  | "meeting"
  | "templates";

export const NOTES_FILTER_TABS: { id: NotesFilterTab; label: string }[] = [
  { id: "all", label: "All notes" },
  { id: "strategy", label: "Strategy" },
  { id: "clients", label: "Clients" },
  { id: "goal", label: "Goals" },
  { id: "ideas", label: "Ideas" },
  { id: "tasks", label: "Tasks" },
  { id: "meeting", label: "Meeting notes" },
  { id: "templates", label: "Templates" },
];

export type NoteLike = {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  contact_id?: string | null;
};

export function noteHaystack(note: NoteLike) {
  return `${note.title}\n${note.body}`.toLowerCase();
}

export function matchesFilterTab(note: NoteLike, tab: NotesFilterTab): boolean {
  const hay = noteHaystack(note);
  switch (tab) {
    case "all":
      return true;
    case "note":
      return note.kind === "note";
    case "strategy":
      return note.kind === "strategy" || /strategy|social media|market/i.test(hay);
    case "clients":
      return Boolean(note.contact_id);
    case "goal":
      return note.kind === "goal" || /goal|next step/i.test(hay);
    case "ideas":
      return /idea|brainstorm|opportunity/i.test(hay);
    case "tasks":
      return /- \[ \]|- \[x\]|task|follow up/i.test(hay);
    case "meeting":
      return /meeting|showing|call recap/i.test(hay);
    case "templates":
      return /template|script|outline/i.test(hay);
    default:
      return true;
  }
}

export function tagChips(note: NoteLike): { label: string; className: string }[] {
  const hay = noteHaystack(note);
  const tags: { label: string; className: string }[] = [];
  if (note.contact_id) tags.push({ label: "Client", className: "bg-rose-gold/15 text-rose-gold-deep" });
  if (note.kind === "strategy" || /strategy/i.test(hay))
    tags.push({ label: "Strategy", className: "bg-violet-100 text-violet-900" });
  if (/follow up|follow-up/i.test(hay))
    tags.push({ label: "Follow up", className: "bg-amber-100 text-amber-900" });
  if (/social media/i.test(hay))
    tags.push({ label: "Social media", className: "bg-sky-100 text-sky-900" });
  if (note.kind === "goal") tags.push({ label: "Goal", className: "bg-sage-light text-emerald-muted" });
  if (tags.length === 0) tags.push({ label: "Note", className: "bg-champagne text-taupe" });
  return tags.slice(0, 3);
}

export function noteListIcon(note: NoteLike): string {
  if (note.kind === "goal") return "flag";
  if (note.kind === "strategy") return "lightbulb";
  if (/- \[ \]/.test(note.body)) return "checklist";
  if (note.contact_id) return "person";
  return "description";
}

export function checklistLines(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^- \[[ xX]\]/.test(l))
    .map((l) => l.replace(/^- \[[ xX]\]\s*/, ""));
}
