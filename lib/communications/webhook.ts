import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  twilioWebhookPublicUrl,
  validateTwilioSignature,
} from "@/lib/webhooks/twilio-signature";
import { classifyReply, normalizeE164, uniqueContactMatch } from "./inbound";
import { ownedRows } from "@/lib/delivery/owned-rows";
/** Call callbacks return no TwiML instructions: existing inbound forwarding remains configured separately. */
export async function handleInbound(request: Request, kind: "sms" | "call") {
  const raw = Object.fromEntries(new URLSearchParams(await request.text()));
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!token) return new NextResponse("Webhook unavailable", { status: 503 });
  if (
    !validateTwilioSignature(
      token,
      request.headers.get("x-twilio-signature") ?? "",
      twilioWebhookPublicUrl(request),
      raw,
    )
  )
    return new NextResponse("Invalid signature", { status: 403 });
  const from = normalizeE164(raw.From ?? ""),
    to = normalizeE164(raw.To ?? ""),
    sid = raw.MessageSid || raw.CallSid;
  if (!from || !to || !sid || !raw.AccountSid)
    return new NextResponse("Invalid event", { status: 400 });
  // The sole system-level lookup is the verified receiving-number registry, never a contact search across tenants.
  const mapping = await supabaseAdmin
    .from("subscriber_phone_numbers")
    .select("owner_id")
    .eq("phone", to)
    .eq("account_sid", raw.AccountSid)
    .eq("verified", true)
    .maybeSingle();
  if (mapping.error)
    return new NextResponse("Routing unavailable", { status: 503 });
  if (!mapping.data)
    return new NextResponse("Number routing is not configured", {
      status: 503,
    });
  const owner = mapping.data.owner_id;
  let contacts: { id: string; phone: string | null }[];
  try {
    contacts = await ownedRows("contacts", "id,phone", owner);
  } catch {
    return new NextResponse("Contact lookup unavailable", { status: 503 });
  }
  const contact = uniqueContactMatch(contacts, from);
  const body = String(raw.Body ?? "").slice(0, 10000),
    classification = kind === "sms" ? classifyReply(body) : "Needs review";
  const seconds = raw.CallDuration ? Number(raw.CallDuration) : null;
  const { error } = await supabaseAdmin.rpc("ingest_inbound_communication", {
    p_owner: owner,
    p_sid: sid,
    p_kind: kind,
    p_contact: contact?.id ?? null,
    p_from: from,
    p_to: to,
    p_body: body,
    p_status: kind === "sms" ? "received" : raw.CallStatus || "unknown",
    p_classification: classification,
    p_duration:
      seconds !== null && Number.isInteger(seconds) && seconds >= 0
        ? seconds
        : null,
  });
  if (error)
    return new NextResponse("Event could not be saved; retry", { status: 503 });
  return kind === "sms"
    ? new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      })
    : new NextResponse(null, { status: 204 });
}
