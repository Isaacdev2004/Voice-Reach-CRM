/* Actual proposal service + PreviewDetails, synthetic Clerk/DB boundaries, loopback browser only. */
const fs = require("node:fs"), path = require("node:path"), http = require("node:http"), assert = require("node:assert/strict");
const { setup, campaign, other, owner } = require("./assistant-personalization/fixture.cjs");
const { build } = require("esbuild"), { chromium } = require("playwright");
(async () => {
  const root = path.resolve(__dirname, ".."), out = path.join(root, "docs/assistant-workspace/personalization");
  fs.mkdirSync(out, { recursive: true });
  const { f, proposals, settings } = setup();
  const a = await proposals.prepareAction(owner, campaign()); f.actor(other);
  const b = await proposals.prepareAction(other, campaign()); f.actor(owner);
  delete settings[owner].brandKit.email;
  const missing = await proposals.prepareAction(owner, campaign());
  fs.writeFileSync(path.join(out, "synthetic-apopka.json"), JSON.stringify({ evidence: "Synthetic service fixture, not hosted authentication", a, b, missing }, null, 2) + "\n");
  const bundle = await build({ entryPoints: [path.join(__dirname, "assistant-personalization/entry.jsx")], bundle: true, write: false, jsx: "automatic", tsconfig: path.join(root, "tsconfig.json"), define: { "process.env.NODE_ENV": '"production"' } });
  const css = fs.readFileSync(path.join(root, "components/assistant/workspace.css"), "utf8");
  const server = http.createServer((req, res) => {
    if (req.url === "/app.js") { res.setHeader("content-type", "text/javascript"); return res.end(bundle.outputFiles[0].text); }
    res.setHeader("content-type", "text/html");
    res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MyARI synthetic personalization review</title><style>${css}\n*{box-sizing:border-box}body{margin:0;background:#f8f5ef;color:#40382d;font:16px Arial}main{max-width:1050px;margin:24px auto;padding:20px}h1{font:36px Georgia}nav{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}button{min-height:44px;border:1px solid #d8c4ac;border-radius:12px;background:#fffdf9;padding:10px 16px;color:#755333}.assistant-preview{padding:24px;background:#fffdf9;border:1px solid #e5d8c9;border-radius:20px}.aw-review-note{padding:16px;border:1px solid #e5d8c9;border-radius:12px;line-height:1.5}a{color:#795333}.assistant-copy{white-space:pre-wrap;overflow-wrap:anywhere}summary{cursor:pointer;min-height:44px}@media(max-width:600px){main{margin:0;padding:14px}.assistant-preview{padding:14px}h1{font-size:28px}}</style></head><body><div id="root"></div><script>window.fixture=${JSON.stringify([a, b, missing]).replace(/</g, "\\u003c")}</script><script src="/app.js"></script></body></html>`);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser; const results = [];
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    for (const [width, height] of [[1440,900],[820,1180],[390,844]]) {
      const page = await browser.newPage({ viewport: { width, height } }); const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.getByRole("region", { name: "Agent personalization" }).count();
      await page.locator("details").first().waitFor();
      await page.locator("details").first().locator("summary").click();
      assert.match(await page.locator("article").innerText(), /Avery Agent with Avery Realty/);
      assert.doesNotMatch(await page.locator("article").innerText(), /Casey/);
      assert.match(await page.locator("article").innerText(), /\{\{contact.firstName\}\}/);
      await page.getByRole("button", { name: "Subscriber B", exact: true }).click();
      assert.match(await page.locator("article").innerText(), /Casey Agent with Casey Realty/);
      assert.doesNotMatch(await page.locator("article").innerText(), /Avery/);
      await page.getByRole("button", { name: "Missing business fields", exact: true }).click();
      assert.match(await page.getByRole("status").innerText(), /business email/);
      assert.equal(await page.getByRole("link", { name: "Review Brand Kit" }).getAttribute("href"), "/dashboard/settings?tab=brand");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(out, `preview-${width}.jpg`), fullPage: true, type: "jpeg", quality: 86 });
      assert.deepEqual(errors, []); results.push({ width, height, checks: 9, passed: true }); await page.close();
    }
    assert.equal(f.payloads.length, 0); assert.equal(f.tables.campaign_recipients.length, 1);
    fs.writeFileSync(path.join(out, "browser-results.json"), JSON.stringify({ evidence: "Local synthetic browser only", results, noSendingOrEnrollment: true }, null, 2) + "\n");
    console.log(JSON.stringify({ results, noSendingOrEnrollment: true }));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
