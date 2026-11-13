const assert = require("node:assert/strict"),
  { randomBytes, createHmac } = require("node:crypto");
const { fixture } = require("./campaign-audit/harness.cjs");
(async () => {
  let checks = 0;
  const ok = (v) => {
    assert(v);
    checks++;
  };
  const rejects = async (fn) => {
    let failed = false;
    try {
      await fn();
    } catch {
      failed = true;
    }
    ok(failed);
  };
  const f = fixture(),
    db = f.stubs["@/lib/supabaseAdmin"].supabaseAdmin;
  const owner = f.owner,
    account = "AC" + "a".repeat(32),
    otherAccount = "AC" + "b".repeat(32),
    key = randomBytes(32);
  process.env.TWILIO_ISV_TOKEN_KEYRING = JSON.stringify({
    test: key.toString("base64"),
  });
  process.env.TWILIO_ISV_TOKEN_ACTIVE_KEY_ID = "test";
  process.env.MANAGED_SMS_PILOT_ENABLED = "true";
  process.env.ALLOW_LIVE_OUTBOUND = "true";
  const crypto = f.load("lib/messaging/isv/credentials.ts");
  const assignment = {
    id: f.id(50),
    owner_id: owner,
    business_id: f.id(51),
    account_sid: account,
    from_number: "+14075550199",
    messaging_service_sid: "MG" + "c".repeat(32),
    active: true,
  };
  f.tables.isv_sms_assignments = [assignment];
  f.tables.isv_provider_credentials = [
    {
      owner_id: owner,
      account_sid: account,
      envelope: crypto.sealCredential(
        "synthetic-token",
        { owner, accountSid: account },
        "test",
        key,
      ),
      revision: 1,
    },
  ];
  f.tables.isv_sms_dispatches = [];
  let claimed = 0,
    received = 0,
    rotateCalls = 0;
  db.rpc = async (name, p) => {
    if (name === "isv_claim_sms") {
      claimed++;
      return { data: claimed === 1, error: null };
    }
    if (name === "isv_receive_sms") {
      received++;
      ok(p.p_owner === owner && p.p_assignment === assignment.id);
      return { data: true, error: null };
    }
    if (name === "isv_rotate_credential") {
      rotateCalls++;
      ok(p.p_owner === owner && p.p_account === account && p.p_revision === 1);
      return { data: true, error: null };
    }
    return { error: { message: "unsupported" } };
  };
  const service = f.load("lib/messaging/isv/service.ts");
  ok((await service.resolveCredential(owner, account)) === "synthetic-token");
  await rejects(() => service.resolveCredential("other", account));
  await rejects(() => service.resolveCredential(owner, otherAccount));
  ok(await service.rotateCredential(owner, account));
  ok(rotateCalls === 1);
  const originalRing = process.env.TWILIO_ISV_TOKEN_KEYRING;
  process.env.TWILIO_ISV_TOKEN_KEYRING = "{}";
  await rejects(() => service.resolveCredential(owner, account));
  process.env.TWILIO_ISV_TOKEN_KEYRING = originalRing;
  process.env.TWILIO_ISV_TOKEN_KEYRING = JSON.stringify({ test: "not-a-key" });
  await rejects(() => service.resolveCredential(owner, account));
  process.env.TWILIO_ISV_TOKEN_KEYRING = originalRing;
  const req = {
    ownerId: owner,
    contactId: f.contact.id,
    channel: "sms",
    to: "+15555550123",
    body: "Synthetic only",
    campaignId: f.id(1),
    recipientId: f.id(4),
    idempotencyKey: "synthetic-operation",
  };
  await rejects(() => service.prepareSms({ ...req, from: "+14075550999" }));
  ok(claimed === 0);
  process.env.ALLOW_LIVE_OUTBOUND = "false";
  await rejects(() => service.prepareSms(req));
  ok(claimed === 0);
  process.env.ALLOW_LIVE_OUTBOUND = "true";
  ok((await service.prepareSms(req)).assignment.account_sid === account);
  await rejects(() => service.prepareSms(req));
  const hook = f.load("lib/messaging/isv/webhook.ts"),
    url = "https://preview.example.test/api/webhooks/twilio/sms";
  process.env.APP_BASE_URL = "https://preview.example.test";
  const fields = {
    AccountSid: account,
    MessageSid: "SM" + "d".repeat(32),
    From: "+15555550123",
    To: assignment.from_number,
    Body: "STOP",
  };
  const signature = (raw, token = "synthetic-token") =>
    createHmac("sha1", token)
      .update(
        url +
          Object.keys(raw)
            .sort()
            .map((k) => k + raw[k])
            .join(""),
      )
      .digest("base64");
  const request = (raw, sig = signature(raw)) =>
    new Request(url, {
      method: "POST",
      body: new URLSearchParams(raw),
      headers: { "x-twilio-signature": sig },
    });
  ok((await hook.managedSmsWebhook(request(fields, "invalid"))).status === 403);
  ok(received === 0);
  ok(
    (
      await hook.managedSmsWebhook(
        request({ ...fields, AccountSid: otherAccount }),
      )
    ).status === 403,
  );
  ok(received === 0);
  ok((await hook.managedSmsWebhook(request(fields))).status === 200);
  ok(received === 1);
  ok(
    (await hook.managedSmsWebhook(request({ ...fields, Body: "HELP" })))
      .status === 200,
  );
  ok(received === 2);
  ok(
    (
      await hook.managedSmsWebhook(
        new Request(url, {
          method: "POST",
          body:
            new URLSearchParams(fields).toString() + "&AccountSid=duplicate",
        }),
      )
    ).status === 400,
  );
  ok(
    (
      await hook.managedSmsWebhook(
        request({ ...fields, MessageSid: "invalid" }),
      )
    ).status === 400,
  );
  // Real provider-read verifier, mocked responses only; no provisioning endpoints.
  const verification = f.load("lib/messaging/isv/verify-assignment.ts");
  Object.assign(assignment, {
    brand_sid: "BN" + "1".repeat(32),
    campaign_sid: "QE" + "2".repeat(32),
    phone_sid: "PN" + "3".repeat(32),
  });
  f.tables.isv_sending_businesses = [
    {
      owner_id: owner,
      id: assignment.business_id,
      verified_at: new Date().toISOString(),
      customer_profile_sid: "BU" + "4".repeat(32),
    },
  ];
  const priorFetch = global.fetch;
  let providerMismatch = false,
    providerReads = 0;
  try {
    global.fetch = async (url, options) => {
      ok(options.method === "GET");
      providerReads++;
      const common = { account_sid: providerMismatch ? otherAccount : account };
      const body = url.includes("BrandRegistrations")
        ? {
            ...common,
            sid: assignment.brand_sid,
            status: "APPROVED",
            customer_profile_bundle_sid: "BU" + "4".repeat(32),
            mock: false,
          }
        : url.includes("Usa2p")
          ? {
              ...common,
              sid: assignment.campaign_sid,
              brand_registration_sid: assignment.brand_sid,
              messaging_service_sid: assignment.messaging_service_sid,
              campaign_status: "VERIFIED",
            }
          : {
              ...common,
              sid: assignment.phone_sid,
              service_sid: assignment.messaging_service_sid,
              phone_number: assignment.from_number,
              country_code: "US",
              capabilities: ["SMS"],
            };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    ok((await verification.refreshSenderVerification(owner)).approved === true);
    ok(assignment.messaging_enabled === false);
    ok(assignment.verification_source === "twilio_api");
    providerMismatch = true;
    ok(
      (await verification.refreshSenderVerification(owner)).approved === false,
    );
    ok(assignment.registration_status === "pending");
    ok(providerReads === 6);
    global.fetch = async () => {
      throw Error("synthetic provider outage");
    };
    await rejects(() => verification.refreshSenderVerification(owner));
    ok(assignment.messaging_enabled === false);
  } finally {
    global.fetch = priorFetch;
  }
  Object.assign(assignment,{registration_status:"approved",verification_source:"unverified",verified_at:new Date().toISOString(),number_associated:true,provider_evidence_reference:"synthetic",messaging_enabled:true});
  ok((await service.registrationSnapshot(owner,true)).state==="pending");
  assignment.verification_source="twilio_api";
  ok((await service.registrationSnapshot(owner,false)).state!=="enabled");
  ok((await service.registrationSnapshot(owner,true)).state==="enabled");
  // Actual adapter; gate/service boundaries mocked, real provider fetch replaced, never network.
  const t = fixture();
  t.stubs["./send-authorization"] = { authorizeLiveOutbound: async () => [] };
  t.stubs["@/lib/messaging/isv/service"] = {
    prepareSms: async () => ({
      assignment,
      token: "synthetic-token",
      to: req.to,
      operation: "test",
    }),
    finishSms: async (...args) => outcomes.push(args),
  };
  let payloads = [],
    outcomes = [];
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url, options) => {
      payloads.push({ url, options });
      return new Response(JSON.stringify({ sid: "SM" + "e".repeat(32) }), {
        status: 201,
      });
    };
    const adapter = t.load("lib/providers/twilio.ts").twilioProvider;
    let result = await adapter.send(req);
    ok(result.ok);
    ok(payloads.length === 1);
    ok(payloads[0].url.includes(account));
    ok(
      new URLSearchParams(payloads[0].options.body).get("From") ===
        assignment.from_number,
    );
    ok(
      new URLSearchParams(payloads[0].options.body).get(
        "MessagingServiceSid",
      ) === assignment.messaging_service_sid,
    );
    ok(outcomes[0][2] === "sent");
    global.fetch = async () => {
      throw Error("synthetic network error");
    };
    result = await adapter.send(req);
    ok(!result.ok && result.uncertain);
    ok(outcomes.at(-1)[2] === "unknown");
    t.stubs["./send-authorization"].authorizeLiveOutbound = async () => [
      "Paused",
    ];
    ok((await adapter.send(req)).status === "blocked");
  } finally {
    global.fetch = originalFetch;
    delete process.env.TWILIO_ISV_TOKEN_KEYRING;
    delete process.env.TWILIO_ISV_TOKEN_ACTIVE_KEY_ID;
    process.env.ALLOW_LIVE_OUTBOUND = "false";
    process.env.MANAGED_SMS_PILOT_ENABLED = "false";
  }
  console.log(
    JSON.stringify({
      result: "PASS",
      checks,
      scope:
        "Real service, crypto, webhook and adapter code; synthetic DB/RPC boundaries and mocked Twilio fetch; no carrier calls.",
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
