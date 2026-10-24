const test = require("node:test"),
  assert = require("node:assert/strict");
const { setup, owner } = require("./assistant-messaging/fixture.cjs");
for (const channel of ["sms", "email"])
  test(`REQUIRED: ${channel} blocked enrollment must not remain sendable`, async () => {
    const s = setup();
    try {
      s.f.tables.campaign_recipients[0].eligibility_status = "blocked";
      const p = await s.preview(channel);
      assert.equal(
        p.executable,
        false,
        "Blocked enrollment was still executable",
      );
    } finally {
      s.restore();
    }
  });
test("REQUIRED: a simulation/mock campaign must not be sendable even with a stale launch flag", async () => {
  const s = setup();
  try {
    s.f.tables.campaigns[0].provider = "mock";
    const p = await s.preview();
    assert.equal(p.executable, false, "Simulation campaign was executable");
  } finally {
    s.restore();
  }
});
for (const channel of ["sms", "email"])
  test(`REQUIRED: ${channel} preview must bind and revalidate the actual configured sender`, async () => {
    const s = setup();
    try {
      const p = await s.preview(channel);
      if (channel === "sms") process.env.TWILIO_FROM_NUMBER = "+15555550099";
      else
        process.env.RESEND_FROM_EMAIL = "Different Sender <other@example.test>";
      const r = await s.approve(p);
      assert.ok(
        r.status >= 400,
        "Changed sender was accepted under the original preview",
      );
      assert.equal(s.transmissions.length, 0);
    } finally {
      s.restore();
    }
  });
test("REQUIRED: revised SMS and original share one execution lineage, including after an uncertain provider outcome", async () => {
  const s = setup();
  try {
    const a = await s.preview(),
      b = await s.f
        .load("lib/assistant/proposals.ts")
        .prepareAction(
          owner,
          { ...a.action, body: "Revised copy. Reply STOP to opt out." },
          { revisionOf: a.id },
        );
    s.setMode("timeout");
    await s.approve(b);
    await s.approve(a);
    assert.equal(
      s.transmissions.length,
      1,
      "Old and revised versions created separate provider attempts",
    );
  } finally {
    s.restore();
  }
});
test("REQUIRED: email provider body and subject must exactly match a nested-Subject preview", async () => {
  const s = setup();
  try {
    const p = await s.f
      .load("lib/assistant/proposals.ts")
      .prepareAction(owner, {
        ...s.message("email"),
        subject: "Fallback title",
        body: "Subject: Approved outer subject\n\nSubject: Inner body line\n\nHello Jordan, a reviewed message.",
      });
    await s.approve(p);
    assert.equal(s.transmissions[0].body.subject, p.preview.subject);
    assert.equal(s.transmissions[0].body.text, p.preview.body);
  } finally {
    s.restore();
  }
});
test("REQUIRED: an HTTP success without a provider reference must remain uncertain rather than completed", async () => {
  const s = setup();
  try {
    const p = await s.preview();
    s.setMode("missing-reference");
    const d = await (await s.approve(p)).json();
    assert.equal(s.f.tables.outbound_messages[0].submission_status, "unknown");
    assert.equal(
      d.outcome.state,
      "needs_review",
      "Missing provider reference was reported as completed",
    );
  } finally {
    s.restore();
  }
});
test("REQUIRED: evidence-write failure after provider acceptance must be surfaced as uncertain", async () => {
  const s = setup();
  try {
    const p = await s.preview();
    s.setMode("evidence-failure");
    const d = await (await s.approve(p)).json();
    assert.equal(
      d.outcome.state,
      "needs_review",
      "Registry reconciliation warning was ignored",
    );
    assert.equal(s.transmissions.length, 1);
  } finally {
    s.restore();
  }
});
for (const channel of ["sms", "email"])
  test(`REQUIRED: ${channel} removed enrollment must not remain sendable`, async () => {
    const s = setup();
    try {
      s.f.tables.campaign_recipients[0].delivery_status = "removed";
      assert.equal(
        (await s.preview(channel)).executable,
        false,
        "Removed enrollment was still executable",
      );
    } finally {
      s.restore();
    }
  });
test("REQUIRED: live assistant send needs durable delivery evidence enabled", async () => {
  const s = setup();
  try {
    process.env.DELIVERY_EVIDENCE_ENABLED = "false";
    const p = await s.preview();
    assert.equal(
      p.executable,
      false,
      "Send enabled without durable delivery evidence",
    );
  } finally {
    s.restore();
  }
});
for (const channel of ["sms", "email"])
  test(`REQUIRED: ${channel} provider POST has a bounded abort timeout`, async () => {
    const s = setup();
    try {
      const p = await s.preview(channel);
      await s.approve(p);
      assert.ok(
        s.transmissions[0].options.signal,
        "Provider request has no AbortSignal timeout",
      );
    } finally {
      s.restore();
    }
  });
