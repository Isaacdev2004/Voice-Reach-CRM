export type NoteKind = "note" | "strategy" | "goal";

export type NoteRow = {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  contact_id?: string | null;
  created_at: string;
  updated_at?: string;
  contacts?: { id: string; first_name: string; last_name?: string | null } | null;
};
