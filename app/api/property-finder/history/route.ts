import { createHash } from "node:crypto";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PropertyHistorySchema } from "@/lib/property-finder/history";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  try {
    const { data, error } = await supabaseAdmin.from("audit_logs")
      .select("id,created_at,entity_id,metadata").eq("owner_id", ownerId)
      .eq("action", "PROPERTY_SEARCH_ACTION").order("created_at", { ascending: false }).limit(50);
    if (error) return apiError("Search history is unavailable. Please retry.", { status: 503 });
    return apiOk({ entries: data ?? [] });
  } catch { return apiError("Search history is unavailable. Please retry.", { status: 503 }); }
});

export const POST = withApiHandler(async request => {
  const ownerId = await requireUserId();
  const parsed = PropertyHistorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid search history action.", { status: 400 });
  const body = parsed.data;
  try {
    if (body.contactId) {
      const result = await supabaseAdmin.from("contacts").select("id")
        .eq("owner_id", ownerId).eq("id", body.contactId).maybeSingle();
      if (result.error) return apiError("Search history could not be saved. Please retry.", { status: 503 });
      if (!result.data) return apiError("Client not found.", { status: 404 });
    }
    // An owner-scoped event key plus the existing primary key makes retries idempotent,
    // including concurrent retries. Never upsert: a repeated key must not rewrite history.
    const hex = createHash("sha256").update(JSON.stringify([ownerId, body.eventId])).digest("hex");
    const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
    const row = { id, owner_id: ownerId, action: "PROPERTY_SEARCH_ACTION", entity_type: body.contactId ? "contact" : "property_search", entity_id: body.contactId, metadata: { kind: body.kind, url: body.url } };
    const inserted = await supabaseAdmin.from("audit_logs").insert(row);
    if (inserted.error?.code === "23505") {
      const previous = await supabaseAdmin.from("audit_logs").select("entity_id,metadata")
        .eq("owner_id", ownerId).eq("id", id).eq("action", row.action).maybeSingle();
      if (!previous.error && previous.data?.entity_id === body.contactId && previous.data?.metadata?.kind === body.kind && previous.data?.metadata?.url === body.url) return apiOk({ recorded: true });
      return apiError("This history action has already been used.", { status: 409 });
    }
    if (inserted.error) return apiError("Search history could not be saved. Please retry.", { status: 503 });
    return apiOk({ recorded: true });
  } catch { return apiError("Search history could not be saved. Please retry.", { status: 503 }); }
});
