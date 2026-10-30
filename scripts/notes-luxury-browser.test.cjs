/* Actual components with isolated fixtures; never contacts live services. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { state, handle, reset } = require("./notes-browser/fixtures.cjs")();
const { chromium } = require("playwright"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "myari-notes-"));
  const adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, "notes-browser/entry.jsx")],
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
  const cssRoot = path.join(
    process.env.NOTES_CSS_ROOT || root,
    ".next/static/css",
  );
  const iconFont = process.env.CONTACTS_ICON_FONT;
  const reviewFonts = process.env.REVIEW_FONTS_DIR;
  const css =
    (iconFont
      ? "@font-face{font-family:'Material Symbols Outlined';src:url(/review-icons.ttf)}.material-symbols-outlined{font-family:'Material Symbols Outlined'}"
      : "") +
    (reviewFonts
      ? fs.readFileSync(path.join(reviewFonts, "faces.css"), "utf8")
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
      path.join(root, "components/notes/notes-workspace.css"),
      "utf8",
    );
  const fontClasses = [
    ...css.matchAll(/\.([\w-]+)\{--font-(?:serif|inter|hand):[^}]+\}/g),
  ]
    .map((m) => m[1])
    .join(" ");
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (await handle(req, res, url)) return;
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
      ? path.join(
          reviewFonts ||
            path.join(process.env.NOTES_CSS_ROOT || root, ".next/static/media"),
          path.basename(file),
        )
      : path.resolve(root, "public", "." + file);
    if (
      !local.startsWith(root + path.sep) &&
      !(reviewFonts && local.startsWith(path.resolve(reviewFonts) + path.sep))
    ) {
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
  const output = path.join(root, "docs/notes-strategy-2/luxury");
  fs.mkdirSync(output, { recursive: true });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const measurements = [];
    for (const [width, height] of [
      [1440, 900],
      [1366, 768],
      [1280, 800],
      [1024, 900],
      [768, 1024],
      [390, 844],
    ]) {
      reset();
      const page = await browser.newPage({
          viewport: { width, height },
          reducedMotion: "reduce",
        }),
        errors = [];
      page.setDefaultTimeout(10000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/dashboard/notes");
      await page.getByLabel("Formatted note", { exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ path: require.resolve("axe-core") });
      const a11y = await page.evaluate(async () => {
        const r = await axe.run(".notes-premium", {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        });
        return r.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        }));
      });
      assert.deepEqual(a11y, []);
      assert.ok(
        await page
          .getByLabel("Formatted note", { exact: true })
          .getByRole("heading", { name: "Talking points" })
          .count(),
      );
      if (width <= 900) {
        await page
          .getByRole("button", { name: "Notes library", exact: true })
          .click();
        await page.locator(".notes-note-preview").first().click();
      }
      const editor = page.locator(".notes-editor");
      const geometry = await page.evaluate(() => {
        const r = (s) => document.querySelector(s).getBoundingClientRect();
        return {
          width: innerWidth,
          height: innerHeight,
          editorWidth: r(".notes-editor").width,
          editorBottom: r(".notes-editor").bottom,
          outerOverflow: Math.max(
            0,
            document.documentElement.scrollHeight - innerHeight,
          ),
          horizontal: document.documentElement.scrollWidth > innerWidth,
          heroHeight: r(".notes-hero").height,
        };
      });
      console.log("LAYOUT", JSON.stringify(geometry));
      assert.equal(geometry.horizontal, false);
      if (width > 1100) {
        assert.ok(geometry.outerOverflow <= 2, JSON.stringify(geometry));
        assert.ok(geometry.editorBottom <= height);
      }
      assert.ok(geometry.outerOverflow <= 2, JSON.stringify(geometry));
      measurements.push(geometry);
      await page.screenshot({
        path: path.join(output, `workspace-${width}.png`),
        fullPage: false,
      });
      await page
        .getByRole("button", { name: "Edit text", exact: true })
        .click();
      const input = page.getByLabel("Note content", { exact: true });
      const long = "## Client goals\n" + "Verified note context. ".repeat(900);
      console.log("STEP long", width);
      const typingStart = performance.now();
      await input.fill(long);
      await input.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      geometry.longNoteInputAndTwoFramesMs = performance.now() - typingStart;
      geometry.testedCharacters = long.length;
      await input.evaluate((el) => {
        el.focus();
        el.setSelectionRange(15, 35);
        el.scrollTop = 80;
      });
      const before = await input.evaluate((el) => ({
        value: el.value,
        start: el.selectionStart,
        end: el.selectionEnd,
        scroll: el.scrollTop,
      }));
      await page
        .getByRole("button", { name: "Focus Mode", exact: true })
        .click();
      const after = await input.evaluate((el) => ({
        value: el.value,
        start: el.selectionStart,
        end: el.selectionEnd,
        scroll: el.scrollTop,
      }));
      assert.deepEqual(after, before);
      if (width > 900) {
        const expanded = await editor.boundingBox();
        assert.ok(expanded.width > geometry.editorWidth + 100);
      }
      assert.equal(await page.locator(".notes-library").isVisible(), false);
      assert.equal(await page.locator(".notes-context").isVisible(), false);
      await page.screenshot({
        path: path.join(output, `focus-${width}.png`),
        fullPage: false,
      });
      await page.getByRole("button", { name: "Save now", exact: true }).click();
      await page.waitForFunction(
        () =>
          document.querySelector('.notes-editor-mode [role="status"]')
            .textContent === "Saved",
      );
      console.log("STEP reload", width);
      await page.reload();
      await page
        .getByRole("button", { name: "Exit Focus Mode", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Exit Focus Mode", exact: true })
        .click();
      if (
        width > 900 &&
        width <= 1100 &&
        (await page.locator(".notes-context").isVisible())
      )
        await page
          .getByRole("button", { name: "Close contextual panel", exact: true })
          .click();
      await page
        .getByRole("button", { name: "Edit text", exact: true })
        .click();
      await page
        .getByLabel("Note content", { exact: true })
        .fill("## Client goals\nBuyer requested a garden.");
      await page.getByRole("button", { name: "Save now", exact: true }).click();
      console.log("STEP panels", width);
      // Independent panel toggles and keyboard-accessible contextual tabs.
      if (width > 900) {
        if (
          await page
            .getByRole("button", {
              name: "Expand contextual tools",
              exact: true,
            })
            .count()
        )
          await page
            .getByRole("button", {
              name: "Expand contextual tools",
              exact: true,
            })
            .click();
        await page
          .getByRole("button", { name: "Collapse notes library", exact: true })
          .click();
        assert.equal(await page.locator(".notes-library").isVisible(), false);
        await page
          .getByRole("button", { name: "Expand notes library", exact: true })
          .click();
        await page
          .getByRole("button", {
            name: "Collapse contextual tools",
            exact: true,
          })
          .click();
        assert.equal(await page.locator(".notes-context").isVisible(), false);
        await page
          .getByRole("button", { name: "Expand contextual tools", exact: true })
          .click();
      } else
        await page
          .getByRole("button", { name: "Planner & context", exact: true })
          .click();
      console.log("STEP context", width);
      const context = page.locator(".notes-context");
      await context.getByRole("tab", { name: "Tasks", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await context
        .getByRole("heading", { name: "Linked records", exact: true })
        .waitFor();
      await context.getByRole("tab", { name: "Planner", exact: true }).click();
      await context
        .getByRole("heading", { name: "AI Realtor Planner", exact: true })
        .waitFor();
      await context
        .getByRole("tab", { name: "AI Insights", exact: true })
        .click();
      await context
        .getByRole("button", { name: "Review AI suggestions", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      assert.equal(
        state.requests.filter((r) => r.path === "/api/notes/assist").length,
        0,
      );
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Close", exact: true })
        .click();
      if (width <= 900)
        await page.getByRole("button", { name: "Editor", exact: true }).click();
      else if (width <= 1100)
        await page
          .getByRole("button", { name: "Close contextual panel", exact: true })
          .click();
      console.log("STEP metadata", width);
      await page.locator(".notes-metadata>summary").click();
      await page
        .getByLabel("Note tags", { exact: true })
        .fill("buyer, follow-up");
      await page.getByLabel("Note tags", { exact: true }).press("Tab");
      await page.getByRole("button", { name: "Save now", exact: true }).click();
      await page
        .locator(".notes-metadata .notes-record-picker>summary")
        .click();
      await page
        .locator(".notes-metadata .notes-record-picker")
        .getByLabel("Buyer follow-up", { exact: false })
        .check();
      await page.getByRole("button", { name: "Save now", exact: true }).click();
      await page.locator(".notes-metadata>summary").click();
      await page.getByRole("button", { name: "History", exact: true }).click();
      const history = page.getByRole("dialog");
      await history.getByLabel("Saved revision", { exact: true }).waitFor();
      await history.getByRole("checkbox").check();
      await history
        .getByRole("button", { name: "Restore this version", exact: true })
        .click();
      await history.waitFor({ state: "detached" });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      assert.equal(
        state.requests.some((r) => /send|billing|enroll/.test(r.path)),
        false,
      );
      results.push({ width, height, passed: true });
      await page.close();
    }
    fs.writeFileSync(
      path.join(output, "measurements.json"),
      JSON.stringify(
        {
          measurements,
          results,
          note: "Real components with synthetic HTTP fixtures; no live credentials or outbound requests.",
        },
        null,
        2,
      ),
    );
    console.log("PASS luxury workspace and focus mode at six viewports");
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
