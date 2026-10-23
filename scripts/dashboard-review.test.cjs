/* Actual dashboard components; synthetic requests only. No configured auth/database/providers. */
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright"),
  esbuild = require("esbuild"),
  postcss = require("postcss"),
  tailwind = require("@tailwindcss/postcss");
(async () => {
  const root = path.resolve(__dirname, ".."),
    adapter = path.join(__dirname, "contacts-browser"),
    phase = process.env.DASHBOARD_REVIEW_PHASE || "after";
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, "dashboard-review-entry.jsx")],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    alias: {
      "next/server": path.join(adapter, "server.jsx"),
      "next/link": path.join(adapter, "link.jsx"),
      "next/image": path.join(adapter, "image.jsx"),
      "next/navigation": path.join(adapter, "stubs.jsx"),
      "@clerk/nextjs": path.join(adapter, "stubs.jsx"),
    },
  });
  const compiled = await postcss([tailwind()]).process(
    fs.readFileSync(path.join(root, "app/globals.css"), "utf8"),
    { from: path.join(root, "app/globals.css") },
  );
  const fonts = "/tmp/myari-review-fonts",
    icons = "/workspace/work/contacts-metrics/ui-review/material-icons.ttf";
  const extra =
    (fs.existsSync(path.join(fonts, "faces.css"))
      ? fs.readFileSync(path.join(fonts, "faces.css"), "utf8")
      : "") +
    `@font-face{font-family:'Material Symbols Outlined';src:url(/review-icons.ttf)}.material-symbols-outlined{font-family:'Material Symbols Outlined'}`;
  const css =
    extra +
    compiled.css +
    ':root{--font-serif:"Cormorant Garamond",Georgia,serif;--font-inter:Inter,Arial,sans-serif}';
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    let data,
      type = "text/html";
    if (url.pathname === "/app.js") {
      data = bundle.outputFiles[0].contents;
      type = "application/javascript";
    } else if (url.pathname === "/app.css") {
      data = css;
      type = "text/css";
    } else if (url.pathname === "/review-icons.ttf") {
      data = fs.readFileSync(icons);
      type = "font/ttf";
    } else if (url.pathname.startsWith("/review-fonts/")) {
      const file = path.join(fonts, path.basename(url.pathname));
      if (fs.existsSync(file)) data = fs.readFileSync(file);
      type = "font/woff2";
    } else if (url.pathname.startsWith("/brand/")) {
      const file = path.resolve(root, "public", url.pathname.slice(1));
      if (
        file.startsWith(path.join(root, "public") + path.sep) &&
        fs.existsSync(file)
      )
        data = fs.readFileSync(file);
      type = url.pathname.endsWith(".png") ? "image/png" : "image/jpeg";
    } else
      data =
        '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
    if (!data) {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader("Content-Type", type);
    res.end(data);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port,
    output = path.join(root, "docs/dashboard-typography-review", phase);
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const results = [];
  try {
    for (const width of [1440, 1920, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1080 } });
      const errors = [],
        writes = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let mode = "populated";
      await page.route("**/api/**", async (route) => {
        const req = route.request(),
          u = new URL(req.url());
        if (req.method() !== "GET") {
          writes.push({ path: u.pathname, body: req.postData() });
          return route.fulfill({
            status: 503,
            json: { success: false, error: "Synthetic write blocked" },
          });
        }
        const json = (data) => route.fulfill({ json: data });
        const owner = await page.evaluate(() => window.__owner || "owner_a");
        const contacts =
          mode === "empty"
            ? []
            : [
                {
                  id: id(1),
                  owner_id: owner,
                  first_name: owner === "owner_a" ? "Alex" : "Jordan",
                  phone: "+15555550123",
                  type: "Active Lead",
                  budget: owner === "owner_a" ? 625000 : 880000,
                  created_at: new Date().toISOString(),
                },
                {
                  id: id(2),
                  owner_id: owner,
                  first_name: "Taylor",
                  phone: "+15555550124",
                  type: "Cold Lead",
                  created_at: new Date().toISOString(),
                },
              ];
        if (u.pathname === "/api/contacts") {
          if (mode === "error")
            return route.fulfill({
              status: 503,
              json: { success: false, error: "Private failure" },
            });
          return json({
            success: true,
            complete: true,
            contacts,
            total: contacts.length,
            filtered: contacts.length,
            counts: {
              all: contacts.length,
              coldLead: contacts.length ? 1 : 0,
              activeLead: contacts.length ? 1 : 0,
              pastClient: 0,
            },
            categories: [],
          });
        }
        if (
          u.pathname === "/api/campaigns" ||
          u.pathname === "/api/campaigns/library"
        ) {
          if (mode === "error")
            return route.fulfill({
              status: 503,
              json: { success: false, error: "Private failure" },
            });
          return json({
            success: true,
            campaigns:
              mode === "empty"
                ? []
                : [
                    {
                      id: id(10),
                      name: "Client relationship check-in",
                      status: "sending",
                      provider: "twilio",
                      created_at: "2026-10-20T10:00:00Z",
                      enrollmentCount: 7,
                      stepCount: 4,
                    },
                    {
                      id: id(11),
                      name: "Thoughtful past-client outreach",
                      status: "draft",
                      created_at: "2026-10-19T10:00:00Z",
                      enrollmentCount: 0,
                      stepCount: 3,
                    },
                  ],
          });
        }
        if (u.pathname === "/api/analytics") {
          if (mode === "error")
            return route.fulfill({
              status: 503,
              json: { success: false, error: "Private analytics failure" },
            });
          return json({
            fromLiveData: mode !== "empty",
            confirmedSentCampaigns: mode === "empty" ? 0 : 1,
            rangeLabel: "Last 30 days",
            kpis:
              mode === "empty"
                ? []
                : [
                    {
                      id: "delivery",
                      label: "Delivery success rate",
                      value: "75%",
                    },
                    {
                      id: "conversion",
                      label: "Engagement rate",
                      value: "Unavailable",
                    },
                  ],
            campaigns:
              mode === "empty"
                ? []
                : [{ id: id(10), volume: 4, contacts: 3, deliveryRate: 75 }],
          });
        }
        if (u.pathname === "/api/activity/priorities") {
          if (mode === "error")
            return route.fulfill({
              status: 503,
              json: { success: false, error: "Private failure" },
            });
          return json({
            success: true,
            timezone: "America/New_York",
            items:
              mode === "empty"
                ? []
                : [
                    {
                      id: "task:" + id(20),
                      title: "Prepare the property shortlist",
                      contact: "Alex Morgan",
                      at: new Date().toISOString(),
                      status: "Due today",
                      href: "/dashboard/contacts/" + id(1),
                    },
                    {
                      id: "task:" + id(21),
                      title: "Review the client follow-up",
                      contact: "Taylor Morgan",
                      at: new Date(Date.now() - 86400000).toISOString(),
                      status: "Overdue task",
                      href: "/dashboard/contacts/" + id(2),
                    },
                    {
                      id: "appointment:" + id(22),
                      title: "Buyer consultation",
                      contact: "Alex Morgan",
                      at: new Date(Date.now() + 86400000).toISOString(),
                      status: "Upcoming appointment",
                      href: "/dashboard/contacts/" + id(1),
                    },
                  ],
          });
        }
        if (u.pathname === "/api/settings")
          return json({
            settings: {
              profile: {
                fullName: "Alex Morgan",
                timezone: "America/New_York",
              },
              workspace: { name: "Synthetic review" },
              billing: { subscriptionStatus: "none" },
              team: [],
            },
            email: "review@example.test",
          });
        if (u.pathname === "/api/health") return json({ status: "ok" });
        if (u.pathname === "/api/integrations/status")
          return json({ claude: { configured: false } });
        return json({ entries: [], settings: {}, success: true });
      });
      await page.goto(origin + "/dashboard");
      await page
        .getByRole("heading", { name: "Your business. Beautifully in motion." })
        .waitFor();
      await page
        .locator(".dashboard-luxury-kpi-value")
        .first()
        .filter({ hasText: "2" })
        .waitFor();
      await page
        .locator("a:visible")
        .filter({ hasText: "Client relationship check-in" })
        .first()
        .waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: path.join(output, `dashboard-${width}.png`),
        fullPage: true,
      });
      const measured = await page.evaluate(() => ({
        hero: document
          .querySelector(".dashboard-luxury-hero")
          .getBoundingClientRect().height,
        headline: parseFloat(
          getComputedStyle(document.querySelector(".dashboard-luxury-hero h1"))
            .fontSize,
        ),
        description: parseFloat(
          getComputedStyle(
            document.querySelector(".dashboard-luxury-hero-description"),
          ).fontSize,
        ),
        kpi: parseFloat(
          getComputedStyle(
            document.querySelector(".dashboard-luxury-kpi-value"),
          ).fontSize,
        ),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      assert.equal(measured.overflow, false);
      assert.equal(
        await page
          .getByRole("link", { name: /Create a campaign/ })
          .first()
          .getAttribute("href"),
        "/dashboard/campaigns#campaign-builder",
      );
      assert.equal(
        await page
          .getByRole("link", { name: /View agenda/ })
          .first()
          .getAttribute("href"),
        "/dashboard/calendar",
      );
      assert.equal(
        await page
          .getByRole("link", { name: /Opportunities/ })
          .getAttribute("href"),
        "/dashboard/contacts?segment=active-lead",
      );
      assert.ok(
        await page.locator('a[href="/dashboard/analytics?range=30d"]').count(),
      );
      if (phase === "after") {
        assert.ok(width < 1024 || measured.hero <= 306);
        assert.ok(
          width < 768 || (measured.headline >= 38 && measured.headline <= 42),
        );
        assert.ok(measured.kpi >= 28 && measured.kpi <= 32);
        assert.ok(measured.description >= 15);
        if (width >= 768)
          assert.equal(
            await page.getByText("7", { exact: true }).isVisible(),
            true,
          );
        else assert.equal(await page.getByText(/7 contacts/).isVisible(), true);
        assert.equal(
          await page
            .getByRole("link", { name: "Total Contacts — view Contacts" })
            .getAttribute("href"),
          "/dashboard/contacts?segment=all",
        );
        assert.equal(
          await page
            .getByRole("link", {
              name: "Campaigns Sent — view all-time analytics",
            })
            .getAttribute("href"),
          "/dashboard/analytics?range=all",
        );
        if (width >= 768) {
          await page
            .locator(".dashboard-campaign-row")
            .first()
            .locator("td")
            .nth(2)
            .click();
          assert.equal(
            new URL(page.url()).pathname,
            "/dashboard/campaigns/" + id(10),
          );
          await page.goto(origin + "/dashboard");
          await page
            .locator("a:visible")
            .filter({ hasText: "Client relationship check-in" })
            .first()
            .waitFor();
        }
        await page.locator(".dashboard-recommendation").first().click();
        await page
          .getByRole("alert")
          .filter({ hasText: /playbook/i })
          .waitFor();
        assert.equal(writes.length, 1);
        assert.ok(writes[0].path.includes("from-template"));
      }
      if (phase === "after" && width === 1440) {
        await page.evaluate(() => {
          window.__owner = "owner_b";
          window.dispatchEvent(new Event("review:auth"));
        });
        await page
          .locator(".dashboard-luxury-kpi-value")
          .filter({ hasText: "$880K" })
          .waitFor();
        mode = "empty";
        await page.reload();
        await page.getByText("No campaigns yet.", { exact: true }).waitFor();
        await page.getByText(/No overdue or due-today tasks/).waitFor();
        await page.screenshot({
          path: path.join(output, "empty-1440.png"),
          fullPage: true,
        });
        mode = "error";
        await page.reload();
        await page
          .getByText("Campaigns could not be loaded.", { exact: true })
          .waitFor();
        assert.equal(
          await page.getByText("No campaigns yet.", { exact: true }).count(),
          0,
        );
        assert.equal(
          (
            await page.locator(".dashboard-luxury-kpi-value").allTextContents()
          ).filter((v) => v === "—").length,
          4,
        );
        await page.screenshot({
          path: path.join(output, "error-1440.png"),
          fullPage: true,
        });
      }
      assert.deepEqual(errors, []);
      results.push({
        width,
        ...measured,
        errors,
        writesBlocked: writes.length,
      });
      await page.close();
    }
    fs.writeFileSync(
      path.join(output, "checks.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
