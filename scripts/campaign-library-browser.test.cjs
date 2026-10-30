/* Browser-only fixtures; requires installed playwright, esbuild and Chromium. Never contacts a live backend. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const os = require("node:os");
const { chromium } = require("playwright");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "..");

(async () => {
  const fixture = path.join(__dirname, "campaigns-browser");
  const adapters = path.join(__dirname, "contacts-browser");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "myari-campaigns-"));
  const result = await esbuild.build({
    entryPoints: [path.join(fixture, "entry.jsx")],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
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
      ? `@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:400;src:url(/review-icons.ttf) format('truetype')}.material-symbols-outlined{font-family:'Material Symbols Outlined'}`
      : "") +
    fs
      .readdirSync(cssRoot)
      .filter((file) => file.endsWith(".css"))
      .map((file) =>
        fs
          .readFileSync(path.join(cssRoot, file), "utf8")
          .replaceAll("../media/", "/review-fonts/")
          .replaceAll("/_next/static/media/", "/review-fonts/"),
      )
      .join("\n");
  const fontClasses = [
    ...css.matchAll(/\.([\w-]+)\{--font-(?:serif|inter|hand):[^}]+\}/g),
  ]
    .map((match) => match[1])
    .join(" ");
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pathname =
      url.pathname === "/_next/image"
        ? url.searchParams.get("url")
        : url.pathname;
    if (pathname === "/favicon.ico") {
      res.writeHead(204);
      return res.end();
    }
    if (pathname === "/review-icons.ttf" && iconFont) {
      res.setHeader("content-type", "font/ttf");
      return res.end(fs.readFileSync(iconFont));
    }
    if (pathname === "/bundle.js") {
      res.setHeader("content-type", "application/javascript");
      return res.end(result.outputFiles[0].text);
    }
    if (pathname === "/style.css") {
      res.setHeader("content-type", "text/css");
      return res.end(css);
    }
    if (pathname.startsWith("/dashboard")) {
      res.setHeader("content-type", "text/html");
      return res.end(
        '<!doctype html><html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="' +
          fontClasses +
          '"><div id="root"></div><script src="/bundle.js"></script></body></html>',
      );
    }
    const file = pathname.startsWith("/review-fonts/")
      ? path.join(root, ".next/static/media", path.basename(pathname))
      : path.resolve(root, "public", "." + pathname);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    try {
      res.end(fs.readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const results = [];
  try {
    for (const width of [1440, 1920, 768, 390]) {
      const page = await browser.newPage({
        viewport: { width, height: 1086 },
        deviceScaleFactor: 1,
      });
      const errors = [];
      page.setDefaultTimeout(12000);
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
      });
      console.log("Checking viewport", width);
      await page.goto(base + "/dashboard/campaigns?status=active");
      await page.waitForFunction(() => document.querySelectorAll(".cl-card").length === 1);
      assert.equal(await page.getByLabel("Campaign status", {exact:true}).inputValue(), "active");
      await page.goto(base + "/dashboard/campaigns");
      await page
        .getByRole("heading", {
          name: "Stay connected. Stay top of mind.",
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("heading", { name: "Your campaigns (8)", exact: true })
        .waitFor();
      assert.equal(
        await page
          .locator(".cl-kpi strong")
          .allTextContents()
          .then((v) => v.join(",")),
        "8,1,3,1",
      );
      assert.equal(await page.locator(".cl-card").count(), 8);
      assert.equal(
        await page.locator(".cl-hero img").getAttribute("src"),
        "/brand/heroes/campaign-library-interior.png",
      );
      await page.getByRole("button", { name: "Preview Buyer Nurture QA", exact: true }).click();
      await page.getByRole("tab", { name: "Sequence", exact: true }).click();
      await page.getByRole("link", { name: "Edit email", exact: true }).first().click();
      const emailEditor = page.getByRole("dialog", { name: "Edit sequence step", exact: true });
      await emailEditor.getByRole("textbox", { name: "Email subject", exact: true }).waitFor();
      assert.equal(await page.locator(".cl-drawer").count(), 0);
      assert.equal(await emailEditor.getByRole("textbox", { name: "Email subject", exact: true }).inputValue(), "Your next home");
      await emailEditor.getByRole("textbox", { name: "Email subject", exact: true }).fill("Updated buyer introduction");
      await emailEditor.getByRole("textbox", { name: "Email body", exact: true }).fill("Hello {{first_name}}, this is my updated email.");
      await page.screenshot({ path: path.join(tmp, `email-editor-${width}.png`), fullPage: false });
      await emailEditor.getByRole("button", { name: "Save step", exact: true }).click();
      assert.equal(await emailEditor.count(), 0);
      await page.getByRole("button", { name: "Preview personalized messages", exact: true }).click();
      const editedPreview = page.getByRole("dialog", { name: "Personalized message preview", exact: true });
      await editedPreview.getByLabel("Preview for contact").selectOption("00000000-0000-4000-8000-000000000500");
      await editedPreview.getByRole("button", { name: "Preview messages", exact: true }).click();
      await editedPreview.getByText("Subject: Updated buyer introduction", { exact: true }).waitFor();
      await page.keyboard.press("Escape");
      await page.goto(base + "/dashboard/campaigns");
      const covers = await page
        .locator(".cl-card .cl-cover-tile")
        .evaluateAll((nodes) =>
          nodes.map(
            (n) => n.style.backgroundImage + n.style.backgroundPosition,
          ),
        );
      assert.equal(new Set(covers).size, 8);
      await page.screenshot({
        path: path.join(tmp, `campaigns-${width}.png`),
        fullPage: false,
      });
      await page.screenshot({
        path: path.join(tmp, `campaigns-full-${width}.png`),
        fullPage: true,
      });
      const search = page.getByRole("searchbox", { name: "Search campaigns" });
      await search.fill("Nurture");
      assert.equal(await page.locator(".cl-card").count(), 1);
      assert.equal(
        await page.locator(".cl-kpi strong").first().textContent(),
        "1",
      );
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await page
        .getByLabel("Campaign status", { exact: true })
        .selectOption("draft");
      assert.equal(await page.locator(".cl-card").count(), 3);
      await page
        .getByLabel("Campaign channel", { exact: true })
        .selectOption("email");
      assert.equal(await page.locator(".cl-card").count(), 3);
      await search.fill("Anniversary");
      await page.getByText("No campaigns match", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await page
        .getByLabel("Campaign goal", { exact: true })
        .selectOption("Nurture relationships");
      assert.equal(await page.locator(".cl-card").count(), 2);
      await page
        .getByLabel("Campaign audience", { exact: true })
        .selectOption("Buyers");
      assert.equal(await page.locator(".cl-card").count(), 1);
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await page
        .getByLabel("Campaign sort", { exact: true })
        .selectOption("name");
      assert.equal(
        await page.locator(".cl-card h3").first().textContent(),
        "Anniversary QA",
      );
      await page
        .getByRole("button", { name: "List view", exact: true })
        .click();
      assert.equal(await page.locator(".cl-card-list").count(), 8);
      await page
        .getByRole("button", { name: "Grid view", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Pin Residential Outreach QA",
          exact: true,
        })
        .click();
      assert.equal(await page.locator(".cl-pinned .cl-card").count(), 1);
      await page.reload();
      await page
        .getByRole("button", {
          name: "Unpin Residential Outreach QA",
          exact: true,
        })
        .waitFor();
      assert.equal(await page.locator(".cl-card").count(), 8);
      await page
        .getByRole("button", {
          name: "Unpin Residential Outreach QA",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: "Preview Residential Outreach QA",
          exact: true,
        })
        .click();
      const drawer = page.getByRole("dialog", {
        name: "Residential Outreach QA",
        exact: true,
      });
      await drawer
        .getByText("A description is not available for this campaign.", {
          exact: true,
        })
        .waitFor();
      await page.screenshot({
        path: path.join(tmp, `campaign-overview-${width}.png`),
        fullPage: false,
      });
      await drawer.getByRole("tab", { name: "Sequence", exact: true }).click();
      await drawer
        .getByRole("heading", { name: "Market introduction", exact: true })
        .waitFor();
      const testTrigger = drawer.getByRole("button", { name: "Test Voice Script", exact: true });
      await testTrigger.click();
      const voiceDialog = page.getByRole("dialog", { name: "Test Voice Script", exact: true });
      await voiceDialog.waitFor();
      assert.equal(await voiceDialog.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.right - 25, r.top + 25));
      }), true, "Voice dialog must be above campaign drawer");
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        assert.equal(await voiceDialog.evaluate(el => el.contains(document.activeElement)), true);
      }
      await page.keyboard.press("Escape");
      await voiceDialog.waitFor({ state: "detached" });
      assert.equal(await drawer.isVisible(), true);
      assert.equal(await testTrigger.evaluate(el => document.activeElement === el), true);
      assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
      await drawer.locator("summary").first().click();
      await drawer.getByText(/Hello.*saved message/).waitFor();
      await page.screenshot({
        path: path.join(tmp, `campaign-sequence-${width}.png`),
        fullPage: false,
      });
      await drawer.getByRole("tab", { name: "Contacts", exact: true }).click();
      assert.equal(
        await drawer
          .getByRole("link", { name: "Actual Fixture Client", exact: true })
          .getAttribute("href"),
        "/dashboard/contacts/00000000-0000-4000-8000-000000000500",
      );
      await drawer
        .getByText(/Oct|10\/30/)
        .first()
        .waitFor();
      assert.equal(
        await drawer
          .getByRole("link", { name: "Open full campaign", exact: true })
          .getAttribute("href"),
        "/dashboard/campaigns/00000000-0000-4000-8000-000000000001",
      );
      assert.equal(
        await drawer
          .getByRole("link", { name: "Edit", exact: true })
          .getAttribute("href"),
        "/dashboard/campaigns?edit=00000000-0000-4000-8000-000000000001#campaign-builder",
      );
      await drawer
        .getByRole("tab", { name: "Performance", exact: true })
        .click();
      assert.deepEqual(
        await drawer.locator(".cl-performance dd").allTextContents(),
        ["1", "1", "1", "0", "0"],
      );
      await drawer.getByRole("button", { name: "Pause", exact: true }).click();
      await drawer
        .getByRole("heading", { name: "Pause live delivery?", exact: true })
        .waitFor();
      await drawer.getByRole("button", { name: "Cancel", exact: true }).click();
      assert.deepEqual(await page.evaluate(() => window.__forbidden), []);
      await page.screenshot({
        path: path.join(tmp, `campaign-preview-${width}.png`),
        fullPage: false,
      });
      await drawer.getByRole("tab", { name: "Overview", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await drawer
          .getByRole("tab", { name: "Sequence", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(
        await page
          .getByRole("button", {
            name: "Preview Residential Outreach QA",
            exact: true,
          })
          .evaluate((el) => el === document.activeElement),
        true,
      );
      await search.fill("Residential");
      const opener = page.getByRole("button", {
        name: "Preview Residential Outreach QA",
        exact: true,
      });
      await opener.scrollIntoViewIfNeeded();
      const beforeScroll = await page.evaluate(() => scrollY);
      await opener.click();
      await drawer
        .getByText("A description is not available for this campaign.", {
          exact: true,
        })
        .waitFor();
      await page.keyboard.press("Escape");
      assert.equal(await search.inputValue(), "Residential");
      assert.ok(
        Math.abs((await page.evaluate(() => scrollY)) - beforeScroll) < 2,
      );
      await page
        .getByRole("button", {
          name: "Preview Residential Outreach QA",
          exact: true,
        })
        .click();
      await drawer
        .getByText("A description is not available for this campaign.", {
          exact: true,
        })
        .waitFor();
      await drawer
        .getByRole("button", { name: "Duplicate", exact: true })
        .click();
      await page
        .getByText("Draft saved. No contacts enrolled or messages scheduled.", {
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("button", {
          name: "Preview Residential Outreach QA (copy)",
          exact: true,
        })
        .waitFor();
      const saved = await page.evaluate(
        () =>
          window.__requests
            .filter((r) => r.path === "/api/campaigns/builder")
            .at(-1).body,
      );
      assert.equal(saved.action, "template");
      assert.equal(saved.campaign.provider, "mock");
      assert.ok(!saved.contactIds);
      await page
        .getByRole("button", { name: "Import campaign", exact: true })
        .click();
      let modal = page.getByRole("dialog", {
        name: "Import campaign",
        exact: true,
      });
      await modal.getByLabel("Campaign JSON", { exact: true }).fill("{bad");
      await modal
        .getByRole("button", { name: "Import as draft", exact: true })
        .click();
      await modal.getByText(/Unable to import/).waitFor();
      await modal.getByLabel("Campaign JSON", { exact: true }).fill(
        JSON.stringify({
          name: "Imported QA",
          steps: [
            {
              id: "step1",
              order: 1,
              type: "email",
              title: "Subject",
              description: "Message",
              delayMinutes: 0,
            },
          ],
        }),
      );
      await modal
        .getByLabel("Campaign JSON file", { exact: true })
        .setInputFiles({
          name: "campaign.json",
          mimeType: "application/json",
          buffer: Buffer.from(
            await modal
              .getByLabel("Campaign JSON", { exact: true })
              .inputValue(),
          ),
        });
      await modal
        .getByRole("button", { name: "Import as draft", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Preview Imported QA", exact: true })
        .waitFor();
      await page.getByRole("button", { name: /Templates \(11\)/ }).click();
      assert.equal(await page.locator(".cl-card").count(), 11);
      await search.fill("Valuation");
      assert.equal(await page.locator(".cl-card").count(), 1);
      await page
        .getByRole("button", { name: "List view", exact: true })
        .click();
      assert.equal(await page.locator(".cl-card").count(), 1);
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await page.getByRole("button", { name: /Shared with me/ }).click();
      await page.getByText("No shared campaigns", { exact: true }).waitFor();
      await page.getByRole("button", { name: /Recommended \(6\)/ }).click();
      assert.equal(await page.locator(".cl-card").count(), 6);
      await page.locator(".cl-card-open").first().click();
      await page.getByRole("tab", { name: "Sequence", exact: true }).click();
      assert.ok((await page.locator(".cl-timeline li").count()) > 0);
      await page
        .getByRole("button", { name: "Install as draft", exact: true })
        .click();
      await page
        .getByText(
          "Playbook available as a draft. No automation was activated.",
          { exact: true },
        )
        .waitFor();
      await page.evaluate(() => {
        window.__malformedLibrary = true;
        window.dispatchEvent(new Event("myari:campaigns-changed"));
      });
      await page
        .getByText("Campaign library unavailable", { exact: true })
        .waitFor();
      await page.evaluate(() => (window.__malformedLibrary = false));
      await page
        .getByRole("button", { name: "Retry library", exact: true })
        .click();
      await page.locator(".cl-card-open").first().waitFor();
      await page.evaluate(() => (window.__failPreview = true));
      await page.locator(".cl-card-open").first().click();
      await page.getByText("Preview unavailable", { exact: true }).waitFor();
      assert.ok(
        !(await page.locator("body").innerText()).includes("private database"),
      );
      await page.evaluate(() => (window.__failPreview = false));
      await page
        .getByRole("button", { name: "Retry preview", exact: true })
        .click();
      await page.getByRole("tab", { name: "Overview", exact: true }).click();
      await page.locator(".cl-preview-cover").waitFor();
      await page.keyboard.press("Escape");
      await page.evaluate(() => window.__setOwner("owner_b"));
      await page
        .getByRole("button", {
          name: "Preview Separate Subscriber Private Campaign",
          exact: true,
        })
        .waitFor();
      assert.equal(await page.locator(".cl-card").count(), 1);
      assert.equal(await page.locator(".cl-pinned").count(), 0);
      await page.evaluate(() => window.__setOwner("owner_a"));
      await page
        .getByRole("button", { name: "Preview Imported QA", exact: true })
        .waitFor();
      await page.evaluate(() => {
        window.__failLibrary = true;
        window.dispatchEvent(new Event("myari:campaigns-changed"));
      });
      await page
        .getByText("Campaign library unavailable", { exact: true })
        .waitFor();
      assert.equal(
        await page.locator(".cl-kpi strong").first().textContent(),
        "—",
      );
      await page.evaluate(() => (window.__failLibrary = false));
      await page
        .getByRole("button", { name: "Retry library", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Preview Imported QA", exact: true })
        .waitFor();
      await page.evaluate(() => {
        window.__empty = true;
        window.dispatchEvent(new Event("myari:campaigns-changed"));
      });
      await page
        .getByText("Your next conversation starts here", { exact: true })
        .waitFor();
      assert.equal(
        await page.locator(".cl-kpi strong").first().textContent(),
        "0",
      );
      await page.evaluate(() => {
        window.__empty = false;
        window.dispatchEvent(new Event("myari:campaigns-changed"));
      });
      await page
        .getByRole("button", { name: "Preview Imported QA", exact: true })
        .waitFor();
      await page.getByRole("link", { name: /Build custom/ }).click();
      await page
        .getByRole("textbox", { name: "Campaign name", exact: true })
        .waitFor();
      assert.equal(
        await page.locator("#campaign-builder").getAttribute("open"),
        "",
      );
      await page
        .getByRole("textbox", { name: "Campaign name", exact: true })
        .fill("Custom Builder QA");
      await page
        .getByRole("button", { name: /Add step/ })
        .first()
        .click();
      const stepModal = page.getByRole("dialog", {
        name: "Add automation step",
        exact: true,
      });
      await stepModal
        .getByPlaceholder("e.g. Follow-up email")
        .fill("QA email subject");
      await stepModal.locator("textarea").fill("Hi {{first_name}}, would you like to discuss your home search? Reply whenever convenient.");
      await stepModal
        .getByRole("button", { name: "Add to sequence", exact: true })
        .click();
      await page.getByRole("button", { name: "Preview personalized messages", exact: true }).click();
      const personalized = page.getByRole("dialog", { name: "Personalized message preview", exact: true });
      await personalized.getByLabel("Preview for contact").selectOption("00000000-0000-4000-8000-000000000500");
      await personalized.getByRole("button", { name: "Preview messages", exact: true }).click();
      await personalized.getByText("Subject: QA email subject", { exact: true }).waitFor();
      await personalized.getByText("Hi Actual, would you like to discuss your home search? Reply whenever convenient.", { exact: true }).waitFor();
      await page.screenshot({ path: path.join(tmp, `personalized-message-${width}.png`), fullPage: false });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: /Save as template/ }).click();
      await page
        .getByRole("button", { name: "Preview Custom Builder QA", exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(await page.evaluate(() => window.__forbidden), []);
      results.push({
        width,
        hero: true,
        realFixtureCounts: true,
        uniqueCovers: true,
        combinedFilters: true,
        sortAndGridList: true,
        pinsPersist: true,
        drawerTabsAndKeyboard: true,
        realSequenceContactsPerformance: true,
        confirmationWithoutExecution: true,
        simulationDraftImportDuplicate: true,
        existingCustomBuilder: true,
        personalizedMessagePreview: true,
        templatePreview: true,
        tenantIsolation: true,
        errorAndEmpty: true,
        noOverflow: true,
        pageErrors: errors,
      });
      await page.close();
    }
    const savedEmailPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await savedEmailPage.goto(base + "/dashboard/campaigns");
    await savedEmailPage.getByRole("button", { name: "Preview Buyer Nurture QA", exact: true }).click();
    await savedEmailPage.getByRole("tab", { name: "Sequence", exact: true }).click();
    await savedEmailPage.getByRole("link", { name: "Edit email", exact: true }).first().click();
    const savedEditor = savedEmailPage.getByRole("dialog", { name: "Edit sequence step", exact: true });
    await savedEditor.getByRole("textbox", { name: "Email subject", exact: true }).fill("Persisted email subject");
    await savedEditor.getByRole("textbox", { name: "Email body", exact: true }).fill("Hello {{first_name}}, saved email body.");
    await savedEditor.getByRole("button", { name: "Save step", exact: true }).click();
    await savedEmailPage.getByRole("button", { name: "Save as template", exact: true }).click();
    await savedEmailPage.waitForFunction(() => !!window.__lastBuilderRequest);
    const payload = await savedEmailPage.evaluate(() => window.__lastBuilderRequest);
    assert.equal(payload.action, "template");
    assert.equal(payload.contactIds, undefined);
    assert.equal(payload.enrollAllEligible, undefined);
    assert.equal(payload.campaign.steps[0].description, "Subject: Persisted email subject\n\nHello {{first_name}}, saved email body.");
    await savedEmailPage.waitForFunction(() => Object.values(window.__steps).some(steps => steps.some(step => step.description.includes("Persisted email subject"))));
    await savedEmailPage.reload();
    await savedEmailPage.waitForFunction(() => Object.values(window.__steps).some(steps => steps.some(step => step.description.includes("Persisted email subject"))));
    assert.deepEqual(await savedEmailPage.evaluate(() => window.__forbidden), []);
    await savedEmailPage.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  fs.writeFileSync(
    path.join(tmp, "browser-results.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify({ artifacts: tmp, results }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
