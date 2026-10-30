import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notesFailure } from "@/lib/notes/server";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  const [campaigns, tasks] = await Promise.all([
    supabaseAdmin
      .from("campaigns")
      .select("id,name,status")
      .eq("owner_id", owner)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabaseAdmin
      .from("contact_tasks")
      .select("id,title,completed")
      .eq("owner_id", owner)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  if (campaigns.error || tasks.error) return notesFailure();
  return apiOk({
    campaigns: campaigns.data ?? [],
    tasks: tasks.data ?? [],
    unsupported: [
      "Transactions and opportunities have no independently verified record tables in this schema.",
    ],
  });
});
