import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin as db } from "@/lib/supabaseAdmin";
import { normalizeE164 } from "@/lib/communications/inbound";
import { openCredential, sealCredential } from "./credentials";
import type { MessagingSetup } from "../setup-schema";
import type { SendRequest } from "@/lib/providers/types";

export type Assignment = {
  id: string;
  owner_id: string;
  business_id: string;
  account_sid: string;
  brand_sid: string | null;
  campaign_sid: string | null;
  messaging_service_sid: string | null;
  from_number: string;
  registration_status: string;
  number_associated: boolean;
  verified_at: string | null;
  approved_purpose: string;
  messaging_enabled: boolean;
  provider_evidence_reference: string | null;
  verification_source: string;
  phone_sid: string | null;
};
const ACCOUNT = /^AC[0-9a-f]{32}$/i;
export function credentialKeyring(env: NodeJS.ProcessEnv = process.env) {
  const raw = env.TWILIO_ISV_TOKEN_KEYRING,
    active = env.TWILIO_ISV_TOKEN_ACTIVE_KEY_ID;
  if (!raw || !active) throw Error("Managed SMS encryption is unavailable.");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
      throw Error();
    const keys = new Map<string, Buffer>();
    for (const [id, value] of Object.entries(parsed)) {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || typeof value !== "string")
        throw Error();
      const key = Buffer.from(value, "base64");
      if (key.length !== 32 || key.toString("base64") !== value) throw Error();
      keys.set(id, key);
    }
    if (!keys.has(active) || keys.size > 10) throw Error();
    return { keys, active };
  } catch {
    throw Error("Managed SMS encryption is unavailable.");
  }
}
export async function assignmentForOwner(
  owner: string,
): Promise<Assignment | null> {
  if (!owner) throw Error("Workspace required.");
  const result = await db
    .from("isv_sms_assignments")
    .select(
      "id,owner_id,business_id,account_sid,brand_sid,campaign_sid,messaging_service_sid,from_number,registration_status,number_associated,verified_at,approved_purpose,messaging_enabled,provider_evidence_reference,verification_source,phone_sid",
    )
    .eq("owner_id", owner)
    .eq("active", true)
    .maybeSingle();
  if (result.error) throw Error("Sender assignment unavailable.");
  return result.data as Assignment | null;
}
export async function resolveCredential(
  owner: string,
  accountSid: string,
): Promise<string> {
  if (!owner || !ACCOUNT.test(accountSid))
    throw Error("Sender credentials unavailable.");
  const row = await db
    .from("isv_provider_credentials")
    .select("owner_id,account_sid,envelope")
    .eq("owner_id", owner)
    .eq("account_sid", accountSid)
    .maybeSingle();
  if (
    row.error ||
    !row.data ||
    row.data.owner_id !== owner ||
    row.data.account_sid !== accountSid
  )
    throw Error("Sender credentials unavailable.");
  try {
    return openCredential(
      row.data.envelope,
      { owner, accountSid },
      credentialKeyring().keys,
    );
  } catch {
    throw Error("Sender credentials unavailable.");
  }
}
/** Explicit private maintenance operation. Never invoked by subscriber APIs or automatically on read. */
export async function rotateCredential(
  owner: string,
  accountSid: string,
): Promise<boolean> {
  const { keys, active } = credentialKeyring();
  const row = await db
    .from("isv_provider_credentials")
    .select("envelope,revision")
    .eq("owner_id", owner)
    .eq("account_sid", accountSid)
    .maybeSingle();
  if (row.error || !row.data) throw Error("Credential rotation unavailable.");
  const plaintext = openCredential(
    row.data.envelope,
    { owner, accountSid },
    keys,
  );
  const envelope = sealCredential(
    plaintext,
    { owner, accountSid },
    active,
    keys.get(active)!,
  );
  const r = await db.rpc("isv_rotate_credential", {
    p_owner: owner,
    p_account: accountSid,
    p_revision: row.data.revision,
    p_envelope: envelope,
  });
  if (r.error) throw Error("Credential rotation unavailable.");
  return r.data === true;
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function prepareSms(request: SendRequest) {
  if (
    process.env.MANAGED_SMS_PILOT_ENABLED !== "true" ||
    process.env.ALLOW_LIVE_OUTBOUND !== "true"
  )
    throw Error("Managed SMS remains disabled.");
  if (!request.ownerId || !request.contactId)
    throw Error("An authorized workspace and contact are required.");
  const to = normalizeE164(request.to);
  if (!to) throw Error("A valid recipient is required.");
  if (request.mediaUrls?.length)
    throw Error("Managed MMS is not approved for this pilot.");
  const assignment = await assignmentForOwner(request.ownerId);
  if (
    !assignment ||
    assignment.owner_id !== request.ownerId ||
    !assignment.messaging_service_sid
  )
    throw Error("An assigned sender is required.");
  if (request.from && request.from !== assignment.from_number)
    throw Error("Sender assignment mismatch.");
  if (
    request.approvedMessage &&
    (request.approvedMessage.from !== assignment.from_number ||
      request.approvedMessage.senderIdentity !==
        digest(
          JSON.stringify({
            channel: "sms",
            from: assignment.from_number,
            account: assignment.account_sid,
          }),
        ))
  )
    throw Error("Approved sender changed. Prepare a new authorized preview.");
  // Resolve before claiming so unavailable keys do not strand authorized operations.
  const token = await resolveCredential(
    request.ownerId,
    assignment.account_sid,
  );
  const operation =
    request.idempotencyKey ||
    `${request.campaignId}:${request.recipientId}:${request.stepId || "manual"}`;
  if (!operation || operation.length > 500)
    throw Error("A stable operation key is required.");
  const hash = digest(
    JSON.stringify([
      assignment.id,
      assignment.account_sid,
      assignment.from_number,
      to,
      request.body || "",
    ]),
  );
  const claim = await db.rpc("isv_claim_sms", {
    p_owner: request.ownerId,
    p_assignment: assignment.id,
    p_contact: request.contactId,
    p_phone: to,
    p_key: operation,
    p_hash: hash,
  });
  if (claim.error || claim.data !== true)
    throw Error(
      "SMS blocked: registration, consent, suppression or operation ownership could not be verified.",
    );
  return { assignment, token, to, operation };
}
export async function finishSms(
  owner: string,
  operation: string,
  state: "sent" | "failed" | "unknown",
  sid?: string,
) {
  const result = await db
    .from("isv_sms_dispatches")
    .update({
      state,
      provider_sid: sid || null,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", owner)
    .eq("operation_key", operation)
    .eq("state", "dispatching");
  if (result.error)
    throw Error(
      "Delivery outcome could not be persisted. Do not retry automatically.",
    );
}
export async function registrationSnapshot(owner: string) {
  const a = await assignmentForOwner(owner);
  if (!a) {
    const business = await db
      .from("isv_sending_businesses")
      .select("review_status")
      .eq("owner_id", owner)
      .maybeSingle();
    if (business.error) throw Error("Registration status unavailable.");
    return business.data?.review_status === "submitted"
      ? {
          state: "submitted",
          label: "Submitted for MyARI review — not submitted to Twilio",
          number: null,
        }
      : { state: "required", label: "Registration required", number: null };
  }
  const fresh =
    !!a.verified_at &&
    Date.parse(a.verified_at) <= Date.now() &&
    Date.parse(a.verified_at) > Date.now() - 86400000;
  const approved =
    a.registration_status === "approved" &&
    a.verification_source === "twilio_api" &&
    fresh &&
    a.number_associated &&
    !!a.provider_evidence_reference;
  const enabled =
    approved &&
    a.messaging_enabled &&
    process.env.MANAGED_SMS_PILOT_ENABLED === "true" &&
    process.env.ALLOW_LIVE_OUTBOUND === "true";
  const state = enabled
    ? "enabled"
    : a.registration_status === "approved" &&
        a.verification_source === "twilio_api" &&
        !approved
      ? "pending"
      : a.registration_status;
  const labels: Record<string, string> = {
    required: "Registration required",
    incomplete: "Information incomplete",
    submitted: "Submitted",
    pending: "Pending approval",
    approved: "Approved",
    rejected: "Rejected — action required",
    suspended: "Action required",
    enabled: "Messaging enabled",
  };
  return {
    state,
    label: labels[state] || "Action required",
    number: a.from_number,
    verifiedAt: a.verified_at,
    sendingEnabled: enabled,
  };
}

export async function submitRegistration(
  owner: string,
  setup: MessagingSetup,
  version: string,
) {
  const result = await db.rpc("isv_save_registration", {
    p_owner: owner,
    p_name: setup.businessName,
    p_website: setup.website,
    p_party: setup.responsibleParty || "agent",
    p_authority: setup.authorizationDescription || "",
    p_version: version,
  });
  if (result.error) throw Error("Registration review could not be requested.");
}

/** Private operator binding only. There is deliberately no subscriber HTTP endpoint for credentials. */
export async function installCredential(
  owner: string,
  accountSid: string,
  authToken: string,
) {
  if (
    !owner ||
    !ACCOUNT.test(accountSid) ||
    !authToken ||
    authToken.length > 4096
  )
    throw Error("Invalid managed credential binding.");
  const business = await db
    .from("isv_sending_businesses")
    .select("id")
    .eq("owner_id", owner)
    .maybeSingle();
  if (business.error || !business.data)
    throw Error("Create the owner-scoped sending business first.");
  const { keys, active } = credentialKeyring();
  const envelope = sealCredential(
    authToken,
    { owner, accountSid },
    active,
    keys.get(active)!,
  );
  // Insert only. A reconnect/rotation cannot overwrite an existing binding accidentally.
  const result = await db
    .from("isv_provider_credentials")
    .insert({ owner_id: owner, account_sid: accountSid, envelope });
  if (result.error)
    throw Error(
      "Credential binding failed. Existing bindings were not overwritten.",
    );
}
