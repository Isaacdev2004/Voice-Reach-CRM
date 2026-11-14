import { supabaseAdmin } from "@/lib/supabaseAdmin";
/** Separate from plan selection; never changes billing or other entitlements. */
export async function effectiveContactAllowance(
  ownerId: string,
  planLimit: number | null,
): Promise<number | null> {
  if (process.env.CONTACT_ALLOWANCE_OVERRIDES_ENABLED !== "true")
    return planLimit;
  if (!ownerId) throw Error("Unauthorized");
  const result = await supabaseAdmin
    .from("contact_allowance_overrides")
    .select("contacts_limit")
    .eq("owner_id", ownerId)
    .eq("enabled", true)
    .maybeSingle();
  if (result.error)
    throw Error(
      "Contact allowance could not be verified. No contacts were added.",
    );
  if (!result.data) return planLimit;
  const limit = result.data.contacts_limit;
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw Error("Contact allowance could not be verified.");
  return limit;
}
