import { resolveOwnerPlan } from "@/lib/billing/plan-limits";
import { effectiveContactAllowance } from "@/lib/contacts/allowance";
import { requireUserId } from "@/lib/auth";
import { withApiHandler } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readContactSnapshot } from "@/lib/contacts/read-snapshot";
import { loadSavedSettings } from "@/lib/billing/settings-store";
import { createContactPageHandler } from "@/lib/contacts/page-handler";
const handler = createContactPageHandler({
    requireOwnerId: requireUserId,
    loadAllowance: async (owner) =>
      effectiveContactAllowance(
        owner,
        (await resolveOwnerPlan(owner)).contactLimit,
      ),
    readContacts: (owner) => readContactSnapshot(supabaseAdmin, owner),
    loadCategories: async (owner) =>
      (await loadSavedSettings(owner))?.contactCategories,
});
export const GET=withApiHandler(async request=>{const response=await handler(request);response.headers.set("Cache-Control","private, no-store");response.headers.set("Vary","Cookie, Authorization");return response;});
