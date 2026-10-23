/* Signature-valid synthetic webhooks; no Twilio Console access, calls or SMS. */
const test = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const { fixture, id, owner } = require("./campaign-audit/harness.cjs");
function setup() {
  const f = fixture();
  f.tables.subscriber_phone_numbers = [
    {
      id: id(50),
      owner_id: owner,
      phone: "+15555550999",
      account_sid: "ACsynthetic",
      verified: true,
    },
  ];
  f.tables.contacts = [
    { id: id(1), owner_id: owner, first_name: "Owned", phone: "+15555550123" },
    {
      id: id(2),
      owner_id: "foreign",
      first_name: "Private",
      phone: "+15555550123",
    },
  ];
  const ingested = [];
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async (name, args) => {
    ingested.push(args);
    return { data: { id: id(90) }, error: null };
  };
  return { ...f, ingested };
}
async function env(fn) {
  const keys = [
    "TWILIO_AUTH_TOKEN",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_FROM_NUMBER",
    "APP_BASE_URL",
  ];
  const prior = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    TWILIO_AUTH_TOKEN: "synthetic-token",
    TWILIO_ACCOUNT_SID: "ACsynthetic",
  });
  delete process.env.TWILIO_FROM_NUMBER;
  delete process.env.APP_BASE_URL;
  try {
    await fn();
  } finally {
    for (const k of keys)
      if (prior[k] === undefined) delete process.env[k];
      else process.env[k] = prior[k];
  }
}
function request(raw, kind = "sms", bad = false) {
  const url =
    "https://qa.example.test/api/webhooks/twilio/" +
    (kind === "sms" ? "sms" : "calls");
  const signature = crypto
    .createHmac("sha1", "synthetic-token")
    .update(
      url +
        Object.keys(raw)
          .sort()
          .map((k) => k + raw[k])
          .join(""),
    )
    .digest("base64");
  return new Request(url, {
    method: "POST",
    headers: { "x-twilio-signature": bad ? "invalid" : signature },
    body: new URLSearchParams(raw),
  });
}
const sms = {
  AccountSid: "ACsynthetic",
  MessageSid: "SMqa1",
  From: "+15555550123",
  To: "+15555550999",
  Body: "Can you help me?",
};
test("shared-number SMS is quarantined, deduplicated and transport-held without querying tenant contacts", () =>
  env(async () => {
    const f = setup();
    process.env.TWILIO_FROM_NUMBER = sms.To;
    const route = f.load("app/api/webhooks/twilio/sms/route");
    assert.equal((await route.POST(request(sms))).status, 200);
    assert.equal((await route.POST(request(sms))).status, 200);
    assert.equal(f.ingested.length, 0);
    assert.equal(
      f.calls.some((c) => c.table === "contacts"),
      false,
    );
    assert.equal(
      f.tables.audit_logs.filter((r) => r.action === "TWILIO_UNATTRIBUTED")
        .length,
      1,
    );
    assert.equal(
      f.tables.audit_logs.filter((r) => r.action === "TWILIO_SHARED_REPLY_HOLD")
        .length,
      1,
    );
    const safety = f.load("lib/communications/safety");
    assert.equal(await safety.sharedReplyHeld(sms.To, sms.From), true);
    assert.equal(await safety.sharedReplyHeld(sms.To, "+15555550124"), false);
    assert.ok(
      f.tables.audit_logs.every((r) => r.owner_id === safety.ROUTING_OWNER),
    );
  }));
test("STOP and START never silently release a shared-number hold or change any subscriber contact", () =>
  env(async () => {
    const f = setup();
    process.env.TWILIO_FROM_NUMBER = sms.To;
    const route = f.load("app/api/webhooks/twilio/sms/route");
    await route.POST(request({ ...sms, Body: "STOP" }));
    await route.POST(request({ ...sms, MessageSid: "SMqa2", Body: "START" }));
    assert.equal(f.ingested.length, 0);
    assert.equal(
      await f
        .load("lib/communications/safety")
        .sharedReplyHeld(sms.To, sms.From),
      true,
    );
    assert.equal(f.tables.contacts[0].dnc, undefined);
  }));
test("invalid signatures and account mismatches cannot create routing holds", () =>
  env(async () => {
    const f = setup(),
      route = f.load("app/api/webhooks/twilio/sms/route");
    assert.equal((await route.POST(request(sms, "sms", true))).status, 403);
    assert.equal(
      (await route.POST(request({ ...sms, AccountSid: "ACforeign" }))).status,
      403,
    );
    assert.equal(f.tables.audit_logs.length, 0);
    assert.equal(f.ingested.length, 0);
  }));
test("dedicated number routing uses only receiver-owned contacts despite cross-account duplicate phones", () =>
  env(async () => {
    const f = setup();
    await f.load("app/api/webhooks/twilio/sms/route").POST(request(sms));
    assert.equal(f.ingested[0].p_owner, owner);
    assert.equal(f.ingested[0].p_contact, id(1));
    assert.equal(f.ingested[0].p_classification, "Question");
    assert.ok(
      f.calls.some(
        (c) =>
          c.table === "contacts" &&
          c.filter === "owner_id" &&
          c.value === owner,
      ),
    );
    f.tables.contacts.push({ id: id(3), owner_id: owner, phone: sms.From });
    await f
      .load("app/api/webhooks/twilio/sms/route")
      .POST(request({ ...sms, MessageSid: "SMqa2" }));
    assert.equal(f.ingested[1].p_contact, null);
  }));
