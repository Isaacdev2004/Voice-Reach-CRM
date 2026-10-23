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
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "myari-calendar-"));
  const adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, "calendar-browser/entry.jsx")],
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
      path.join(root, "components/calendar/calendar-workspace.css"),
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
  const output = path.join(root, "docs/calendar-premium");
  fs.mkdirSync(output, { recursive: true });
  try {
    for (const width of [1440, 1920, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1050 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        `http://127.0.0.1:${server.address().port}/dashboard/calendar?date=2026-10-22`,
      );
      await page
        .getByText("Buyer consultation", { exact: true })
        .first()
        .waitFor();
      await page
        .getByRole("heading", { name: "Make every moment count." })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: path.join(output, `calendar-${width}.png`),
        fullPage: false,
      });
      await page
        .getByRole("button", { name: "Add Event", exact: false })
        .click();
      const dialog = page.getByRole("dialog", { name: "Schedule event" });
      await dialog
        .getByLabel("Title", { exact: true })
        .fill("Synthetic appointment");
      await dialog.getByLabel("Time", { exact: true }).fill("14:00");
      await dialog
        .getByLabel("Find subscriber contact")
        .fill("jordan@example.test");
      await dialog
        .getByLabel("Associated contact")
        .selectOption("00000000-0000-4000-8000-000000000002");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await page
        .getByText("Synthetic appointment", { exact: true })
        .first()
        .waitFor();
      assert.ok(
        await page.evaluate(() =>
          window.__requests.some(
            (r) =>
              r.method === "POST" &&
              r.path === "/api/calendar/events" &&
              r.body.contactId.endsWith("002") &&
              r.body.syncToGoogle === false,
          ),
        ),
      );
      if (width >= 1440) {
        await page
          .getByRole("button", { name: "Calendar preferences", exact: true })
          .click();
        const pref = page.getByRole("dialog", { name: "Calendar preferences" });
        await pref.getByLabel("24-hour time", { exact: true }).check();
        await pref.getByRole("button", { name: "Save preferences" }).click();
        await pref.waitFor({ state: "hidden" });
        assert.ok(
          await page.evaluate(() => window.__prefs.owner_a.preferences.hour24),
        );
        await page.reload();
        await page
          .getByText("Buyer consultation", { exact: true })
          .first()
          .waitFor();
        assert.ok(
          await page
            .locator(".calendar-event time")
            .filter({ hasText: "09:00" })
            .count(),
        );
        const event = page
          .locator(".calendar-event")
          .filter({ hasText: "Synthetic appointment" });
        await event.click();
        await page
          .getByRole("dialog", { name: "Synthetic appointment" })
          .getByRole("button", { name: "Edit / move / resize" })
          .click();
        const edit = page.getByRole("dialog", { name: "Edit appointment" });
        await edit.getByLabel("Time", { exact: true }).fill("15:00");
        await edit.getByRole("button", { name: "Save", exact: true }).click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        assert.ok(
          await page.evaluate(() =>
            window.__events.owner_a
              .find((i) => i.title === "Synthetic appointment")
              .starts_at.includes("19:00"),
          ),
        );
        // Actual drag interaction, then failed server rollback.
        await page.evaluate(() => (window.__failMove = true));
        const before = await page.evaluate(
          () =>
            window.__events.owner_a.find(
              (i) => i.title === "Synthetic appointment",
            ).starts_at,
        );
        const draggable = page
          .locator(".calendar-event")
          .filter({ hasText: "Synthetic appointment" });
        const target = page.getByRole("button", {
          name: "Schedule 2026-10-23 14:00",
          exact: true,
        });
        await draggable.dragTo(target);
        await page.getByText(/previous time has been restored/).waitFor();
        assert.equal(
          await page.evaluate(
            () =>
              window.__events.owner_a.find(
                (i) => i.title === "Synthetic appointment",
              ).starts_at,
          ),
          before,
        );
        await page.evaluate(() => (window.__failMove = false));
        const resizeHandle = page
          .locator(".calendar-event")
          .filter({ hasText: "Synthetic appointment" })
          .locator(".calendar-resize");
        await resizeHandle.scrollIntoViewIfNeeded();
        const bounds = await resizeHandle.boundingBox();
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 3);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 18);
        await page.mouse.up();
        await page.waitForFunction(() =>
          window.__events.owner_a
            .find((i) => i.title === "Synthetic appointment")
            .ends_at.includes("20:15"),
        );
        await page
          .getByRole("textbox", { name: "Search calendar", exact: true })
          .fill("no-matches");
        assert.equal(await page.locator(".calendar-event").count(), 0);
        await page
          .getByRole("textbox", { name: "Search calendar", exact: true })
          .fill("");
        await page.getByRole("button", { name: "Month", exact: true }).click();
        await page.locator(".calendar-month-day").first().waitFor();
        assert.equal(await page.locator(".calendar-month-day").count(), 42);
        await page.getByRole("button", { name: "Week", exact: true }).click();
        await page.locator(".calendar-event").first().waitFor();
        await page
          .locator(".calendar-event")
          .filter({ hasText: "Synthetic appointment" })
          .click();
        page.once("dialog", (d) => d.dismiss());
        await page.getByRole("button", { name: "Delete appointment" }).click();
        assert.ok(
          await page.evaluate(() =>
            window.__events.owner_a.some(
              (i) => i.title === "Synthetic appointment",
            ),
          ),
        );
        page.once("dialog", (d) => d.accept());
        await page.getByRole("button", { name: "Delete appointment" }).click();
        await page.waitForFunction(
          () =>
            !window.__events.owner_a.some(
              (i) => i.title === "Synthetic appointment",
            ),
        );
        // Changing subscriber clears the prior account's appointments and preferences.
        await page.evaluate(() => window.__setOwner("owner_b"));
        await page
          .getByText("Buyer consultation", { exact: true })
          .first()
          .waitFor({ state: "hidden" });
        assert.equal(await page.locator(".calendar-event").count(), 0);
      } else {
        await page
          .getByRole("button", { name: "Open calendars panel" })
          .click();
        await page
          .getByRole("dialog", { name: "Calendars" })
          .getByText("MyARI appointments", { exact: true })
          .waitFor();
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "Open calendar details" })
          .click();
        await page
          .getByRole("dialog", { name: "Calendar details" })
          .getByRole("heading", { name: "Calendar Integrations" })
          .waitFor();
        await page.screenshot({
          path: path.join(output, `calendar-details-${width}.png`),
          fullPage: false,
        });
        await page.keyboard.press("Escape");
      }
      assert.deepEqual(errors, []);
      results.push({
        width,
        overflow: false,
        errors: 0,
        creation: true,
        details: true,
      });
      await page.close();
    }
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1050 } });
      await page.goto(
        `http://127.0.0.1:${server.address().port}/dashboard/calendar?timeline=1`,
      );
      await page
        .getByText("Buyer consultation scheduled", { exact: true })
        .waitFor();
      assert.ok(
        (
          await page
            .getByRole("link", { name: "Schedule follow-up", exact: true })
            .getAttribute("href")
        ).includes("contactId=00000000-0000-4000-8000-000000000002"),
      );
      await page.screenshot({
        path: path.join(output, `timeline-${width}.png`),
        fullPage: false,
      });
      await page
        .getByRole("button", { name: "Log a call", exact: true })
        .click();
      const dialog = page.getByRole("dialog", { name: "Log a completed call" });
      await dialog
        .getByLabel("Notes", { exact: true })
        .fill("Synthetic manually logged call");
      await dialog.getByRole("button", { name: "Save call log" }).click();
      await dialog.waitFor({ state: "hidden" });
      assert.ok(
        await page.evaluate(() =>
          window.__requests.some(
            (r) =>
              r.method === "POST" &&
              r.path.endsWith("/calls") &&
              r.body.notes === "Synthetic manually logged call",
          ),
        ),
      );
      await page
        .getByRole("link", { name: "Property search", exact: true })
        .click({ modifiers: ["Control"] });
      assert.equal(
        await page.evaluate(() =>
          sessionStorage.getItem("myari:property-client:v1:owner_a"),
        ),
        "00000000-0000-4000-8000-000000000002",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.close();
    }
    fs.writeFileSync(
      path.join(output, "browser-results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
