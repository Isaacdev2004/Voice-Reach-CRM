import { apiOk } from "@/lib/api-response";
import { conciergeHandler } from "@/lib/concierge/access";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const GET = conciergeHandler(async (_request, owner) => {
  const tables = ["contacts", "contact_notes", "tasks"] as const;
  const results = await Promise.all(tables.map(table => supabaseAdmin.from(table).select("id", {count:"exact", head:true}).eq("owner_id", owner)));
  // Only existence signals leave the server. A failed check is never presented as zero.
  return apiOk(Object.fromEntries(tables.map((table, index) => [table, results[index].error ? null : (results[index].count ?? 0) > 0])));
});
