import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MetadataSchema, metadataOf, type WorkspaceNote } from "./workspace";
import type { NoteRow } from "./types";
export type NotesMode = "advanced" | "basic" | "read-only";
export function missingColumn(
  error: { code?: string; message?: string } | null,
) {
  return !!error && ["42703", "PGRST204"].includes(error.code ?? "");
}
export async function notesMode(owner: string): Promise<NotesMode> {
  const checks = await Promise.all(
    ["metadata", "revision", "client_key"].map((column) =>
      supabaseAdmin
        .from("contact_notes")
        .select(column)
        .eq("owner_id", owner)
        .limit(0),
    ),
  );
  if (checks.some((r) => r.error && !missingColumn(r.error)))
    throw Error("NOTES_UNAVAILABLE");
  const missing = checks.filter((r) => missingColumn(r.error)).length;
  return missing === 0 ? "advanced" : missing === 3 ? "basic" : "read-only";
}
export function normalizeNote(
  row: NoteRow & { metadata?: unknown; revision?: number; client_key?: string },
  basicProperty = false,
): WorkspaceNote {
  const m = metadataOf(row);
  return {
    ...row,
    metadata: {
      ...m,
      propertyContactIds:
        basicProperty && row.contact_id
          ? [row.contact_id]
          : m.propertyContactIds,
      contactIds: [
        ...new Set([row.contact_id, ...m.contactIds].filter(Boolean)),
      ] as string[],
    },
    revision: row.revision ?? 0,
    client_key: row.client_key ?? row.id,
  };
}
export function basicMetadata(
  kind: "note" | "strategy" | "goal",
  contactId?: string | null,
) {
  return MetadataSchema.parse({
    category:
      kind === "goal" ? "Goals" : kind === "strategy" ? "Strategy" : "General",
    contactIds: contactId ? [contactId] : [],
  });
}
export function canSaveBasic(
  meta: ReturnType<typeof MetadataSchema.parse>,
  kind: "note" | "strategy" | "goal",
) {
  const baseline = basicMetadata(kind, meta.contactIds[0]);
  return (
    meta.contactIds.length <= 1 &&
    meta.category === baseline.category &&
    !meta.tags.length &&
    meta.propertyContactIds.length <= 1 &&
    meta.propertyContactIds.every((id) => id === meta.contactIds[0]) &&
    !meta.pinned &&
    !meta.isTemplate &&
    !meta.originalTranscript &&
    !meta.transcriptSource &&
    !meta.priorityIds.length
  );
}
