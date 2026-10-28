/* Actual components; all API calls intercepted with synthetic fixtures. Not hosted acceptance. */
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict"),
  esbuild = require("esbuild"),
  { chromium } = require("playwright");
(async () => {
  const root = path.resolve(__dirname, ".."),
    out = path.join(root, "docs/campaign-workspace/previews");
  fs.mkdirSync(out, { recursive: true });
  const fixture = path.join(__dirname, "contacts-browser");
  const built = await esbuild.build({
    entryPoints: [path.join(__dirname, "campaign-workspace/entry.jsx")],
    outdir: "/tmp/cw-browser-fixture",
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    define: { "process.env.NODE_ENV": '"development"' },
    alias: {
      "next/server": path.join(fixture, "server.jsx"),
      "next/link": path.join(fixture, "link.jsx"),
      "next/navigation": path.join(fixture, "stubs.jsx"),
      "@clerk/nextjs": path.join(fixture, "stubs.jsx"),
    },
  });
  const js = built.outputFiles.find((f) => f.path.endsWith(".js")).text,
    css =
      built.outputFiles
        .filter((f) => f.path.endsWith(".css"))
        .map((f) => f.text)
        .join("\n") +
      "\n" +
      fs
        .readdirSync(path.join(root, ".next/static/css"))
        .filter((f) => f.endsWith(".css"))
        .map((f) =>
          fs.readFileSync(path.join(root, ".next/static/css", f), "utf8"),
        )
        .join("\n");
  const server = http.createServer((req, res) => {
    if (req.url === "/app.js") {
      res.setHeader("content-type", "text/javascript");
      return res.end(js);
    }
    res.setHeader("content-type", "text/html");
    res.end(
      `<!doctype html><html lang="en"><head><title>MyARI campaign studio synthetic acceptance</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css} .fixture-navigation{position:fixed;inset:0 auto 0 0;width:256px;background:#faf5ed;padding:32px;display:flex;flex-direction:column;gap:18px;border-right:1px solid #dfd2bf}.fixture-navigation h2{font:38px Georgia;color:#92643e}.fixture-toolbar{position:fixed;top:0;left:256px;right:0;height:64px;background:#fffdf9;padding:18px 24px;border-bottom:1px solid #dfd2bf}.fixture-library{margin:100px 40px 0 280px;width:330px}@media(max-width:1023px){.fixture-navigation{display:none}.fixture-toolbar{left:0;height:60px}.fixture-library{margin-left:20px}}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`,
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`,
    browser = await chromium.launch({
      headless: true,
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
  let checks = 0;
  const results = [];
  try {
    for (const width of [1440, 1280, 768, 390]) {
      const c = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await c.newPage(),
        writes = [],
        errors = [];
      let stale = false;
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("dialog", (d) => d.accept());
      const draft = {
        name: "A thoughtful introduction",
        description: "A synthetic relationship-building campaign.",
        audience: "Buyer inquiries",
        goals: [],
        durationDays: 4,
        steps: [
          {
            id: "email",
            order: 1,
            type: "email",
            title: "A warm introduction",
            description:
              "Subject: A little inspiration for your next chapter\n\nHi {{first_name}},\n\nFinding the right home starts with a thoughtful conversation. I would love to hear what matters most to you.\n\nWarmly,\n{{agent_name}}",
            delayMinutes: 0,
            dayLabel: "Day 1",
            timeLabel: "10:00 AM",
          },
          {
            id: "sms",
            order: 2,
            type: "sms",
            title: "A personal check-in",
            description:
              "Hi {{first_name}}, what would make your next move feel right? Reply STOP to opt out.",
            delayMinutes: 1440,
            dayLabel: "Day 2",
            timeLabel: "10:00 AM",
          },
          {
            id: "voice",
            order: 3,
            type: "voicemail",
            title: "A natural follow-up",
            description:
              "Hi, just checking in personally. I am here whenever you are ready to explore your next move.",
            delayMinutes: 4320,
            dayLabel: "Day 4",
            timeLabel: "10:00 AM",
          },
        ],
      };
      const campaign = {
        id: "00000000-0000-4000-8000-000000000001",
        name: draft.name,
        status: "draft",
        provider: "mock",
        created_at: "2026-10-27",
        updated_at: "2026-10-27",
        enrollmentCount: 0,
        channels: ["email", "sms", "voicemail"],
        stepCount: 3,
        durationMinutes: 4320,
      };
      await page.route("**/api/**", async (route) => {
        const u = new URL(route.request().url()),
          method = route.request().method();
        let body,
          status = 200;
        if (u.pathname === "/api/campaigns/workspace" && method === "GET")
          body = {
            success: true,
            draft,
            preview: {
              campaign,
              steps: [],
              recipients: [],
              runs: [],
              engagement: [],
              performanceAvailable: false,
            },
            version: "a".repeat(64),
            unsupportedRules: false,
          };
        else if (
          u.pathname === "/api/campaigns/workspace" &&
          method === "POST"
        ) {
          const data = route.request().postDataJSON();
          writes.push(data);
          assert.equal(data.confirmation, "CREATE_DRAFT_REVISION");
          assert(!("contactIds" in data));
          if (stale) {
            status = 409;
            body = {
              success: false,
              error:
                "The source campaign changed. Reload it and review your revision before saving.",
              code: "stale_campaign",
            };
          } else
            body = {
              success: true,
              campaignId: data.requestId,
              status: "draft",
            };
        } else if (u.pathname.includes("/library/"))
          body = {
            success: true,
            campaign,
            steps: draft.steps.map((s) => ({
              id: s.id,
              step_order: s.order,
              type: s.type,
              title: s.title,
              description: s.description,
              delay_minutes: s.delayMinutes,
              day_label: s.dayLabel,
              time_label: s.timeLabel,
            })),
            recipients: [],
            runs: [],
            engagement: [],
            performanceAvailable: false,
          };
        else {
          status = 404;
          body = { success: false, error: "Unsupported fixture route" };
        }
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      });
      await page.goto(base + "/dashboard/campaigns");
      await page.getByRole("button", { name: /Quick preview/ }).click();
      await page.getByRole("dialog").waitFor();
      await page
        .getByRole("link", { name: "Expand to Full Workspace" })
        .waitFor();
      checks++;
      await page.getByLabel("Close preview", { exact: true }).click();
      await page.getByRole("button", { name: /Open workspace for/ }).click();
      await page.getByLabel("Email subject", { exact: true }).waitFor();
      assert.equal(await page.locator(".cw-context").count(), 0);
      checks++;
      if (width >= 1280)
        assert.equal(await page.locator(".cw-sequence").isVisible(), true);
      await page.screenshot({
        path: path.join(out, `campaign-email-${width}.jpg`),
        type: "jpeg",
        quality: 83,
        fullPage: true,
      });
      const subject = page.getByLabel("Email subject", { exact: true });
      await subject.fill("A more thoughtful introduction");
      await page.getByRole("button", { name: "Preview", exact: true }).click();
      await page
        .locator(".cw-message-preview")
        .getByRole("heading", { name: "A more thoughtful introduction" })
        .waitFor();
      await page.getByRole("button", { name: "Mobile", exact: true }).click();
      await page.getByLabel("Close campaign tools").click();
      assert.equal(
        await subject.inputValue(),
        "A more thoughtful introduction",
      );
      checks++;
      const pick = async (title) => {
        if (!(await page.locator(".cw-sequence").isVisible()))
          await page.getByRole("button", { name: /Sequence ·/ }).click();
        await page
          .locator(".cw-sequence")
          .getByRole("button", { name: new RegExp(title) })
          .click();
      };
      await pick("A personal check-in");
      await page
        .getByLabel("Message content", { exact: true })
        .fill("A warmer synthetic check-in. Reply STOP to opt out.");
      await page.screenshot({
        path: path.join(out, `campaign-sms-${width}.jpg`),
        type: "jpeg",
        quality: 83,
      });
      checks++;
      await page.getByRole("button", { name: "Move up", exact: true }).click();
      await page
        .getByLabel("Enrollment-relative day", { exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByLabel("Enrollment-relative day", { exact: true })
          .inputValue(),
        "1",
      );
      checks++;
      await page
        .getByRole("button", { name: "Duplicate step", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Remove step", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Ask MyARI", exact: true })
        .click();
      await page
        .getByText("AI editing of saved campaigns is not supported", {
          exact: false,
        })
        .waitFor();
      await page.getByLabel("Close campaign tools").click();
      checks++;
      if (!(await page.locator(".cw-sequence").isVisible()))
        await page.getByRole("button", { name: /Sequence ·/ }).click();
      await page
        .locator(".cw-sequence")
        .getByRole("button", { name: "＋ Add step", exact: true })
        .click();
      await page
        .getByLabel("Email subject", { exact: true })
        .fill("A helpful next step");
      await page
        .getByLabel("Email body", { exact: true })
        .fill("Let us plan a thoughtful next step.");
      checks++;
      await page
        .getByRole("button", { name: "Save Draft", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Confirm draft revision",
      });
      await dialog.waitFor();
      assert.equal(writes.length, 0);
      await page.keyboard.press("Shift+Tab");
      assert.equal(
        await dialog.evaluate((el) => el.contains(document.activeElement)),
        true,
      );
      await page
        .getByRole("button", { name: "Keep editing", exact: true })
        .click();
      checks++;
      stale = true;
      await page
        .getByRole("button", { name: "Save Draft", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Confirm Save Draft", exact: true })
        .click();
      await page
        .getByRole("alert")
        .getByText(/source campaign changed/)
        .waitFor();
      assert.equal(
        await page.getByLabel("Email body", { exact: true }).inputValue(),
        "Let us plan a thoughtful next step.",
      );
      checks++;
      stale = false;
      await page
        .getByRole("button", { name: "Save Draft", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Confirm Save Draft", exact: true })
        .click();
      await page.waitForURL((u) =>
        u.pathname.includes(writes.at(-1).requestId),
      );
      assert.equal(writes.length, 2);
      assert.equal(writes[0].requestId, writes[1].requestId);
      checks++;
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      checks++;
      await page.addScriptTag({ path: require.resolve("axe-core") });
      const axe = await page.evaluate(
        async () =>
          await window.axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          }),
      );
      const violations = axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      }));
      fs.writeFileSync(
        path.join(root, `docs/campaign-workspace/axe-${width}.json`),
        JSON.stringify(violations, null, 2),
      );
      assert.deepEqual(violations, []);
      checks++;
      results.push({ width, status: "PASS", draftSaveRequests: writes.length });
      await c.close();
    }
    fs.writeFileSync(
      path.join(root, "docs/campaign-workspace/browser-results.json"),
      JSON.stringify(
        {
          environment:
            "local actual UI, synthetic fixtures and mocked APIs; not authenticated hosted acceptance",
          checks,
          results,
        },
        null,
        2,
      ),
    );
    console.log(
      `PASS ${checks} campaign workspace browser checks across four viewports; no live services or data used.`,
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
