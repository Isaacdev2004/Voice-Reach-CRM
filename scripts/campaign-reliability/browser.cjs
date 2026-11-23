const fs = require("node:fs"),
  http = require("node:http"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require(
  process.env.MYARI_PLAYWRIGHT_MODULE || "playwright-core",
);
const esbuild = require("esbuild");
(async () => {
  const root = process.cwd(),
    fixture = path.join(root, "scripts/campaign-reliability"),
    adapters = path.join(root, "scripts/contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [path.join(fixture, "entry.jsx")],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    alias: {
      "next/server": path.join(adapters, "server.jsx"),
      "next/navigation": path.join(fixture, "stubs.jsx"),
      "@clerk/nextjs": path.join(fixture, "stubs.jsx"),
      "next/link": path.join(adapters, "link.jsx"),
      "next/image": path.join(adapters, "image.jsx"),
    },
    define: { "process.env.NODE_ENV": '"development"' },
  });
  const css =
    fs
      .readdirSync(path.join(root, ".next/static/css"))
      .filter((x) => x.endsWith(".css"))
      .map((x) =>
        fs.readFileSync(path.join(root, ".next/static/css", x), "utf8"),
      )
      .join("\n") +
    `@font-face{font-family:'Material Symbols Outlined';font-weight:400;src:url('/qa-icons.ttf') format('truetype')}.material-symbols-outlined{font-family:'Material Symbols Outlined';font-feature-settings:'liga'}`;
  const server = http.createServer((req, res) => {
    if (req.url === "/qa-icons.ttf") {
      res.setHeader("Content-Type", "font/ttf");
      return res.end(
        fs.existsSync(
          process.env.CAMPAIGN_ICON_FONT || "/tmp/campaign-icons.ttf",
        )
          ? fs.readFileSync(
              process.env.CAMPAIGN_ICON_FONT || "/tmp/campaign-icons.ttf",
            )
          : Buffer.alloc(0),
      );
    }
    if (req.url === "/bundle.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(bundle.outputFiles[0].text);
    } else if (req.url === "/style.css") {
      res.setHeader("Content-Type", "text/css");
      res.end(css);
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      );
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      headless: true,
      args: ["--no-sandbox"],
    }),
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let checks = 0;
  const ok = (v) => {
      assert(v);
      checks++;
    },
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.route("**/*", (route) =>
    route.request().url().startsWith(origin) ? route.continue() : route.abort(),
  );
  try {
    await page.goto(origin + "/dashboard/campaigns");
    page.setDefaultTimeout(10000);
    await page
      .getByRole("button", { name: /Save Draft/ })
      .first()
      .waitFor({ state: "visible" });
    await page.waitForFunction(
      () => !document.querySelector("fieldset").disabled,
    );
    await page
      .getByLabel("Campaign name", { exact: true })
      .fill("Commercial preserved");
    await page
      .getByLabel("Campaign description", { exact: true })
      .fill("Hour of work — synthetic recovery test");
    await page.waitForFunction(() =>
      Object.values(JSON.parse(localStorage.getItem("qa-server") || "{}")).some(
        (x) =>
          x.snapshot.description === "Hour of work — synthetic recovery test",
      ),
    );
    ok((await page.getByRole("status").textContent()) === "Saved");
    const url = page.url();
    ok(url.includes("edit="));
    await page.reload();
    await page.waitForFunction(
      () =>
        document.querySelector('input[aria-label="Campaign name"]').value ===
        "Commercial preserved",
    );
    checks++;
    await page.evaluate(() => (window.__mode = "offline"));
    await page
      .getByLabel("Campaign description", { exact: true })
      .fill("Network failure must retain text");
    await page.waitForFunction(
      () =>
        document.querySelector('[role="status"]').textContent === "Save Failed",
    );
    ok(
      (await page
        .getByLabel("Campaign description", { exact: true })
        .inputValue()) === "Network failure must retain text",
    );
    ok(
      await page.evaluate(() =>
        Object.entries(localStorage).some(
          ([k, v]) =>
            k.startsWith("myari:campaign-draft:synthetic-A") &&
            v.includes("Network failure must retain text"),
        ),
      ),
    );
    let warned = false;
    page.once("dialog", async (dialog) => {
      warned = true;
      await dialog.dismiss();
    });
    await page.evaluate(() => {
      const a = document.createElement("a");
      a.href = "/dashboard";
      document.body.append(a);
      a.click();
      a.remove();
    });
    ok(warned);
    await page.evaluate(() => (window.__mode = "ok"));
    await page.getByRole("button", { name: "Retry Save Draft" }).click();
    await page.waitForFunction(
      () => document.querySelector('[role="status"]').textContent === "Saved",
    );
    checks++;
    await page.getByRole("button", { name: /Version history/ }).click();
    await page.getByRole("button", { name: /Version 1 ·/ }).click();
    await page.getByText("Compare saved version with current draft").waitFor();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Restore as new revision" }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('textarea[aria-label="Campaign description"]')
          .value === "Hour of work — synthetic recovery test",
    );
    await page.waitForFunction(
      () => document.querySelector('[role="status"]').textContent === "Saved",
    );
    checks++;
    await page.evaluate(() => (window.__mode = "conflict"));
    await page
      .getByLabel("Campaign name", { exact: true })
      .fill("Concurrent unsaved draft");
    await page.waitForFunction(
      () =>
        document.querySelector('[role="status"]').textContent === "Save Failed",
    );
    ok(
      (await page.getByLabel("Campaign name", { exact: true }).inputValue()) ===
        "Concurrent unsaved draft",
    );
    await page.screenshot({
      path: path.join(
        root,
        "docs/campaign-reliability/save-failed-desktop.png",
      ),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(root, "docs/campaign-reliability/save-failed-mobile.png"),
      fullPage: true,
    });
    await page.evaluate(() => {
      window.__mode = "ok";
      window.__owner = "synthetic-B";
      window.dispatchEvent(new Event("review:auth"));
    });
    await page.waitForTimeout(350);
    ok(
      !(
        await page
          .getByRole("button", { name: /Version history/ })
          .textContent()
      ).includes("(3)"),
    );
    await page.goto(origin + "/dashboard/campaigns");
    await page.waitForFunction(
      () => !document.querySelector("fieldset").disabled,
    );
    await page
      .getByLabel("Campaign name", { exact: true })
      .fill("Activation synthetic");
    await page.getByRole("button", { name: /Add step/ }).click();
    await page
      .getByRole("dialog")
      .locator("textarea")
      .fill(
        "Subject: Synthetic test only\nHello {{first_name}}, reviewed draft.",
      );
    await page.getByRole("button", { name: "Add to sequence" }).click();
    await page.waitForFunction(
      () => document.querySelector('[role="status"]').textContent === "Saved",
    );
    await page.evaluate(() => {
      window.__mode = "invalid";
      window.__requests = [];
    });
    await page
      .getByLabel("Campaign name", { exact: true })
      .fill("Latest edits before activation");
    await page.getByRole("button", { name: /Activate campaign/ }).click();
    await page.getByLabel(/All eligible/).check();
    await page.getByRole("button", { name: "Activate now" }).click();
    await page
      .getByText("Synthetic activation validation failed", { exact: true })
      .waitFor();
    ok(
      (await page.getByLabel("Campaign name", { exact: true }).inputValue()) ===
        "Latest edits before activation",
    );
    const activationRequests = await page.evaluate(() => window.__requests);
    const ai = activationRequests.findIndex(
      (x) => x.path === "/api/campaigns/builder",
    );
    ok(
      ai > 0 &&
        activationRequests
          .slice(0, ai)
          .some(
            (x) => x.path === "/api/campaigns/drafts" && x.method === "POST",
          ),
    );
    ok(
      activationRequests[ai].body.savedRevision > 0 &&
        !!activationRequests[ai].body.activationKey,
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel" })
      .click();
    await page.evaluate(() => (window.__mode = "expired"));
    await page
      .getByLabel("Campaign description", { exact: true })
      .fill("Expired session must preserve this copy");
    await page.waitForFunction(
      () =>
        document.querySelector('[role="status"]').textContent === "Save Failed",
    );
    ok(
      (await page
        .getByLabel("Campaign description", { exact: true })
        .inputValue()) === "Expired session must preserve this copy",
    );
    ok(
      await page.evaluate(() => {
        const e = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(e);
        return e.defaultPrevented;
      }),
    );
    await page.evaluate(() => (window.__mode = "ok"));
    await page.getByRole("button", { name: "Retry Save Draft" }).click();
    await page.waitForFunction(
      () => document.querySelector('[role="status"]').textContent === "Saved",
    );
    await page.evaluate(() => (window.__delay = 1400));
    await page
      .getByLabel("Campaign description", { exact: true })
      .fill("Rapid edit one");
    await page.waitForTimeout(1300);
    await page
      .getByLabel("Campaign description", { exact: true })
      .fill("Rapid edit two — newest");
    await page.waitForFunction(
      () => document.querySelector('[role="status"]').textContent === "Saved",
    );
    ok(
      await page.evaluate(() =>
        Object.values(JSON.parse(localStorage.getItem("qa-server"))).some(
          (x) => x.snapshot.description === "Rapid edit two — newest",
        ),
      ),
    );
    await page.getByRole("button", { name: "Edit copy", exact: true }).click();
    await page
      .getByRole("dialog")
      .locator("textarea")
      .fill("Modal typing is saved before Done");
    await page.waitForFunction(() =>
      Object.values(JSON.parse(localStorage.getItem("qa-server"))).some((x) =>
        x.snapshot.steps.some(
          (s) => s.description === "Modal typing is saved before Done",
        ),
      ),
    );
    await page.keyboard.press("Escape");
    ok(
      await page.evaluate(() =>
        Object.values(JSON.parse(localStorage.getItem("qa-server"))).some((x) =>
          x.snapshot.steps.some(
            (s) => s.description === "Modal typing is saved before Done",
          ),
        ),
      ),
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: path.join(root, "docs/campaign-reliability/saved-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(root, "docs/campaign-reliability/saved-mobile.png"),
      fullPage: true,
    });
    ok(errors.length === 0);
    console.log(
      `PASS ${checks} browser assertions: autosave, refresh restoration, failed requests, local recovery, navigation warning, retry, version restore, conflict preservation; actual editor + synthetic API. No hosted authentication or outbound delivery.`,
    );
  } catch (error) {
    console.error("Browser errors:", errors);
    console.error((await page.locator("body").innerText()).slice(0, 1200));
    throw error;
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
