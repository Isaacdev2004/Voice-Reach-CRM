const test = require("node:test"),
  assert = require("node:assert/strict");
const { setup, id, owner } = require("./assistant-messaging/fixture.cjs");
for (const channel of ["sms", "email"])
  test(`${channel}: actual separate Send endpoint submits one preview-bound recipient and body, never confirmed delivery`, async () => {
    const s = setup();
    try {
      const p = await s.preview(channel);
      assert.equal(p.executable, true);
      assert.equal(s.transmissions.length, 0);
      const bad = await s.approve(p, { confirmation: "CONFIRM_SAVE" });
      assert.equal(bad.status, 400);
      assert.equal(s.transmissions.length, 0);
      const response = await s.approve(p);
      assert.equal(response.status, 200);
      const { outcome } = await response.json();
      assert.equal(outcome.state, "completed");
      assert.match(outcome.result.message, /not yet confirmed/);
      assert.equal(s.transmissions.length, 1);
      const sent = s.transmissions[0].body;
      assert.equal(
        channel === "sms" ? sent.To : sent.to[0],
        p.preview.recipient,
      );
      assert.equal(channel === "sms" ? sent.Body : sent.text, p.preview.body);
      assert.equal(
        s.f.tables.outbound_messages[0].submission_status,
        "accepted",
      );
      assert.equal(
        s.f.tables.outbound_delivery_events.some(
          (e) => e.event_type === "delivered",
        ),
        false,
      );
      if (channel === "email") {
        assert.equal(sent.subject, p.preview.subject);
        assert.equal(sent.to.length, 1);
      }
      await s.approve(p);
      assert.equal(s.transmissions.length, 1);
    } finally {
      s.restore();
    }
  });
for (const variant of [
  "expired",
  "digest",
  "body",
  "contact-number",
  "contact-email",
  "contact-owner",
  "campaign-owner",
  "recipient-owner",
  "recipient-contact",
  "recipient-campaign",
  "campaign-paused",
  "campaign-not-launched",
  "consent-revoked",
  "opt-out",
  "dnc",
  "suppression",
  "shared-hold",
  "reply-after-enrollment",
  "flag-revoked",
  "live-kill-switch",
  "quota",
  "owner-header",
  "missing-confirmation",
  "bulk-fields",
])
  test(`Send endpoint blocks ${variant} with no provider request`, async () => {
    const s = setup();
    try {
      const channel = variant === "contact-email" ? "email" : "sms",
        p = await s.preview(channel);
      let override = {};
      const row = s.f.tables.audit_logs.find(
        (r) => r.entity_id === p.id && r.entity_type === "assistant_proposal",
      );
      if (variant === "expired")
        row.metadata.expiresAt = "2000-01-01T00:00:00Z";
      if (variant === "digest") override.digest = "f".repeat(64);
      if (variant === "body")
        row.metadata.action.body = "Unapproved replacement";
      if (variant === "contact-number")
        s.f.tables.contacts[0].phone = "+15555550999";
      if (variant === "contact-email")
        s.f.tables.contacts[0].email = "other@example.test";
      if (variant === "contact-owner")
        s.f.tables.contacts[0].owner_id = "foreign";
      if (variant === "campaign-owner")
        s.f.tables.campaigns[0].owner_id = "foreign";
      if (variant === "recipient-owner")
        s.f.tables.campaign_recipients[0].owner_id = "foreign";
      if (variant === "recipient-contact")
        s.f.tables.campaign_recipients[0].contact_id = id(99);
      if (variant === "recipient-campaign")
        s.f.tables.campaign_recipients[0].campaign_id = id(99);
      if (variant === "campaign-paused")
        s.f.tables.campaigns[0].status = "paused";
      if (variant === "campaign-not-launched")
        s.f.tables.campaigns[0].live_launched = false;
      if (variant === "consent-revoked")
        s.f.tables.consent_records[0].status = "No";
      if (variant === "opt-out")
        s.f.tables.contacts[0].opt_out_requested = true;
      if (variant === "dnc") s.f.tables.contacts[0].dnc = true;
      if (variant === "suppression")
        s.f.tables.communication_suppressions.push({
          owner_id: owner,
          phone: "+15555550123",
          channel: "sms",
        });
      if (variant === "shared-hold") {
        const safety = s.f.load("lib/communications/safety.ts");
        s.f.tables.audit_logs.push({
          id: safety.routingId("hold:+15555550001:+15555550123"),
          owner_id: safety.ROUTING_OWNER,
          action: "TWILIO_SHARED_REPLY_HOLD",
        });
      }
      if (variant === "reply-after-enrollment")
        s.f.tables.engagement_events.push({
          id: id(555),
          owner_id: owner,
          contact_id: id(2),
          event_type: "replied",
          occurred_at: new Date().toISOString(),
        });
      if (variant === "flag-revoked")
        process.env.ASSISTANT_APPROVED_SENDS_ENABLED = "false";
      if (variant === "live-kill-switch")
        process.env.ALLOW_LIVE_OUTBOUND = "false";
      if (variant === "quota")
        s.f.stubs["@/lib/billing/plan-limits"].assertCanSendChannel =
          async () => ({ ok: false, error: "Synthetic quota exhausted" });
      if (variant === "missing-confirmation") override.confirmation = undefined;
      if (variant === "bulk-fields") override.recipients = [id(2), id(3)];
      let r;
      if (variant === "owner-header")
        r = await s.f.load("app/api/assistant/approve/route.ts").POST(
          new Request("http://qa/api/assistant/approve", {
            method: "POST",
            headers: { "X-MyARI-Owner": "foreign" },
            body: JSON.stringify({
              proposalId: p.id,
              digest: p.digest,
              confirmation: "CONFIRM_SEND",
            }),
          }),
        );
      else r = await s.approve(p, override);
      assert.ok(r.status >= 400, `${variant} returned ${r.status}`);
      assert.equal(s.transmissions.length, 0);
    } finally {
      s.restore();
    }
  });
