/* Synthetic request bodies and mocked Resend only. No real mail is sent. */
const assert = require("node:assert/strict");
const { fixture } = require("./campaign-audit/harness.cjs");
(async () => {
  process.env.RESEND_API_KEY = "synthetic-not-a-real-key";
  process.env.RESEND_FROM_EMAIL = "qa@example.test";
  let mode = "failed",
    calls = 0;
  global.fetch = async () => {
    calls++;
    if (mode === "timeout") throw Error("private provider timeout trace");
    return new Response(
      mode === "success" ? "{}" : "sensitive provider payload",
      { status: mode === "success" ? 200 : 401 },
    );
  };
  const route = fixture().load("app/api/contact/route.ts");
  const req = (overrides = {}) =>
    new Request("http://local.test/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Synthetic Agent",
        email: "agent@example.test",
        subject: "Test only",
        message: "Do not send",
        ...overrides,
      }),
    });
  for (mode of ["failed", "timeout"]) {
    const response = await route.POST(req());
    assert.equal(response.status, 502);
    const text = await response.text();
    assert.doesNotMatch(
      text,
      /sensitive provider|private provider|synthetic-not/,
    );
  }
  mode = "success";
  assert.equal((await route.POST(req())).status, 200);
  const before = calls;
  assert.equal((await route.POST(req({ email: "invalid" }))).status, 400);
  assert.equal(calls, before);
  delete process.env.RESEND_API_KEY;
  assert.equal((await route.POST(req())).status, 503);
  assert.equal(calls, before);
  console.log(
    "Contact delivery: confirmed success, provider failure, timeout, validation, missing configuration and safe error messages passed. All provider requests mocked.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
