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
  const cssRoot = path.join(root, ".next/static/css");
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
          reviewFonts || path.join(root, ".next/static/media"),
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
  const output = path.join(root, "docs/notes-premium");
  fs.mkdirSync(output, { recursive: true });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const width of [1440, 1920, 768, 390]) {
      reset();
      const page = await browser.newPage({ viewport: { width, height: 1050 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/dashboard/notes");
      await page
        .getByRole("heading", { name: "Great outcomes begin with a plan." })
        .waitFor();
      if (width <= 900)
        await page
          .getByRole("button", { name: "Notes library", exact: true })
          .click();
      await page.locator(".notes-note-preview").first().click();
      await page.getByLabel("Note title", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Formatted preview", exact: true })
        .click();
      await page.screenshot({
        path: path.join(output, `notes-${width}.png`),
        fullPage: false,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      if (width <= 900) {
        await page.getByRole("button", { name: "Planner & context" }).click();
        await page
          .getByRole("heading", { name: "AI Realtor Planner" })
          .waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.screenshot({
          path: path.join(output, `notes-context-${width}.png`),
          fullPage: false,
        });
        await page.getByRole("button", { name: "Editor", exact: true }).click();
      }
      await page
        .getByRole("button", { name: "Edit text", exact: true })
        .click();
      await page
        .getByLabel("Note title", { exact: true })
        .fill("Listing presentation prep");
      await page
        .getByLabel("Note content", { exact: true })
        .fill("Client requested a garden.\n- [ ] Review preferences");
      await page.waitForTimeout(1250);
      await page.getByRole("button", { name: "Save now", exact: true }).click();
      assert.ok(
        state.notes.some(
          (n) =>
            n.title === "Listing presentation prep" &&
            n.body.includes("Review preferences"),
        ),
      );
      await page.getByRole("button", { name: "Dictate", exact: true }).click();
      let dialog = page.getByRole("dialog");
      await page.evaluate(() => (window.__denyMic = true));
      await dialog
        .getByRole("button", { name: "Start dictation", exact: true })
        .click();
      await dialog
        .getByText("Microphone permission was denied.", { exact: false })
        .waitFor();
      await page.evaluate(() => (window.__denyMic = false));
      await dialog
        .getByRole("button", { name: "Start dictation", exact: true })
        .click();
      await page.waitForTimeout(100);
      await dialog.getByRole("button", { name: "Stop", exact: true }).click();
      await dialog
        .getByRole("button", { name: "Save Transcript", exact: true })
        .click();
      await page
        .getByText("Original transcript (preserved separately)", {
          exact: true,
        })
        .waitFor();
      await page.getByRole("button", { name: "Save now", exact: true }).click();
      await page
        .getByRole("button", { name: "Selection → task", exact: true })
        .click();
      dialog = page.getByRole("dialog");
      await dialog
        .getByLabel("Task title", { exact: true })
        .fill("Synthetic follow-up " + width);
      await dialog
        .getByRole("button", { name: "Confirm & create task" })
        .click();
      assert.equal(
        state.tasks.filter((t) => t.title === "Synthetic follow-up " + width)
          .length,
        1,
      );
      if (width > 900)
        await page
          .locator(".notes-related-task")
          .filter({ hasText: "Synthetic follow-up " + width })
          .waitFor();
      await page
        .getByRole("button", { name: "AI Assist", exact: true })
        .last()
        .click();
      dialog = page.getByRole("dialog");
      await dialog.getByLabel("Send this text to AI for processing").check();
      await dialog
        .getByRole("button", { name: "Generate draft", exact: true })
        .click();
      await dialog.getByLabel("AI summary draft").waitFor();
      assert.equal(
        await dialog
          .getByRole("button", { name: "Review task details" })
          .isDisabled(),
        true,
      );
      await dialog.getByLabel("Approve this suggestion").check();
      await dialog.getByRole("button", { name: "Review task details" }).click();
      dialog = page.getByRole("dialog", {
        name: "Review & create task",
        exact: true,
      });
      await dialog.getByLabel("Task title", { exact: true }).waitFor();
      await page.keyboard.press("Escape");
      await page.getByLabel("AI summary draft").waitFor();
      await page.keyboard.press("Escape");
      if (width <= 900)
        await page
          .getByRole("button", { name: "Notes library", exact: true })
          .click();
      await page
        .getByLabel("Search notes", { exact: true })
        .fill("nothing-matches-synthetic");
      await page
        .getByText("Room for your next idea.", { exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      assert.ok((await page.locator(".notes-note-preview").count()) > 0);
      assert.deepEqual(errors, []);
      results.push({
        width,
        overflow: false,
        pageErrors: errors,
        checks: [
          "responsive editor/library/context",
          "auto-save",
          "microphone denial",
          "synthetic speech and original preservation",
          "approved task creation",
          "AI approval gate",
          "combined search empty state",
        ],
      });
      await page.close();
    }
    // Formatting, real-record mentions, combined filters, template reuse, and version restoration.
    const edit = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    edit.on("dialog", (d) => d.accept());
    await edit.goto(origin + "/dashboard/notes");
    await edit.locator(".notes-note-preview").first().click();
    await edit.getByLabel("Note content", { exact: true }).waitFor();
    await edit
      .getByLabel("Note content", { exact: true })
      .fill("Buyer requested a garden.");
    await edit.getByLabel("Note content", { exact: true }).evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 5);
    });
    await edit.getByRole("button", { name: "Bold", exact: true }).click();
    assert.equal(
      await edit.getByLabel("Note content", { exact: true }).inputValue(),
      "**Buyer** requested a garden.",
    );
    await edit
      .getByRole("button", { name: "Formatted preview", exact: true })
      .click();
    assert.equal(
      await edit.locator(".notes-rendered strong").textContent(),
      "Buyer",
    );
    await edit.getByRole("button", { name: "Edit text", exact: true }).click();
    await edit
      .getByLabel("Note content", { exact: true })
      .fill("Buyer requested a garden.\n@Jordan");
    await edit.locator(".notes-mention button").first().click();
    await edit
      .getByLabel("Note tags", { exact: true })
      .fill("buyer, follow-up");
    await edit.getByLabel("Note tags", { exact: true }).press("Tab");
    await edit
      .getByLabel("Note category", { exact: true })
      .selectOption("Clients");
    await edit.getByRole("button", { name: "Save now", exact: true }).click();
    await edit.locator(".notes-library-controls summary").click();
    await edit
      .getByLabel("Filter by tag", { exact: true })
      .selectOption("buyer");
    await edit
      .getByLabel("Filter by contact", { exact: true })
      .selectOption("00000000-0000-4000-8000-000000000002");
    await edit.getByLabel("Search notes", { exact: true }).fill("garden");
    assert.equal(await edit.locator(".notes-note-preview").count(), 1);
    await edit
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await edit.getByRole("button", { name: "History", exact: true }).click();
    let historyDialog = edit.getByRole("dialog");
    await historyDialog.locator("details").first().waitFor();
    assert.ok((await historyDialog.locator("details").count()) > 0);
    await historyDialog.locator("summary").first().click();
    await historyDialog
      .getByRole("button", { name: "Restore this version" })
      .first()
      .click();
    await edit.getByRole("button", { name: "Save now", exact: true }).click();
    await edit
      .getByRole("button", { name: "Use Template", exact: true })
      .click();
    await edit
      .getByRole("button", { name: "Daily Agent Planner", exact: false })
      .click();
    assert.equal(
      await edit.getByLabel("Note title", { exact: true }).inputValue(),
      "Daily Agent Planner",
    );
    await edit.getByRole("button", { name: "Save now", exact: true }).click();
    await edit.getByRole("button", { name: "Pin note", exact: true }).click();
    await edit.getByRole("button", { name: "Save now", exact: true }).click();
    await edit
      .getByRole("button", { name: "Use Template", exact: true })
      .click();
    await edit
      .getByRole("button", {
        name: "Save current note as reusable template",
        exact: true,
      })
      .click();
    await edit.getByRole("button", { name: "Save now", exact: true }).click();
    assert.ok(state.notes.some((n) => n.metadata.isTemplate));
    await edit.getByRole("button", { name: "Delete", exact: true }).click();
    await edit
      .getByRole("button", { name: "Confirm deletion", exact: true })
      .click();
    await edit
      .getByText(
        "Note and version history deleted. Linked tasks are retained.",
        { exact: true },
      )
      .waitFor();
    for (const label of ["Weekly", "Monthly", "Daily"]) {
      await edit.getByRole("button", { name: label, exact: true }).click();
      await edit.waitForTimeout(60);
    }
    results.push({
      checks: [
        "formatting and safe rendered preview",
        "stable-ID contact mention",
        "combined category/tag/contact/search filters",
        "version restoration creates new save",
        "built-in template and reusable custom template",
        "pin persistence",
        "confirmed note deletion",
        "daily/weekly/monthly planner navigation",
      ],
    });
    await edit.close();
    // Failed save, recovery, stale revision, server review, tenant switch, and a second browser session.
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    await page.goto(origin + "/dashboard/notes");
    await page.locator(".notes-note-preview").first().click();
    state.failSave = true;
    await page
      .getByLabel("Note content", { exact: true })
      .fill("Unsaved synthetic recovery draft.");
    await page.waitForTimeout(1200);
    await page
      .getByText("Save failed — draft preserved", { exact: true })
      .waitFor();
    assert.ok(
      await page.evaluate(() =>
        Object.keys(localStorage).some((k) =>
          k.includes("notes:draft:owner_a"),
        ),
      ),
    );
    page.on("dialog", (d) => d.accept());
    await page.reload();
    await page
      .getByRole("button", { name: "Recover draft for review" })
      .click();
    assert.equal(
      await page.getByLabel("Note content", { exact: true }).inputValue(),
      "Unsaved synthetic recovery draft.",
    );
    state.failSave = false;
    await page
      .getByRole("button", { name: "save as a new note", exact: true })
      .click();
    await page.getByText("Saved", { exact: true }).waitFor();
    state.conflict = true;
    await page
      .getByLabel("Note content", { exact: true })
      .fill("Older device edit.");
    await page.waitForTimeout(1200);
    await page
      .getByText("Conflict — draft preserved", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Load server version" }).click();
    await page.waitForTimeout(200);
    assert.equal(
      await page.getByLabel("Note content", { exact: true }).inputValue(),
      "Newer edit from another device.",
    );
    const note = state.notes.find(
      (n) => n.body === "Newer edit from another device.",
    );
    const context = await browser.newContext();
    const second = await context.newPage();
    await second.goto(origin + "/dashboard/notes?note=" + note.id);
    await second.getByLabel("Note content", { exact: true }).waitFor();
    await second.waitForTimeout(200);
    assert.equal(
      await second.getByLabel("Note content", { exact: true }).inputValue(),
      note.body,
    );
    await page.evaluate(() => window.__setOwner("owner_b"));
    await page.waitForTimeout(200);
    assert.equal(await page.locator(".notes-note-preview").count(), 0);
    assert.equal(
      await page.getByLabel("Note content", { exact: true }).inputValue(),
      "",
    );
    assert.equal(
      await page.evaluate(() =>
        Object.keys(localStorage).some(
          (k) => k === "myari:notes:draft:owner_b",
        ),
      ),
      false,
    );
    results.push({
      checks: [
        "save failure recovery",
        "stale revision conflict",
        "load newer server version",
        "second isolated browser session reads saved note",
        "tenant switch clears editor",
      ],
    });
    await page.close();
    await context.close();
    reset();
    state.basic = true;
    state.failCalendar = true;
    const legacy = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    await legacy.goto(origin + "/dashboard/notes");
    await legacy.locator(".notes-note-preview").first().click();
    await legacy
      .getByText("Your notes are available.", { exact: false })
      .waitFor();
    assert.equal(
      await legacy
        .getByRole("button", { name: "History", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await legacy.getByLabel("Note tags", { exact: true }).isDisabled(),
      true,
    );
    for (const text of ["Legacy note update one.", "Legacy note update two."]) {
      await legacy.getByLabel("Note content", { exact: true }).fill(text);
      await legacy
        .getByRole("button", { name: "Save now", exact: true })
        .click();
      await legacy.getByText("Saved", { exact: true }).waitFor();
      assert.ok(state.notes.some((n) => n.body === text));
    }
    await legacy
      .getByRole("button", { name: "New Note", exact: false })
      .click();
    await legacy
      .getByLabel("Note title", { exact: true })
      .fill("Basic property association");
    const newProperty = legacy.locator(".notes-associations details").nth(1);
    await newProperty.locator("summary").click();
    await newProperty
      .getByLabel("Search saved property addresses")
      .fill("123 Example");
    await newProperty.getByRole("checkbox").first().check();
    await legacy.getByRole("button", { name: "Save now", exact: true }).click();
    assert.equal(
      state.notes.find((n) => n.title === "Basic property association")
        .contact_id,
      "00000000-0000-4000-8000-000000000002",
    );
    await newProperty.locator("summary").click();
    const contactPicker = legacy.locator(".notes-associations details").first();
    await contactPicker.locator("summary").click();
    await contactPicker
      .getByLabel("Search contacts to link")
      .fill("jordan@example.test");
    await contactPicker.getByRole("checkbox").first().uncheck();
    await contactPicker.getByRole("checkbox").first().check();
    await legacy.getByRole("button", { name: "Save now", exact: true }).click();
    const propertyPicker = legacy.locator(".notes-associations details").nth(1);
    await propertyPicker.locator("summary").click();
    await propertyPicker
      .getByLabel("Search saved property addresses")
      .fill("123 Example");
    assert.equal(
      await propertyPicker.getByRole("checkbox").first().isEnabled(),
      true,
    );
    await propertyPicker.getByRole("checkbox").first().check();
    await legacy.getByRole("button", { name: "Save now", exact: true }).click();
    await legacy.reload();
    await legacy
      .locator(".notes-note-preview")
      .filter({ hasText: "Basic property association" })
      .click();
    await legacy
      .locator(".notes-associations details")
      .nth(1)
      .locator("summary")
      .click();
    assert.equal(
      await legacy
        .locator(".notes-associations details")
        .nth(1)
        .getByRole("checkbox")
        .first()
        .isChecked(),
      true,
    );
    await legacy.screenshot({
      path: path.join(output, "compatibility-1440.png"),
      fullPage: false,
    });
    await legacy.close();
    state.tasks.push({
      id: "00000000-0000-4000-8000-000000000777",
      owner_id: "owner_a",
      contact_id: "00000000-0000-4000-8000-000000000002",
      title: "Existing task stays visible",
      due_at: new Date().toISOString(),
      completed: false,
    });
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 1050 },
    });
    await mobile.goto(origin + "/dashboard/notes");
    await mobile.getByRole("button", { name: "Planner & context" }).click();
    await mobile
      .locator(".notes-planner-row")
      .filter({ hasText: "Existing task stays visible" })
      .waitFor();
    await mobile
      .getByText("Appointments could not be loaded.", { exact: false })
      .waitFor();
    assert.equal(
      await mobile
        .getByText("No appointments recorded in this view.", { exact: true })
        .count(),
      0,
    );
    assert.equal(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await mobile.screenshot({
      path: path.join(output, "compatibility-390.png"),
      fullPage: false,
    });
    await mobile.close();
    state.failLoad = true;
    const failed = await browser.newPage();
    await failed.goto(origin + "/dashboard/notes");
    await failed.getByText("Notes unavailable", { exact: true }).waitFor();
    assert.equal(
      await failed
        .getByText("Room for your next idea.", { exact: true })
        .count(),
      0,
    );
    assert.equal(await failed.getByText("0 notes", { exact: true }).count(), 0);
    assert.equal(await failed.getByText("Saved", { exact: true }).count(), 0);
    await failed.close();
    results.push({
      checks: [
        "basic schema loads existing notes",
        "two consecutive timestamp-guarded saves",
        "unavailable advanced features disabled",
        "tasks survive calendar read failure",
        "read failures never claim zero notes or Saved",
        "basic desktop/mobile no overflow",
      ],
    });
    fs.writeFileSync(
      path.join(output, "browser-results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
