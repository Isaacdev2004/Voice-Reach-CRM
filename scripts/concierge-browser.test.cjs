/* Actual Concierge components, synthetic local APIs. No subscriber/provider credentials. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  esbuild = require("esbuild");
const { chromium } = require("playwright");
const { fixture } = require("./campaign-audit/harness.cjs");
(async () => {
  const f = fixture(),
    { Discovery } = f.load("lib/concierge/schema"),
    { readiness } = f.load("lib/concierge/readiness");
  const record = {
    owner_id: "synthetic-concierge",
    version: 1,
    discovery: Discovery.parse({
      agentName: "Alex Morgan",
      market: "Orlando",
      goals: "Follow up thoughtfully",
    }),
    milestones: {},
    stage: "discovery",
    assignee_id: null,
    internal_note: "Synthetic operational note",
    next_followup: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const facts = {
    imported: false,
    campaignDraft: false,
    integrationsVerified: false,
  };
  let imports = [],
    campaigns = [],
    fail = false;
  let sends = 0;
  const snapshot = () => ({
    record,
    facts,
    readiness: readiness(record, facts),
    templates: [
      {
        key: "synthetic-buyer",
        name: "New buyer welcome",
        description: "Synthetic campaign draft",
        steps: [
          {
            id: "one",
            dayLabel: "Day 1",
            type: "email",
            title: "A personal introduction",
            description: "Hello {{first_name}}, what would you like to find?",
          },
        ],
      },
    ],
    assistantEnabled: false,
    campaigns,
    subscription: { plan: "Growth", status: "trialing" },
    history: [],
  });
  const root = path.resolve(__dirname, ".."),
    adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, "concierge-browser/entry.jsx")],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    alias: {
      "@clerk/nextjs": path.join(adapters, "stubs.jsx"),
      "next/link": path.join(adapters, "link.jsx"),
      "next/server": path.join(adapters, "server.jsx"),
    },
  });
  const css =
    fs
      .readdirSync(".next/static/css")
      .filter((x) => x.endsWith(".css"))
      .map((x) => fs.readFileSync(".next/static/css/" + x, "utf8"))
      .join("\n") +
    fs.readFileSync("components/concierge/concierge.css", "utf8");
  const server = http.createServer(async (req, res) => {
    if (req.url === "/app.js") {
      res.setHeader("content-type", "text/javascript");
      return res.end(bundle.outputFiles[0].text);
    }
    if (req.url.startsWith("/api/")) {
      res.setHeader("content-type", "application/json");
      let body = null;
      if (req.method === "POST") {
        let s = "";
        for await (const c of req) s += c;
        body = JSON.parse(s);
      }
      const ok = (x) => res.end(JSON.stringify({ success: true, ...x }));
      if (fail) {
        res.statusCode = 503;
        return res.end(
          JSON.stringify({
            success: false,
            error: "Synthetic service unavailable. Your saved work remains.",
          }),
        );
      }
      if (req.url === "/api/concierge/staff")
        return ok({
          role: "manager",
          cases: [record],
          metrics: {
            scopedCases: 1,
            needsAttention: 0,
            byStage: { discovery: 1 },
            coverage: "Synthetic case sample",
          },
          communicationDrafts: [],
        });
      if (req.url === "/api/concierge") {
        if (body) {
          if (body.discovery) record.discovery = body.discovery;
          if (body.milestones)
            record.milestones = { ...record.milestones, ...body.milestones };
          record.version++;
          return ok({ record });
        }
        return ok(snapshot());
      }
      if (req.url === "/api/concierge/import") {
        if (!body) return ok({ imports });
        if (body.action === "columns")
          return ok({ columns: ["firstName", "phone", "email"] });
        if (body.action === "preview")
          return ok({
            preview: {
              id: "00000000-0000-4000-8000-000000000010",
              state: "preview",
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            },
            rows: [
              {
                firstName: "Jordan",
                phone: "+15555550123",
                email: "jordan@example.test",
              },
            ],
            errors: [],
            existingDuplicates: 0,
          });
        if (body.action === "confirm") {
          facts.imported = true;
          imports = [
            {
              id: body.id,
              state: "completed",
              result: { imported: 1, duplicatesSkipped: 0 },
              row_errors: [],
            },
          ];
          return ok({ result: { imported: 1, duplicatesSkipped: 0 } });
        }
        return ok({ cancelled: true });
      }
      if (req.url === "/api/concierge/campaign") {
        assert.equal(body.confirmed, true);
        facts.campaignDraft = true;
        campaigns = [
          { id: "draft", name: "New buyer welcome", status: "draft" },
        ];
        return ok({ campaignId: "draft" });
      }
      if (/send|enroll|activate|checkout/.test(req.url)) sends++;
      res.statusCode = 404;
      return res.end("{}");
    }
    res.setHeader("content-type", "text/html");
    res.end(
      `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/app.js"></script>`,
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  fs.mkdirSync("docs/concierge/previews", { recursive: true });
  try {
    for (const width of [1440, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1050 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        `http://127.0.0.1:${server.address().port}/dashboard/concierge`,
      );
      await page
        .getByLabel("Agent or team name", { exact: true })
        .fill("Alex Morgan");
      await page
        .getByRole("button", { name: "Save my discovery", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Your progress is saved." })
        .waitFor();
      assert.ok(await page.locator("progress").count());
      await page.screenshot({
        path: `docs/concierge/previews/subscriber-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Contact migration", exact: true })
        .click();
      await page
        .getByLabel("Choose CSV")
        .setInputFiles({
          name: "synthetic.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(
            "firstName,phone,email\nJordan,5555550123,jordan@example.test",
          ),
        });
      await page.getByLabel(/I am authorized to process/).check();
      await page
        .getByRole("button", { name: "Prepare import preview", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Review before importing" })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Confirm import", exact: true })
          .isDisabled(),
        true,
      );
      await page.getByLabel(/Approve adding these valid contacts only/).check();
      await page
        .getByRole("button", { name: "Confirm import", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "1 contacts imported" })
        .waitFor();
      await page
        .getByRole("button", { name: "Campaign concierge", exact: true })
        .click();
      await page
        .getByLabel("Campaign template", { exact: false })
        .selectOption("synthetic-buyer");
      assert.equal(
        await page
          .getByRole("button", { name: "Save approved draft" })
          .isDisabled(),
        true,
      );
      await page.getByLabel(/I approve saving this as a draft/).check();
      await page.getByRole("button", { name: "Save approved draft" }).click();
      await page
        .getByRole("status")
        .filter({ hasText: "Campaign draft is in your library" })
        .waitFor();
      await page
        .getByRole("button", { name: "Launch review", exact: true })
        .click();
      assert.match(
        await page.locator("body").innerText(),
        /Concierge never changes your billing/,
      );
      assert.equal(sends, 0);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "No horizontal overflow",
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    const staff = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    await staff.goto(
      `http://127.0.0.1:${server.address().port}/dashboard/admin/concierge`,
    );
    await staff
      .getByRole("heading", { name: "Alex Morgan", exact: true })
      .waitFor();
    await staff.screenshot({
      path: "docs/concierge/previews/staff-1440.png",
      fullPage: true,
    });
    await staff.close();
    fail = true;
    const outage = await browser.newPage();
    await outage.goto(
      `http://127.0.0.1:${server.address().port}/dashboard/concierge`,
    );
    await outage.getByRole("alert").waitFor();
    assert.match(await outage.getByRole("alert").innerText(), /saved work/);
    await outage.close();
    console.log(
      "PASS Concierge browser: discovery save, CSV mapping, explicit import/campaign approval, immediate summaries, billing safety, outage handling, no sends, desktop/tablet/mobile overflow and staff preview. Synthetic APIs only.",
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
