/* Public overview tests. Provider is mocked; no email, CRM, account or billing writes. */
const assert = require("node:assert/strict");
const { fixture } = require("./campaign-audit/harness.cjs");
(async () => {
  const f = fixture();
  const route = f.load("app/api/marketing/overview/route.ts");
  const { overviewContext, overviewReturnPath } = f.load(
    "lib/marketing/overview-context.ts",
  );
  process.env.AUTH_OVERVIEW_EMAIL_ENABLED = "true";
  process.env.RESEND_API_KEY = "synthetic-key";
  process.env.RESEND_FROM_EMAIL = "test@example.test";
  const base = {
    email: "Agent@example.test",
    updatesConsent: false,
    website: "",
    requestId: "00000000-0000-4000-8000-000000000001",
    context: { plan: "growth", billing: "yearly", utm_source: "referral" },
  };
  const req = (body = {}, origin = "https://local.test") =>
    new Request("https://local.test/api/marketing/overview", {
      method: "POST",
      headers: origin ? { origin } : {},
      body: JSON.stringify({ ...base, ...body }),
    });
  let calls = [],
    mode = "ok";
  global.fetch = async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    calls.push({
      body: JSON.parse(options.body),
      key: options.headers["Idempotency-Key"],
    });
    if (mode === "timeout")
      throw Error("private provider details synthetic-key");
    const fail =
      mode === "capture-fail" ||
      (mode === "delivery-fail" && calls.length === 2);
    return new Response(
      JSON.stringify(
        mode === "empty"
          ? {}
          : fail
            ? { error: "private provider detail" }
            : { id: "receipt" },
      ),
      { status: fail ? 500 : 200 },
    );
  };
  for (const body of [
    { email: "invalid" },
    { website: "bot" },
    { updatesConsent: "true" },
    { context: { owner_id: "forged" } },
    { context: { redirect_url: "https://evil.test" } },
  ]) {
    assert.equal((await route.POST(req(body))).status, 400);
  }
  assert.equal((await route.POST(req({}, "https://evil.test"))).status, 403);
  assert.equal((await route.POST(req({}, null))).status, 403);
  assert.equal(
    (await route.POST(req({ website: "x".repeat(5000) }))).status,
    413,
  );
  assert.equal(calls.length, 0);
  delete process.env.AUTH_OVERVIEW_EMAIL_ENABLED;
  assert.equal((await route.POST(req())).status, 503);
  process.env.AUTH_OVERVIEW_EMAIL_ENABLED = "true";
  delete process.env.RESEND_API_KEY;
  assert.equal((await route.POST(req())).status, 503);
  process.env.RESEND_API_KEY = "synthetic-key";
  assert.equal(calls.length, 0);
  process.env.VERCEL_ENV = "preview";
  assert.equal((await route.POST(req())).status, 503);
  assert.equal(
    calls.length,
    0,
    "Preview must never send overview emails using inherited credentials",
  );
  delete process.env.VERCEL_ENV;
  for (mode of ["capture-fail", "delivery-fail", "empty", "timeout"]) {
    calls = [];
    const response = await route.POST(req());
    assert.equal(response.status, 502);
    const payload = await response.json();
    assert.equal(
      payload.code,
      mode === "delivery-fail"
        ? "overview_delivery_unconfirmed"
        : "overview_capture_unconfirmed",
    );
    assert.doesNotMatch(
      JSON.stringify(payload),
      /Agent@|synthetic-key|private provider|receipt/,
    );
    assert.equal(calls.length, mode === "delivery-fail" ? 2 : 1);
  }
  mode = "ok";
  calls = [];
  assert.equal((await route.POST(req())).status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0].body.text, /Optional product updates consent: NO/);
  assert.equal(calls[0].body.reply_to, "agent@example.test");
  assert.deepEqual(calls[1].body.to, ["agent@example.test"]);
  assert.match(calls[1].body.text, /did not create an account, start a trial/);
  assert.match(
    calls[1].body.text,
    /plan=growth&billing=yearly&utm_source=referral/,
  );
  const firstKeys = calls.map((c) => c.key);
  calls = [];
  assert.equal(
    (
      await route.POST(
        req({
          requestId: "00000000-0000-4000-8000-000000000002",
          email: "agent@example.test",
        }),
      )
    ).status,
    200,
  );
  assert.deepEqual(
    calls.map((c) => c.key),
    firstKeys,
    "same normalized request uses provider-window deduplication, even across new client UUIDs",
  );
  calls = [];
  assert.equal((await route.POST(req({ updatesConsent: true }))).status, 200);
  assert.match(calls[0].body.text, /Optional product updates consent: YES/);
  assert.notEqual(
    calls[0].key,
    firstKeys[0],
    "changed consent must retain its own accurate capture",
  );
  assert.deepEqual(
    overviewContext(
      "?plan=pro&billing=yearly&session_id=private&redirect_url=https://evil.test&email=person@example.test&ref=partner-one",
    ),
    { plan: "pro", billing: "yearly", ref: "partner-one" },
  );
  assert.equal(
    overviewReturnPath({ plan: "starter", utm_source: "word of mouth" }),
    "/sign-up?plan=starter&utm_source=word+of+mouth",
  );
  assert.deepEqual(await route.GET().json(), {
    success: true,
    available: true,
  });
  delete process.env.AUTH_OVERVIEW_EMAIL_ENABLED;
  assert.deepEqual(await route.GET().json(), {
    success: true,
    available: false,
  });
  assert.equal(route.GET().headers.get("Cache-Control"), "no-store");
  console.log(
    "Auth overview: strict input/origin/size/honeypot checks, default-off delivery, capture-before-send, consent versions, provider-window deduplication, private error recovery and safe plan/referral return links passed. Provider mocked; no real emails, accounts, trials or CRM writes.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
