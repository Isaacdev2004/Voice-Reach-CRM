/* Actual components with isolated fixtures; never contacts live services. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { chromium } = require("playwright"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "myari-delivery-"));
  const adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, "delivery-browser/entry.jsx")],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"development"' },
    alias: {
      "next/server": path.join(adapters, "server.jsx"),
      "next/link": path.join(adapters, "link.jsx"),
      "next/image": path.join(adapters, "image.jsx"),
      "next/navigation": path.join(adapters, "stubs.jsx"),
      "@clerk/nextjs": path.join(adapters, "stubs.jsx"),
    },
  });
  const cssRoot = path.join(root, ".next/static/css");
  const iconFont = process.env.CONTACTS_ICON_FONT;
  const css =
    (iconFont
      ? "@font-face{font-family:'Material Symbols Outlined';src:url(/review-icons.ttf)}.material-symbols-outlined{font-family:'Material Symbols Outlined'}"
      : "") +
    fs
      .readdirSync(cssRoot)
      .filter((x) => x.endsWith(".css"))
      .map((x) =>
        fs
          .readFileSync(path.join(cssRoot, x), "utf8")
          .replaceAll("../media/", "/review-fonts/")
          .replaceAll("/_next/static/media/", "/review-fonts/"),
      )
      .join("\n") +
    fs.readFileSync(
      path.join(root, "components/delivery/delivery-audit.css"),
      "utf8",
    );
  const fontClasses = [
    ...css.matchAll(/\.([\w-]+)\{--font-(?:serif|inter|hand):[^}]+\}/g),
  ]
    .map((m) => m[1])
    .join(" ");
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    let file = url.pathname;
    if (file === "/review-icons.ttf" && iconFont) {
      res.setHeader("content-type", "font/ttf");
      return res.end(fs.readFileSync(iconFont));
    }
    if (file === "/bundle.js") {
      res.setHeader("content-type", "application/javascript");
      return res.end(bundle.outputFiles[0].text);
    }
    if (file === "/style.css") {
      res.setHeader("content-type", "text/css");
      return res.end(css);
    }
    if (file.startsWith("/dashboard")) {
      res.setHeader("content-type", "text/html");
      return res.end(
        `<html><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="${fontClasses}"><div id="root"></div><script src="/bundle.js"></script></body></html>`,
      );
    }
    if (file === "/favicon.ico") {
      res.statusCode = 204;
      return res.end();
    }
    const local = file.startsWith("/review-fonts/")
      ? path.join(root, ".next/static/media", path.basename(file))
      : path.resolve(root, "public", "." + file);
    if (!local.startsWith(root + path.sep)) {
      res.statusCode = 403;
      return res.end();
    }
    try {
      res.end(fs.readFileSync(local));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const results = [];
  try {
    for (const width of [1440, 1920, 768, 390]) {
      console.log(`Checking delivery viewport ${width}`);
      const page = await browser.newPage({ viewport: { width, height: 1050 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        `http://127.0.0.1:${server.address().port}/dashboard/delivery`,
      );
      await page
        .getByText("35 attempts · Page 1 of 2", { exact: true })
        .waitFor();
      assert.equal(await page.locator("tbody tr").count(), 25);
      assert.equal(
        await page.getByText("Status Unavailable", { exact: true }).count(),
        3,
      );
      await page.screenshot({
        path: path.join(tmp, `delivery-${width}.png`),
        fullPage: true,
      });
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page
        .getByText("35 attempts · Page 2 of 2", { exact: true })
        .waitFor();
      assert.equal(await page.locator("tbody tr").count(), 10);
      await page.getByLabel("Channel", { exact: true }).selectOption("email");
      await page
        .getByLabel("Status", { exact: true })
        .selectOption("delivered");
      await page
        .getByText("3 attempts · Page 1 of 1", { exact: true })
        .waitFor();
      assert.equal(await page.locator("tbody tr").count(), 3);
      await page.getByLabel("Search", { exact: true }).fill("no-match");
      await page
        .getByText("No matching delivery evidence", { exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Clear all", exact: true })
        .click();
      await page
        .getByText("35 attempts · Page 1 of 2", { exact: true })
        .waitFor();
      const open = page
        .getByRole("button", { name: /View delivery details for/ })
        .first();
      await open.click();
      const dialog = page.getByRole("dialog", { name: "Delivery details" });
      await dialog
        .getByText("Actual submitted message", { exact: true })
        .waitFor();
      await dialog
        .getByText("Verified event timeline", { exact: true })
        .waitFor();
      assert.ok((await dialog.innerText()).includes("Hi Jordan"));
      await page.screenshot({
        path: path.join(tmp, `delivery-details-${width}.png`),
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      if (width === 1440) {
        await page.evaluate(() => (window.__canReconcile = true));
        await page
          .getByRole("button", { name: "Refresh evidence", exact: true })
          .click();
        const reconcile = page
          .getByRole("button", { name: "Check provider statuses", exact: true })
          .first();
        await reconcile.waitFor();
        page.once("dialog", (d) => d.dismiss());
        await reconcile.click();
        assert.equal(
          await page.evaluate(
            () => window.__requests.filter((r) => r.method === "POST").length,
          ),
          0,
        );
        page.once("dialog", (d) => d.accept());
        await reconcile.click();
        await page
          .getByText("1 provider records checked. No messages were sent.", {
            exact: true,
          })
          .waitFor();
        await page.getByText("Connected", { exact: true }).waitFor();
        assert.equal(
          await page.getByText("Status Unavailable", { exact: true }).count(),
          2,
        );
      }
      await page.evaluate(() => window.__setOwner("owner_b"));
      await page
        .getByText("No matching delivery evidence", { exact: true })
        .waitFor();
      assert.equal(await page.locator("tbody tr").count(), 0);
      assert.ok(
        !(await page.locator("main.da-workspace").innerText()).includes(
          "Jordan 1",
        ),
      );
      await page.evaluate(() => {
        window.__fail = true;
        window.__setOwner("owner_a");
      });
      await page
        .getByText("Delivery evidence unavailable", { exact: true })
        .waitFor();
      await page.evaluate(() => (window.__fail = false));
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await page
        .getByText("35 attempts · Page 1 of 2", { exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      assert.equal(
        await page.evaluate(() =>
          window.__requests.some(
            (r) =>
              r.method !== "GET" &&
              !(r.method === "POST" && r.path === "/api/delivery/reconcile"),
          ),
        ),
        false,
      );
      results.push({
        width,
        pagination: true,
        combinedFilters: true,
        searchAndClear: true,
        detailsAndTimeline: true,
        keyboardClose: true,
        ownerSwitch: true,
        errorAndEmpty: true,
        noPageOverflow: true,
        approvedMockReconciliation: width === 1440,
        noSendsOrLiveCalls: true,
        pageErrors: errors,
      });
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  fs.writeFileSync(
    path.join(tmp, "browser-results.json"),
    JSON.stringify({ fixtureOnly: true, results }, null, 2),
  );
  console.log(JSON.stringify({ artifacts: tmp, results }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
