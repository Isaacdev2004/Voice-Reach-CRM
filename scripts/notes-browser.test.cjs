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
    async function library(page){const toggle=page.locator('#notes-toggle-library');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();}
    async function planner(page){const toggle=page.locator('#notes-toggle-planner');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();}
    async function closeDrawers(page){for(const which of ['library','planner']){const b=page.locator('#notes-close-'+which);if(await b.isVisible())await b.click();}}
    for (const width of [1440, 1920, 768, 390]) {
      reset();
      const page = await browser.newPage({ viewport: { width, height: 1050 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/dashboard/notes");
      await page.getByRole('heading',{name:'Notes & Strategy',exact:true}).waitFor();
      await page.getByRole('button',{name:'Open Recent Note',exact:true}).waitFor();
      const hero=await page.locator('.notes-studio-hero').boundingBox();
      if(width>=1440)assert.ok(hero.height>=160&&hero.height<=220,'compact architectural hero height');
      await page.locator('.notes-studio-hero img').evaluate(img=>img.decode());
      const writes=state.requests.filter(r=>r.method==='POST');
      assert.equal(writes.length,0,'opening Notes must not create a record');
      assert.equal(await page.locator('#notes-toggle-library').getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('#notes-toggle-planner').getAttribute('aria-expanded'),'false');
      await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`studio-empty-${width}.png`),fullPage:false,animations:"disabled"});
      await page.getByRole('button',{name:'Open Recent Note',exact:true}).click();
      await page.getByLabel('Note content',{exact:true}).waitFor();
      await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`studio-default-${width}.png`),fullPage:false,animations:"disabled"});
      const title=page.getByLabel('Note title',{exact:true});const originalTitle=await title.inputValue();
      for(const value of ['',originalTitle,'Long buyer consultation and property strategy — '+('thoughtful planning '.repeat(7)).slice(0,145)]){
        await title.fill(value);await title.focus();
        const geometry=await page.evaluate(()=>({title:document.querySelector('.notes-title').getBoundingClientRect().toJSON(),links:document.querySelector('.notes-associations').getBoundingClientRect().toJSON(),outline:getComputedStyle(document.querySelector('.notes-title')).outlineWidth}));
        assert.ok(geometry.title.bottom<=geometry.links.top,'title must never overlap contact/property controls');assert.equal(geometry.outline,'2px');
      }
      await title.fill(originalTitle);await title.focus();
      await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`studio-title-focused-${width}.png`),fullPage:false,animations:"disabled"});
      const widths=await page.evaluate(()=>({editor:document.querySelector('.notes-editor').getBoundingClientRect().width,workspace:document.querySelector('.notes-columns').getBoundingClientRect().width}));
      assert.ok(widths.editor/widths.workspace>=.65,'editor must dominate the closed-drawer layout');
      await page.getByLabel('Note content',{exact:true}).fill((await page.getByLabel('Note content',{exact:true}).inputValue())+'\n'+Array.from({length:70},(_,i)=>'Writing continuity line '+i).join('\n'));
      await page.evaluate(()=>{window.__studioEditor=document.querySelector('textarea.notes-canvas');window.__studioEditor.setSelectionRange(4,12);window.__studioEditor.scrollTop=120;});
      await library(page);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`studio-library-${width}.png`),fullPage:false,animations:"disabled"});
      assert.equal(await page.evaluate(()=>window.__studioEditor===document.querySelector('textarea.notes-canvas')),true);
      assert.equal(await page.getByLabel('Note content',{exact:true}).evaluate(el=>el.selectionStart),4);
      assert.equal(await page.getByLabel('Note content',{exact:true}).evaluate(el=>el.scrollTop),120);
      await closeDrawers(page);await planner(page);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`studio-planner-${width}.png`),fullPage:false,animations:"disabled"});
      await page.getByRole('button',{name:'Expand planning view',exact:true}).click();await page.locator('.notes-columns[data-planner-expanded=true]').waitFor();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`studio-expanded-planner-${width}.png`),fullPage:false,animations:'disabled'});await page.getByRole('button',{name:'Return to drawer',exact:true}).click();
      if(width===1920){await library(page);await page.waitForFunction(()=>document.querySelector('#notes-library-panel').getBoundingClientRect().width>=259);await page.waitForTimeout(220);const l=await page.locator('#notes-library-panel').boundingBox(),e=await page.locator('.notes-editor').boundingBox(),r=await page.locator('#notes-planner-panel').boundingBox();assert.ok(l.x+l.width<=e.x&&e.x+e.width<=r.x,'inline drawers must not overlap editor');const tb=await page.locator('.notes-title').boundingBox(),ab=await page.locator('.notes-associations').boundingBox();assert.ok(tb.y+tb.height<=ab.y,'title remains separate with both drawers open');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,'studio-both-1920.png'),fullPage:false,animations:"disabled"});assert.equal(await page.locator('#notes-library-panel').isVisible(),true);assert.equal(await page.locator('#notes-planner-panel').isVisible(),true);await page.getByRole('button',{name:'Focus Mode',exact:true}).click();assert.equal(await page.locator('#notes-library-panel').isVisible(),false);await page.getByRole('button',{name:'Exit Focus Mode',exact:true}).click();assert.equal(await page.locator('#notes-library-panel').isVisible(),true);assert.equal(await page.locator('#notes-planner-panel').isVisible(),true);}
      await closeDrawers(page);
      await page.getByRole('button',{name:'Focus Mode',exact:true}).click();
      await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`studio-focus-${width}.png`),fullPage:false,animations:"disabled"});
      await page.getByRole('button',{name:'Exit Focus Mode',exact:true}).click();
      const green=await page.locator('.notes-writing-studio').evaluate(root=>[root,...root.querySelectorAll('*')].filter(el=>[getComputedStyle(el).color,getComputedStyle(el).backgroundColor].some(v=>{const c=v.match(/rgba?\((\d+), (\d+), (\d+)/);return c&&+c[2]>+c[1]+4&&+c[2]>+c[3]+4;})).length);
      assert.equal(green,0,'Notes controls must match warm Campaigns palette');
      await library(page);await page.reload();await page.locator('.notes-note-preview').first().waitFor();
      assert.equal(await page.locator('#notes-toggle-library').getAttribute('aria-expanded'),'true');
      await page.locator('.notes-note-preview').first().click();
      await page.getByLabel("Note title", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Formatted preview", exact: true })
        .click();
      await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({
        path: path.join(output, `notes-${width}.png`),
        fullPage: false, animations:"disabled",
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      if (width <= 900) {
        await planner(page);
        await page
          .getByRole("heading", { name: "AI Realtor Planner" })
          .waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({
          path: path.join(output, `notes-context-${width}.png`),
          fullPage: false, animations:"disabled",
        });
        await closeDrawers(page);
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
      if (width > 900) { await planner(page);
        await page
          .locator(".notes-related-task")
          .filter({ hasText: "Synthetic follow-up " + width })
          .waitFor();
        await closeDrawers(page); }
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
      await library(page);
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
    await library(edit);
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
    await library(edit);
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
    await closeDrawers(edit);
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
      .getByRole("button", { name: "Choose Template", exact: true })
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
      .getByRole("button", { name: "Choose Template", exact: true })
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
    await planner(edit);
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
    await library(page);
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
    await library(legacy);
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
    await library(legacy);
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
      fullPage: false, animations:"disabled",
    });
    await legacy.getByRole('button',{name:'Choose Template',exact:true}).click();
    await legacy.getByRole('dialog').getByRole('button',{name:'Buyer Consultation',exact:false}).click();
    await legacy.getByRole('button',{name:'Save now',exact:true}).click();await legacy.getByText('Saved',{exact:true}).waitFor();
    assert.ok(state.notes.some(n=>n.title==='Buyer Consultation'&&n.body.includes('Client goals')));
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
    await planner(mobile);
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
      fullPage: false, animations:"disabled",
    });
    await mobile.close();
    state.failLoad = true;
    const failed = await browser.newPage();
    await failed.goto(origin + "/dashboard/notes");
    await library(failed);
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
