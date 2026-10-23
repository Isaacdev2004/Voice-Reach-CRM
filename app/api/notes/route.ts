import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { titleFromFreeform } from "@/lib/notes/freeform";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { relatedContactIds } from "@/lib/notes/workspace";
import type { NoteRow } from "@/lib/notes/types";

const KindSchema = z.enum(["note", "strategy", "goal"]);

const CreateNoteSchema = z.object({
  title: z.string().max(200).optional().default(""),
  body: z.string().max(8000).default(""),
  kind: KindSchema.optional().default("note"),
  contactId: z.string().uuid().optional().nullable(),
});

export const GET = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const contactId = searchParams.get("contactId");

  if (contactId) {
    const { data: contact, error } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("id", contactId)
      .maybeSingle();
    if (error)
      return apiError("Unable to verify contact. Please retry.", {
        status: 503,
      });
    if (!contact) return apiError("Contact not found", { status: 404 });
  }

  if (contactId && !z.string().uuid().safeParse(contactId).success)
    return apiError("Invalid contact", { status: 400 });
  try {
    const [rows, contacts] = await Promise.all([
      ownedRows<NoteRow>("contact_notes", "*", ownerId),
      ownedRows<{ id: string; first_name: string; last_name?: string }>(
        "contacts",
        "id, first_name, last_name",
        ownerId,
      ),
    ]);
    const byId = new Map(contacts.map((c) => [c.id, c]));
    const notes = rows
      .filter(
        (n) =>
          (!kind || !KindSchema.safeParse(kind).success || n.kind === kind) &&
          (!contactId || relatedContactIds(n).includes(contactId)),
      )
      .sort((a, b) =>
        (b.updated_at ?? b.created_at).localeCompare(
          a.updated_at ?? a.created_at,
        ),
      )
      .map((n) => ({
        ...n,
        contacts: n.contact_id ? (byId.get(n.contact_id) ?? null) : null,
      }));
    return apiOk({ notes });
  } catch {
    return apiError("Unable to load notes. Please retry.", { status: 503 });
  }
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const parsed = CreateNoteSchema.parse(await request.json());
  const raw = parsed.body.trim();
  if (!raw && !parsed.title.trim()) {
    return apiError("Write something before saving.", { status: 400 });
  }

  if (parsed.contactId) {
    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("id", parsed.contactId)
      .maybeSingle();
    if (!contact) return apiError("Contact not found", { status: 404 });
  }

  const title = titleFromFreeform(raw, parsed.title);
  const body = raw || title;

  const { data: note, error } = await supabaseAdmin
    .from("contact_notes")
    .insert({
      owner_id: ownerId,
      contact_id: parsed.contactId || null,
      kind: parsed.kind,
      title,
      body,
    })
    .select("*, contacts(id, first_name, last_name)")
    .single();

  if (error)
    return apiError("Unable to save note. Please retry.", { status: 503 });

  await writeAuditLog({
    ownerId,
    action: "NOTE_CREATED",
    entityType: "contact_note",
    entityId: note.id,
    metadata: { kind: parsed.kind, contactId: parsed.contactId },
  }).catch(() => undefined);

  return apiOk({ note }, { status: 201 });
});
