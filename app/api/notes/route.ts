import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { titleFromFreeform } from "@/lib/notes/freeform";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

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

  let query = supabaseAdmin
    .from("contact_notes")
    .select("*, contacts(id, first_name, last_name)")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (kind && KindSchema.safeParse(kind).success) query = query.eq("kind", kind);
  if (contactId) query = query.eq("contact_id", contactId);

  const { data, error } = await query;
  if (error) return apiOk({ notes: [], error: error.message });
  return apiOk({ notes: data ?? [] });
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

  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "NOTE_CREATED",
    entityType: "contact_note",
    entityId: note.id,
    metadata: { kind: parsed.kind, contactId: parsed.contactId },
  });

  return apiOk({ note }, { status: 201 });
});