test("unknown receiving number is privately retained without guessing subscriber ownership", () =>
  env(async () => {
    const f = setup();
    f.tables.subscriber_phone_numbers = [];
    const r = await f
      .load("app/api/webhooks/twilio/sms/route")
      .POST(request(sms));
    assert.equal(r.status, 200);
    assert.equal(f.ingested.length, 0);
    assert.equal(f.tables.audit_logs[0].owner_id, "system:twilio-unattributed");
  }));
test("call completion alone does not prove an answer; explicit connected and human AMD evidence remain distinct", () => {
  const { summarizeCall } = setup().load("lib/communications/safety");
  const base = {
    sid: "CA1",
    parentSid: null,
    status: "completed",
    duration: 20,
    answeredBy: null,
  };
  assert.equal(summarizeCall([base]).connected, false);
  assert.equal(summarizeCall([base]).humanAnswered, false);
  assert.equal(summarizeCall([base]).missed, false);
  assert.equal(
    summarizeCall([{ ...base, status: "in-progress" }, base]).connected,
    true,
  );
  assert.equal(
    summarizeCall([{ ...base, status: "in-progress" }, base]).humanAnswered,
    false,
  );
  assert.equal(
    summarizeCall([{ ...base, answeredBy: "human" }]).humanAnswered,
    true,
  );
  assert.equal(
    summarizeCall([{ ...base, status: "no-answer", duration: 0 }]).missed,
    true,
  );
  const forwarding = summarizeCall([
    { ...base, status: "in-progress" },
    { ...base, sid: "CA2", parentSid: "CA1", status: "no-answer" },
  ]);
  assert.equal(forwarding.forwardingMissed, true);
});
test("signed call-leg callbacks persist timestamps and duration, do not replace forwarding TwiML, and deduplicate", () =>
  env(async () => {
    const f = setup(),
      route = f.load("app/api/webhooks/twilio/calls/route");
    const call = {
      AccountSid: "ACsynthetic",
      CallSid: "CAparent",
      From: sms.From,
      To: sms.To,
      Direction: "inbound",
      CallStatus: "in-progress",
      Timestamp: "Fri, 23 Oct 2026 14:00:00 +0000",
    };
    assert.equal((await route.POST(request(call, "call"))).status, 204);
    await route.POST(request(call, "call"));
    assert.equal(
      f.tables.audit_logs.filter((r) => r.action === "TWILIO_CALL_EVENT")
        .length,
      1,
    );
    const child = {
      ...call,
      CallSid: "CAchild",
      ParentCallSid: "CAparent",
      To: "+15555550199",
      Direction: "outbound-dial",
      CallStatus: "completed",
      CallDuration: "22",
    };
    assert.equal((await route.POST(request(child, "call"))).status, 204);
    assert.equal(f.ingested.length, 2);
    const row = f.tables.audit_logs.find((r) => r.metadata.sid === "CAchild");
    assert.equal(row.owner_id, owner);
    assert.equal(row.metadata.duration, 22);
    assert.equal(row.metadata.parentSid, "CAparent");
    assert.equal(row.metadata.occurredAt, "2026-10-23T14:00:00.000Z");
  }));
test("unrouted forwarded legs and shared calls remain private rather than creating subscriber alerts", () =>
  env(async () => {
    const f = setup(),
      route = f.load("app/api/webhooks/twilio/calls/route");
    const call = {
      AccountSid: "ACsynthetic",
      CallSid: "CAchild",
      ParentCallSid: "CAunknown",
      From: sms.From,
      To: "+15555550199",
      CallStatus: "no-answer",
    };
    assert.equal((await route.POST(request(call, "call"))).status, 204);
    assert.equal(f.ingested.length, 0);
    assert.equal(f.tables.audit_logs[0].action, "TWILIO_UNATTRIBUTED");
    process.env.TWILIO_FROM_NUMBER = sms.To;
    await route.POST(
      request({ ...call, CallSid: "CAshared", To: sms.To }, "call"),
    );
    assert.equal(f.ingested.length, 0);
  }));
test("shared routing holds are enforced again at the last live SMS authorization boundary", () =>
  env(async () => {
    const f = setup();
    f.stubs["@/lib/billing/live-outbound"] = {
      isLiveOutboundAllowed: () => true,
    };
    await f
      .load("lib/communications/safety")
      .quarantineInbound(sms, "sms", "Synthetic ambiguity");
    const issues = await f
      .load("lib/providers/send-authorization")
      .authorizeLiveOutbound({
        ownerId: owner,
        contactId: id(1),
        channel: "sms",
        to: sms.From,
        from: sms.To,
        campaignId: id(60),
        recipientId: id(61),
      });
    assert.ok(issues.some((s) => s.includes("routing review")));
    assert.equal(f.payloads.length, 0);
  }));
test("private routing payloads never become subscriber activity entries", () => {
  const map = setup().load("lib/activity/map-audit").mapAuditRow;
  for (const action of ["TWILIO_UNATTRIBUTED", "TWILIO_SHARED_REPLY_HOLD"])
    assert.equal(
      map({
        id: id(1),
        action,
        entity_type: "twilio_routing_private",
        metadata: { body: "Private reply" },
        created_at: new Date().toISOString(),
      }),
      null,
    );
});
test("unexpected storage failures return a retryable response without internal details", () =>
  env(async () => {
    const f = setup();
    f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async () => {
      throw Error("private-storage-token");
    };
    const r = await f
      .load("app/api/webhooks/twilio/sms/route")
      .POST(request(sms));
    assert.equal(r.status, 503);
    assert.equal((await r.text()).includes("private-storage-token"), false);
  }));
