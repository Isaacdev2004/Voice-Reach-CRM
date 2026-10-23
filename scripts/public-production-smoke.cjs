/* Read-only local production-build crawl. No provider requests or production records. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  net = require("node:net"),
  { spawn } = require("node:child_process");
const { fixture } = require("./campaign-audit/harness.cjs");
(async () => {
  const paths = fixture().load("lib/seo/indexable-paths.ts").INDEXABLE_PATHS;
  const reserve = net.createServer();
  await new Promise((r) => reserve.listen(0, "127.0.0.1", r));
  const port = reserve.address().port;
  await new Promise((r) => reserve.close(r));
  const child = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
        CLERK_SECRET_KEY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const results = [];
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/`, {
          signal: AbortSignal.timeout(1000),
        });
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(ready, "Local production server did not start");
    for (const route of paths) {
      const response = await fetch(`http://127.0.0.1:${port}${route}`, {
        signal: AbortSignal.timeout(15000),
      });
      const html = await response.text();
      assert.equal(response.status, 200, route);
      assert.equal(
        (html.match(/<h1(?:\s|>)/g) || []).length,
        1,
        `Single H1: ${route}`,
      );
      assert.ok(/rel="canonical"/.test(html), `Canonical: ${route}`);
      results.push({ route, status: response.status, h1: 1, canonical: true });
    }
    for (const route of ["/sitemap.xml", "/robots.txt"])
      assert.equal(
        (await fetch(`http://127.0.0.1:${port}${route}`)).status,
        200,
      );
    for (const [route, status] of [
      ["/resources/myari-agent-follow-up-playbook.pdf", 404],
      ["/api/marketing/playbook", 405],
    ]) {
      assert.equal(
        (await fetch(`http://127.0.0.1:${port}${route}`)).status,
        status,
        `Private playbook must not be publicly downloadable: ${route}`,
      );
    }
    const trace = JSON.parse(
      fs.readFileSync(
        ".next/server/app/api/marketing/playbook/route.js.nft.json",
        "utf8",
      ),
    );
    assert.ok(
      trace.files.some((file) =>
        file.endsWith("/resources/myari-agent-follow-up-playbook.pdf"),
      ),
      "Private attachment must be packaged for server delivery",
    );
    fs.writeFileSync(
      "docs/public-website/production-smoke.json",
      JSON.stringify(results, null, 2),
    );
    console.log(
      `${results.length} public routes returned HTTP 200 with one H1 and a canonical link; sitemap and robots reachable in the local production build. Authentication-provider login and real contact delivery were not exercised.`,
    );
  } finally {
    child.kill("SIGTERM");
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
