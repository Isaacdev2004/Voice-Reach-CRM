import "server-only";
import { supabaseAdmin as db } from "@/lib/supabaseAdmin";
import { assignmentForOwner, resolveCredential, digest } from "./service";
/** Private read-only Twilio verification. Never provisions, purchases, submits, or enables a sender. */
export async function refreshSenderVerification(owner: string) {
  const a = await assignmentForOwner(owner);
  if (!a) throw Error("Sender assignment required.");
  const valid = (value: string | null, prefix: string) =>
    !!value && new RegExp(`^${prefix}[0-9a-f]{32}$`, "i").test(value);
  if (
    !valid(a.account_sid, "AC") ||
    !valid(a.brand_sid, "BN") ||
    !valid(a.campaign_sid, "QE") ||
    !valid(a.messaging_service_sid, "MG") ||
    !valid(a.phone_sid, "PN")
  )
    throw Error("Complete provider resource references are required.");
  const business = await db
    .from("isv_sending_businesses")
    .select("customer_profile_sid,verified_at")
    .eq("owner_id", owner)
    .eq("id", a.business_id)
    .maybeSingle();
  if (
    business.error ||
    !business.data?.verified_at ||
    !business.data?.customer_profile_sid
  )
    throw Error("Sending business must be independently verified first.");
  const token = await resolveCredential(owner, a.account_sid),
    auth = Buffer.from(`${a.account_sid}:${token}`).toString("base64");
  const read = async (path: string) => {
    const r = await fetch(`https://messaging.twilio.com/v1/${path}`, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!r.ok) throw Error("Provider verification unavailable.");
    return r.json();
  };
  try {
    const [brand, campaign, phone] = await Promise.all([
      read(`a2p/BrandRegistrations/${a.brand_sid}`),
      read(
        `Services/${a.messaging_service_sid}/Compliance/Usa2p/${a.campaign_sid}`,
      ),
      read(`Services/${a.messaging_service_sid}/PhoneNumbers/${a.phone_sid}`),
    ]);
    const approved =
      brand.account_sid === a.account_sid &&
      brand.sid === a.brand_sid &&
      brand.status === "APPROVED" &&
      brand.customer_profile_bundle_sid ===
        business.data.customer_profile_sid &&
      brand.mock !== true &&
      campaign.account_sid === a.account_sid &&
      campaign.sid === a.campaign_sid &&
      campaign.brand_registration_sid === a.brand_sid &&
      campaign.messaging_service_sid === a.messaging_service_sid &&
      campaign.campaign_status === "VERIFIED" &&
      phone.account_sid === a.account_sid &&
      phone.service_sid === a.messaging_service_sid &&
      phone.sid === a.phone_sid &&
      phone.phone_number === a.from_number &&
      phone.country_code === "US" &&
      Array.isArray(phone.capabilities) &&
      phone.capabilities.includes("SMS");
    const verifiedAt = new Date().toISOString();
    const r = await db
      .from("isv_sms_assignments")
      .update({
        registration_status: approved ? "approved" : "pending",
        verification_source: approved ? "twilio_api" : "unverified",
        number_associated: approved,
        verified_at: approved ? verifiedAt : null,
        provider_evidence_reference: approved
          ? digest(
              JSON.stringify([
                a.account_sid,
                a.brand_sid,
                a.campaign_sid,
                a.messaging_service_sid,
                a.phone_sid,
                verifiedAt,
              ]),
            )
          : null,
        messaging_enabled: false,
      })
      .eq("owner_id", owner)
      .eq("id", a.id)
      .eq("account_sid", a.account_sid)
      .eq("brand_sid", a.brand_sid)
      .eq("campaign_sid", a.campaign_sid)
      .eq("messaging_service_sid", a.messaging_service_sid)
      .eq("phone_sid", a.phone_sid)
      .select("id");
    if (r.error || r.data?.length !== 1)
      throw Error("Assignment changed during verification.");
    return { approved, sendingEnabled: false };
  } catch {
    await db
      .from("isv_sms_assignments")
      .update({
        messaging_enabled: false,
        registration_status: "pending",
        verified_at: null,
        verification_source: "unverified",
      })
      .eq("owner_id", owner)
      .eq("id", a.id);
    throw Error(
      "Provider verification could not be confirmed; sending remains disabled.",
    );
  }
}
