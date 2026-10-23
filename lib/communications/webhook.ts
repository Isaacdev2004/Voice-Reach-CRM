import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  twilioWebhookPublicUrl,
  validateTwilioSignature,
} from "@/lib/webhooks/twilio-signature";
import { classifyReply, normalizeE164, uniqueContactMatch } from "./inbound";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { quarantineInbound, sharedReceiver, saveCallEvent } from "./safety";
/** Call callbacks return no TwiML instructions: existing inbound forwarding remains configured separately. */
async function handleInboundEvent(request: Request, kind: "sms" | "call") {
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
  const configuredAccount = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (configuredAccount && raw.AccountSid !== configuredAccount)
    return new NextResponse("Account mismatch", { status: 403 });
  const from = normalizeE164(raw.From ?? ""),
    to = normalizeE164(raw.To ?? ""),
    sid = raw.MessageSid || raw.CallSid;
  if (!from || !to || !sid || !raw.AccountSid)
    return new NextResponse("Invalid event", { status: 400 });
  const success = () =>
    kind === "sms"
      ? new NextResponse("<Response></Response>", {
          headers: { "Content-Type": "text/xml" },
        })
      : new NextResponse(null, { status: 204 });
  // Shared inbound SMS/calls carry no reliable subscriber identity. Never select the most recent sender or a global phone match.
  if (sharedReceiver(to)) {
    try {
      await quarantineInbound(
        raw,
        kind,
        "Shared receiving number has no unambiguous subscriber context.",
      );
      return success();
    } catch {
      return new NextResponse("Routing storage unavailable; retry", {
        status: 503,
      });
    }
  }
  let receiver = to,
    caller = from,
    parentOwner: string | null = null;
  if (kind === "call" && raw.ParentCallSid) {
    const parent = await supabaseAdmin
      .from("audit_logs")
      .select("owner_id, metadata")
      .eq("action", "TWILIO_CALL_EVENT")
      .eq("metadata->>sid", raw.ParentCallSid)
      .eq("metadata->>accountSid", raw.AccountSid)
      .is("metadata->>parentSid", null)
      .limit(1)
      .maybeSingle();
    if (parent.error)
      return new NextResponse("Call routing unavailable", { status: 503 });
    if (!parent.data) {
      try {
        await quarantineInbound(
          raw,
          kind,
          "Parent call routing has not been verified.",
        );
        return success();
      } catch {
        return new NextResponse("Routing storage unavailable; retry", {
          status: 503,
        });
      }
    }
    parentOwner = parent.data.owner_id;
    receiver = parent.data.metadata.to;
    caller = parent.data.metadata.from;
  }
  const mapping = await supabaseAdmin
    .from("subscriber_phone_numbers")
    .select("owner_id")
    .eq("phone", receiver)
    .eq("account_sid", raw.AccountSid)
    .eq("verified", true)
    .maybeSingle();
  if (mapping.error)
    return new NextResponse("Routing unavailable", { status: 503 });
  if (
    !mapping.data ||
    (parentOwner && parentOwner !== mapping.data.owner_id) ||
    (kind === "call" &&
      raw.Direction &&
      raw.Direction !== "inbound" &&
      !raw.ParentCallSid)
  ) {
    try {
      await quarantineInbound(
        raw,
        kind,
        "Verified dedicated receiving-number routing is unavailable.",
      );
      return success();
    } catch {
      return new NextResponse("Routing storage unavailable; retry", {
        status: 503,
      });
    }
  }
  const owner = mapping.data.owner_id;
  let contacts: { id: string; phone: string | null }[];
  try {
    contacts = await ownedRows("contacts", "id,phone", owner);
  } catch {
    return new NextResponse("Contact lookup unavailable", { status: 503 });
  }
  const contact = uniqueContactMatch(contacts, caller);
  const body = String(raw.Body ?? "").slice(0, 10000),
    classification = kind === "sms" ? classifyReply(body) : "Needs review";
  if (kind === "sms" && !contact) {
    try {
      await quarantineInbound(
        raw,
        kind,
        "Dedicated number is verified, but contact association is ambiguous or missing.",
      );
    } catch {
      return new NextResponse("Routing storage unavailable; retry", {
        status: 503,
      });
    }
  }
  const seconds = raw.CallDuration ? Number(raw.CallDuration) : null;
  if (kind === "call") {
    try {
      await saveCallEvent(owner, contact?.id ?? null, raw);
    } catch {
      return new NextResponse("Call event storage unavailable; retry", {
        status: 503,
      });
    }
    // Forwarded child legs retain separate provider evidence and must not replace the parent call's disposition.
    if (raw.ParentCallSid) return success();
  }
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

export async function handleInbound(request: Request, kind: "sms" | "call") {
  try {
    return await handleInboundEvent(request, kind);
  } catch {
    return new NextResponse("Inbound processing unavailable; retry", {
      status: 503,
    });
  }
}