test("two concurrent confirmations of the same proposal result in one durable provider submission", async () => {
  const s = setup();
  try {
    const p = await s.preview();
    const responses = await Promise.all([s.approve(p), s.approve(p)]);
    assert.equal(s.transmissions.length, 1);
    assert.ok(responses.some((r) => r.status === 200));
    assert.ok(responses.every((r) => [200, 409].includes(r.status)));
  } finally {
    s.restore();
  }
});
for (const mode of ["timeout", "outage"])
  for (const channel of ["sms", "email"])
    test(`${channel}: ${mode} creates Needs Attention and replay does not retry transport`, async () => {
      const s = setup();
      try {
        const p = await s.preview(channel);
        s.setMode(mode);
        const r = await s.approve(p);
        const d = await r.json();
        assert.equal(d.outcome.state, "needs_review");
        assert.equal(s.transmissions.length, 1);
        await s.approve(p);
        assert.equal(s.transmissions.length, 1);
        assert.equal(
          s.f.tables.outbound_messages[0].submission_status,
          mode === "timeout" ? "unknown" : "failed",
        );
        assert.equal(
          s.f.tables.audit_logs.filter(
            (r) => r.entity_type === "assistant_claim",
          ).length,
          1,
        );
      } finally {
        s.restore();
      }
    });
