import { verifyTwilioBusinessNumber } from "@/lib/communications/verify-number";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadSavedSettings } from "@/lib/billing/settings-store";
import { ownedRows } from "@/lib/delivery/owned-rows";
import {
  emptyBrandKit,
  BrandKitSchema,
  onboardingSteps,
} from "@/lib/settings/brand-kit";
import {
  getGoogleConnection,
  listGoogleCalendars,
} from "@/lib/calendar/google";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  try {
    const [settings, partners, contacts, campaigns, phones, google] =
      await Promise.all([
        loadSavedSettings(owner),
        ownedRows<{ kind: string; preferred: boolean }>(
          "financing_partners",
          "id,kind,preferred",
          owner,
        ),
        ownedRows("contacts", "id", owner),
        ownedRows("campaigns", "id", owner),
        supabaseAdmin
          .from("subscriber_phone_numbers")
          .select("id,phone,account_sid")
          .eq("owner_id", owner)
          .eq("verified", true),
        getGoogleConnection(owner).catch(() => null),
      ]);
    if (phones.error) throw Error();
    const parsed = BrandKitSchema.safeParse(settings?.brandKit);
    const kit = parsed.success ? parsed.data : emptyBrandKit();
    // Saved authorization alone is not a verified provider connection.
    const googleVerified = google
      ? await listGoogleCalendars(google)
          .then(() => true)
          .catch(() => false)
      : false;
    const twilioVerified = (
      await Promise.all(
        (phones.data ?? []).map((p) =>
          verifyTwilioBusinessNumber(p.phone, p.account_sid),
        ),
      )
    ).some(Boolean);
    const steps = onboardingSteps({
      kit,
      profileComplete:
        !!settings?.profile.fullName &&
        !!settings?.profile.phone &&
        !!settings?.profile.timezone,
      hasLender: partners.some((p) => p.kind === "lender" && p.preferred),
      hasTitle: partners.some((p) => p.kind === "title" && p.preferred),
      twilioVerified,
      googleVerified,
      campaigns: campaigns.length,
      contacts: contacts.length,
    });
    return apiOk({
      steps,
      completed: steps.filter((s) => s.done).length,
      total: steps.length,
      dismissed: kit.onboardingDismissed,
    });
  } catch {
    return apiError(
      "Setup progress could not be fully verified. Open the linked settings to review configuration.",
      { status: 503 },
    );
  }
});
