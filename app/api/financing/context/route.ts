import { apiSuccess } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadSavedSettings } from "@/lib/billing/settings-store";
import { readContactSnapshot } from "@/lib/contacts/read-snapshot";
import { financingHandler } from "@/lib/financing/api";
export const GET = financingHandler(async () => {
  const owner = await requireUserId();
  const contacts = await readContactSnapshot(supabaseAdmin, owner);
  const s = await loadSavedSettings(owner);
  return apiSuccess({
    contacts: contacts.map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
      property_address: c.property_address,
      preferred_area: c.preferred_area,
      budget: c.budget,
    })),
    branding: {
      name: s?.profile.fullName ?? "",
      phone: s?.profile.phone ?? "",
      headshot: s?.profile.avatarUrl ?? "",
      brokerage: s?.workspace.name ?? "",
      jobTitle: s?.profile.jobTitle ?? "",
    },
  });
});