for (const envName of ["development", "test", "production"])
  test(`${envName}: absent/false/non-exact send flag is OFF; explicit true is required`, async () => {
    const old = process.env.NODE_ENV;
    process.env.NODE_ENV = envName;
    const s = setup();
    try {
      for (const value of [undefined, "false", "TRUE", "1", " true "]) {
        if (value === undefined)
          delete process.env.ASSISTANT_APPROVED_SENDS_ENABLED;
        else process.env.ASSISTANT_APPROVED_SENDS_ENABLED = value;
        assert.equal((await s.preview()).executable, false);
      }
      process.env.ASSISTANT_APPROVED_SENDS_ENABLED = "true";
      assert.equal((await s.preview()).executable, true);
    } finally {
      s.restore();
      if (old === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = old;
    }
  });
test("outside-campaign, forged automation IDs and bulk message actions cannot become executable", async () => {
  const s = setup();
  try {
    const raw = s.message();
    delete raw.campaignId;
    delete raw.recipientId;
    const p = await s.f
      .load("lib/assistant/proposals.ts")
      .prepareAction(owner, raw);
    assert.equal(p.executable, false);
    assert.ok((await s.approve(p)).status >= 400);
    await assert.rejects(
      s.f.load("lib/assistant/proposals.ts").prepareAction(owner, {
        ...s.message(),
        campaignId: "automation-forged",
      }),
    );
    await assert.rejects(
      s.f
        .load("lib/assistant/proposals.ts")
        .prepareAction(owner, { ...s.message(), recipients: [id(2), id(3)] }),
    );
    const names = s.f
      .load("lib/assistant/tools.ts")
      .toolDefinitions.map((t) => t.name);
    for (const n of [
      "send_sms",
      "send_email",
      "bulk_send",
      "activate_campaign",
      "publish",
      "send_invitation",
    ])
      assert.equal(names.includes(n), false);
    assert.equal(s.transmissions.length, 0);
  } finally {
    s.restore();
  }
});
test("email signed bounce/complaint callbacks update evidence/suppression; forged callbacks are rejected", async () => {
  const crypto = require("node:crypto"),
    s = setup(),
    old = process.env.RESEND_WEBHOOK_SECRET;
  process.env.RESEND_WEBHOOK_SECRET =
    "whsec_" + Buffer.from("synthetic-webhook-secret").toString("base64");
  try {
    const p = await s.preview("email");
    await s.approve(p);
    const webhook = s.f.load("lib/delivery/webhook.ts").processDeliveryWebhook;
    const callback = (type, eventId, valid = true) => {
      const body = JSON.stringify({
          type,
          created_at: new Date().toISOString(),
          data: { email_id: "EMAIL_SYNTHETIC" },
        }),
        timestamp = String(Math.floor(Date.now() / 1000)),
        signature = crypto
          .createHmac("sha256", Buffer.from("synthetic-webhook-secret"))
          .update(`${eventId}.${timestamp}.${body}`)
          .digest("base64");
      return new Request(
        "https://myari.example.test/api/webhooks/delivery/resend",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "svix-id": eventId,
            "svix-timestamp": timestamp,
            "svix-signature": valid ? "v1," + signature : "v1,invalid",
          },
          body,
        },
      );
    };
    assert.ok(
      (await webhook(callback("email.delivered", "forged", false), "resend"))
        .status >= 400,
    );
    assert.equal(
      s.f.tables.outbound_delivery_events.some(
        (e) => e.event_type === "delivered",
      ),
      false,
    );
    await webhook(callback("email.bounced", "bounce"), "resend");
    assert.equal(
      s.f.tables.outbound_delivery_events.some(
        (e) => e.event_type === "bounced",
      ),
      true,
    );
    await webhook(callback("email.complained", "complaint"), "resend");
    assert.equal(s.f.tables.contacts[0].dnc, true);
    assert.equal(s.f.tables.contacts[0].opt_out_requested, true);
    assert.equal(s.transmissions.length, 1);
  } finally {
    s.restore();
    if (old === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = old;
  }
});
test("SMS signed undelivered/delivered callbacks correlate by provider ID, reject forgery and deduplicate", async () => {
  const crypto = require("node:crypto"),
    s = setup();
  try {
    const p = await s.preview();
    await s.approve(p);
    const webhook = s.f.load("lib/delivery/webhook.ts").processDeliveryWebhook;
    const request = (status, valid = true) => {
      const url = "https://myari.example.test/api/webhooks/delivery/twilio",
        fields = {
          MessageSid: "SM_SYNTHETIC",
          MessageStatus: status,
          AccountSid: "AC_SYNTHETIC_NEVER_LIVE",
        };
      const signed =
        url +
        Object.keys(fields)
          .sort()
          .map((k) => k + fields[k])
          .join("");
      const signature = crypto
        .createHmac("sha1", process.env.TWILIO_AUTH_TOKEN)
        .update(signed)
        .digest("base64");
      return new Request(url, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-twilio-signature": valid ? signature : "forged",
        },
        body: new URLSearchParams(fields),
      });
    };
    assert.equal(
      (await webhook(request("delivered", false), "twilio")).status,
      401,
    );
    assert.equal((await webhook(request("undelivered"), "twilio")).status, 200);
    assert.ok(
      s.f.tables.outbound_delivery_events.some(
        (e) => e.event_type === "undelivered",
      ),
    );
    await webhook(request("delivered"), "twilio");
    const n = s.f.tables.outbound_delivery_events.length;
    await webhook(request("delivered"), "twilio");
    assert.equal(s.f.tables.outbound_delivery_events.length, n);
    assert.equal(s.transmissions.length, 1);
  } finally {
    s.restore();
  }
});
test("evidence-write preflight failure blocks provider transport", async () => {
  const s = setup();
  try {
    const p = await s.preview();
    s.f.fail("outbound_delivery_events");
    const d = await (await s.approve(p)).json();
    assert.equal(d.outcome.state, "needs_review");
    assert.equal(s.transmissions.length, 0);
  } finally {
    s.restore();
  }
});
test("an unknown submission blocks a fresh root until provider reconciliation", async () => {
  const s = setup();
  try {
    const p = await s.preview();
    s.setMode("timeout");
    await s.approve(p);
    s.setMode("success");
    const next = await s.preview();
    assert.equal(next.executable, false);
    assert.equal(s.transmissions.length, 1);
  } finally {
    s.restore();
  }
});
test("preview binds the same canonical destination that the provider transport uses", async () => {
  for (const channel of ["sms", "email"]) {
    const s = setup();
    try {
      const c = s.f.tables.contacts[0];
      if (channel === "sms") c.phone = "  +15555550123  ";
      else c.email = "  jordan@example.test  ";
      const p = await s.preview(channel);
      assert.equal(p.executable, true);
      await s.approve(p);
      assert.equal(s.transmissions.length, 1);
      assert.equal(
        channel === "sms"
          ? s.transmissions[0].body.To
          : s.transmissions[0].body.to[0],
        p.preview.recipient,
      );
    } finally {
      s.restore();
    }
  }
});
test("an opt-out arriving during the evidence preflight is rechecked before transport", async () => {
  const s = setup();
  try {
    const p = await s.preview();
    const db = s.f.stubs["@/lib/supabaseAdmin"].supabaseAdmin,
      from = db.from.bind(db);
    db.from = (table) => {
      const q = from(table);
      if (table === "outbound_delivery_events") {
        const insert = q.insert.bind(q);
        q.insert = (value) => {
          s.f.tables.contacts[0].opt_out_requested = true;
          return insert(value);
        };
      }
      return q;
    };
    await s.approve(p);
    assert.equal(s.transmissions.length, 0);
    assert.equal(s.f.tables.outbound_messages[0].submission_status, "failed");
  } finally {
    s.restore();
  }
});
test("malformed successful provider references remain unknown instead of completed", async () => {
  for (const channel of ["sms", "email"]) {
    const s = setup();
    try {
      const p = await s.preview(channel);
      s.setMode("invalid-reference");
      const d = await (await s.approve(p)).json();
      assert.equal(d.outcome.state, "needs_review");
      assert.equal(
        s.f.tables.outbound_messages[0].submission_status,
        "unknown",
      );
    } finally {
      s.restore();
    }
  }
});
