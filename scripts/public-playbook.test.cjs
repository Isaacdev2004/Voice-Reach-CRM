/* Mocked provider only: no real leads or communications. */
const assert = require("node:assert/strict");
const { fixture } = require("./campaign-audit/harness.cjs");
(async () => {
  process.env.RESEND_API_KEY = "synthetic-key";
  process.env.RESEND_FROM_EMAIL = "qa@example.test";
  const route = fixture().load("app/api/marketing/playbook/route.ts");
  let calls = [],
    mode = "success";
  global.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    if (mode === "timeout") throw Error("private details");
    const failed =
      mode === "capture-fail" ||
      (mode === "delivery-fail" && calls.length === 2);
    return new Response(
      JSON.stringify(
        failed
          ? { error: "private provider detail" }
          : mode === "empty"
            ? {}
            : { id: "mock-receipt" },
      ),
      { status: failed ? 500 : 200 },
    );
  };
  const req = (overrides = {}) =>
    new Request("https://local.test/api/marketing/playbook", {
      method: "POST",
      body: JSON.stringify({
        name: "Synthetic Agent",
        email: "agent@example.test",
        requestId: "00000000-0000-4000-8000-000000000001",
        ...overrides,
      }),
    });
  assert.equal((await route.POST(req({ email: "invalid" }))).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await route.POST(req({ name: "   " }))).status, 400);
  for (mode of ["capture-fail", "timeout", "empty", "delivery-fail"]) {
    calls = [];
    const response = await route.POST(req());
    assert.equal(response.status, 502);
    assert.doesNotMatch(
      await response.text(),
      /private|downloadUrl|base64|synthetic-key/,
    );
    assert.equal(calls.length, mode === "delivery-fail" ? 2 : 1);
  }
  calls = [];
  mode = "success";
  const response = await route.POST(req());
  assert.deepEqual(await response.json(), {
    success: true,
    ok: true,
    delivery: "accepted",
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].attachments, undefined);
  assert.equal(calls[0].reply_to, "agent@example.test");
  assert.deepEqual(calls[1].to, ["agent@example.test"]);
  assert.equal(
    Buffer.from(calls[1].attachments[0].content, "base64")
      .subarray(0, 5)
      .toString(),
    "%PDF-",
  );
  delete process.env.RESEND_API_KEY;
  calls = [];
  assert.equal((await route.POST(req())).status, 503);
  assert.equal(calls.length, 0);
  assert.equal(route.GET, undefined);
  console.log(
    "Gated playbook: validation, capture-before-delivery, private PDF attachment, provider failures, empty receipt, timeout and missing configuration passed. No real emails sent.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
