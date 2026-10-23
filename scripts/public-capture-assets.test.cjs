const assert = require("node:assert/strict"),
  sharp = require("sharp");
const { fixture } = require("./campaign-audit/harness.cjs");
(async () => {
  const captures = fixture().load(
    "lib/marketing/product-captures.ts",
  ).PRODUCT_CAPTURES;
  for (const [name, capture] of Object.entries(captures)) {
    const m = await sharp("public" + capture.src).metadata();
    assert.equal(capture.width, m.width, `${name}: natural width`);
    assert.equal(capture.height, m.height, `${name}: natural height`);
  }
  assert.ok(captures.contacts.width >= 2200);
  assert.ok(captures.builder.width >= 2500);
  console.log(
    "All public product capture dimensions match source assets; Contacts and Builder have Retina resolution.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
