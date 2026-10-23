/* Anonymous server-rendered public audit (JS disabled to avoid external Clerk bootstrap): never submits forms or calls external providers. */
const { chromium } = require("playwright"),
  fs = require("fs"),
  path = require("path");
(async () => {
  const origin = process.env.AUDIT_ORIGIN || "http://127.0.0.1:3210",
    phase = process.env.AUDIT_PHASE || "before";
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
    throw Error("Local audit origin required");
  const dir = "/tmp/myari-platform-audit/public-" + phase;
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const rows = [];
  try {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.route("**/*", (r) => {
      const u = new URL(r.request().url());
      if (u.origin !== origin || r.request().method() !== "GET")
        return r.abort();
      return (async () => {
        const response = await fetch(r.request().url(), { redirect: "manual" });
        return r.fulfill({
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: Buffer.from(await response.arrayBuffer()),
        });
      })();
    });
    for (const pathname of JSON.parse(
      fs.readFileSync("docs/platform-audit/public-paths.json", "utf8"),
    )) {
      const response = await page.goto(origin + pathname, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      const data = await page.evaluate(() => ({
        title: document.title,
        headings: [...document.querySelectorAll("h1")].map(
          (n) => n.textContent,
        ),
        links: [...document.querySelectorAll("a[href]")].map((n) =>
          n.getAttribute("href"),
        ),
        brokenImages: [...document.images]
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.getAttribute("src")),
      }));
      rows.push({ path: pathname, status: response.status(), ...data });
    }
    for (const width of [1440, 1920, 768, 390])
      for (const pathname of [
        "/",
        "/pricing",
        "/features",
        "/resources",
        "/contact",
      ]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(origin + pathname, {
          waitUntil: "networkidle",
          timeout: 20000,
        });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        rows.find((r) => r.path === pathname)[`overflow${width}`] = overflow;
        if (width === 1440 || width === 390)
          await page.screenshot({
            path: path.join(
              dir,
              (pathname === "/" ? "home" : pathname.slice(1)) +
                "-" +
                width +
                ".png",
            ),
            fullPage: true,
          });
      }
    fs.writeFileSync(
      path.join(dir, "results.json"),
      JSON.stringify(rows, null, 2),
    );
    console.log(
      JSON.stringify({
        paths: rows.length,
        failed: rows.filter((r) => r.status !== 200),
        overflow: rows.filter((r) =>
          Object.entries(r).some(([k, v]) => k.startsWith("overflow") && v),
        ),
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
