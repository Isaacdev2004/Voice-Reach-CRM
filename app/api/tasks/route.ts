import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();

  const { data, error } = await supabaseAdmin
    .from("contact_tasks")
    .select("*, contacts(id, first_name, last_name, phone)")
    .eq("owner_id", ownerId)
    .order("completed", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);

  if (error) return apiOk({ tasks: [], error: error.message });

  return apiOk({ tasks: data ?? [] });
});
