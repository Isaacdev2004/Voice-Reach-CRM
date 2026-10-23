import { subscriberBranding } from "@/lib/settings/branding-service";
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
  const brand = await subscriberBranding(owner);
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
      name: brand.kit.approved
        ? brand.kit.agentName
        : (s?.profile.fullName ?? ""),
      phone: brand.kit.approved ? brand.kit.phone : (s?.profile.phone ?? ""),
      headshot: brand.kit.approved
        ? brand.headshotUrl
        : (s?.profile.avatarUrl ?? ""),
      brokerage: brand.kit.approved
        ? brand.kit.businessName
        : (s?.workspace.name ?? ""),
      jobTitle: brand.kit.approved
        ? brand.kit.jobTitle
        : (s?.profile.jobTitle ?? ""),
      ...(brand.kit.approved
        ? {
            logo: brand.logoUrl,
            email: brand.kit.email,
            website: brand.kit.website,
            license: brand.kit.licenseNumber,
            disclosures: brand.kit.disclosures,
          }
        : {}),
    },
  });
});
