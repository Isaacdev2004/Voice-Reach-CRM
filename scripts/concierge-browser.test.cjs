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
  let welcomeDismissed=false, cardDismissed=false;
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
      "next/navigation":path.join(adapters,"stubs.jsx"),
      "@/components/billing/upgrade-plan-provider":path.join(__dirname,"concierge-browser/billing-stub.jsx"),
    },
  });
  const css =
    fs
      .readdirSync(".next/static/css")
      .filter((x) => x.endsWith(".css"))
      .map((x) => fs.readFileSync(".next/static/css/" + x, "utf8"))
      .join("\n") +
    fs.readFileSync("components/concierge/concierge.css", "utf8") + (process.env.MYARI_ICON_FONT ? "@font-face{font-family:\"Material Symbols Outlined\";src:url(/__test/material.ttf) format(\"truetype\");font-style:normal;font-weight:400}" : "");
  const server = http.createServer(async (req, res) => {
    if(req.url === "/__test/material.ttf" && process.env.MYARI_ICON_FONT){res.setHeader("content-type","font/ttf");return res.end(fs.readFileSync(process.env.MYARI_ICON_FONT));}
    if (req.url.startsWith("/brand/")) {
      const filename = path.join(root,"public",new URL(req.url,"http://localhost").pathname);
      if (!filename.startsWith(path.join(root,"public","brand")+path.sep) || !fs.existsSync(filename)) {res.statusCode=404;return res.end();}
      res.setHeader("content-type",req.url.includes(".svg")?"image/svg+xml":req.url.includes(".webp")?"image/webp":"image/png");return res.end(fs.readFileSync(filename));
    }
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
      if(req.url === "/api/concierge/access") return ok({enabled:true,staff:false});
      if(req.url === "/api/concierge/welcome") {
        if(body){if(body.action === "dismissCard")cardDismissed=true;else welcomeDismissed=true;return ok({saved:true});}
        return ok({showWelcome:!welcomeDismissed,showCard:!cardDismissed,complete:false,checklistReady:false,progress:{completed:snapshot().readiness.completed,total:8},next:snapshot().readiness.next?.label,href:"/dashboard/concierge?step=migration"});
      }
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
        if (body.action === "columns") return ok({columns: f.load("lib/concierge/import").csvColumns(body.csv).columns});
        if (body.action === "preview") {
          const prepared = f.load("lib/concierge/import").prepareCsv(body.csv, body.mapping);
          return ok({preview: {id:"00000000-0000-4000-8000-000000000010",state:"preview", expires_at:new Date(Date.now()+86400000).toISOString()}, rows:prepared.rows, errors:prepared.errors,
            review:f.load("lib/concierge/import-review").summarizeImport(prepared.rows,prepared.errors,[])});
        }
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
      welcomeDismissed=false;cardDismissed=false;
      const dashboard=await browser.newPage({viewport:{width,height:1000}});
      await dashboard.goto(`http://127.0.0.1:${server.address().port}/dashboard`);
      await dashboard.getByRole("dialog").waitFor();
      await dashboard.screenshot({path:`docs/concierge/previews/welcome-${width}.png`,fullPage:true});
      await dashboard.getByRole("button",{name:"Explore MyARI First",exact:true}).click();
      await dashboard.getByRole("dialog").waitFor({state:"hidden"});
      await dashboard.getByRole("link",{name:"Resume Setup"}).waitFor();
      await dashboard.screenshot({path:`docs/concierge/previews/dashboard-card-${width}.png`,fullPage:true});
      if(width<1024){await dashboard.getByRole("button",{name:"Open navigation",exact:true}).click();await dashboard.getByRole("link",{name:/White-Glove Setup/}).waitFor();await dashboard.screenshot({path:`docs/concierge/previews/navigation-${width}.png`,fullPage:true});await dashboard.getByRole("button",{name:"Close menu",exact:true}).click();}

      await dashboard.reload();await dashboard.getByRole("link",{name:"Resume Setup"}).waitFor();assert.equal(await dashboard.getByRole("dialog").isVisible(),false);
      await dashboard.getByRole("button",{name:"Dismiss reminder"}).click();await dashboard.getByRole("link",{name:"Resume Setup"}).waitFor({state:"hidden"});
      await dashboard.reload();await dashboard.waitForLoadState("networkidle");assert.equal(await dashboard.getByRole("link",{name:"Resume Setup"}).count(),0);
      welcomeDismissed=false;cardDismissed=false;await dashboard.reload();await dashboard.getByRole("dialog").waitFor();
      await dashboard.keyboard.press("Tab");assert.equal(await dashboard.evaluate(()=>!!document.activeElement.closest("dialog")),true);
      await dashboard.getByRole("button",{name:"Begin My Setup",exact:true}).click();await dashboard.waitForURL(/step=migration/);await dashboard.close();
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
            "firstName,phone,email\nJordan,5555550123,jordan@example.test\nJordan,5555550123,jordan@example.test\nNeeds correction,1,invalid",
          ),
        });
      await page.getByLabel("Choose CSV").setInputFiles({name:"not-a-csv.txt", mimeType:"text/plain",buffer:Buffer.from("invalid")});
      assert.equal(await page.getByRole("button",{name:"Prepare import preview",exact:true}).count(),0);
      await page.getByLabel("Choose CSV").setInputFiles({name:"synthetic.csv",mimeType:"text/csv",buffer:Buffer.from("firstName,phone,email\nJordan,5555550123,jordan@example.test\nJordan,5555550123,jordan@example.test\nNeeds correction,1,invalid")});
      const downloaded = page.waitForEvent("download");
      await page.getByRole("button", {name:"Download Sample CSV",exact:true}).click();
      const sampleDownload = await downloaded;
      assert.match(fs.readFileSync(await sampleDownload.path(),"utf8"), /Jordan,Harbor/);
      await page.getByLabel(/I am authorized to process/).check();
      await page
        .getByRole("button", { name: "Prepare import preview", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Review before importing" })
        .waitFor();
      await page.screenshot({path:`docs/concierge/previews/import-review-${width}.png`,fullPage:true});
      assert.equal(
        await page
          .getByRole("button", { name: "Confirm import", exact: true })
          .isDisabled(),
        true,
      );
      const errorDownloadPromise = page.waitForEvent("download");
      await page.getByRole("button",{name:"Download error report",exact:true}).click();
      const errorCsv = fs.readFileSync(await (await errorDownloadPromise).path(),"utf8");
      assert.match(errorCsv, /CSV Row,Reason/);
      assert.match(errorCsv, /4,.*Email is invalid/);
      const importedBeforeCancel = facts.imported;
      await page.getByRole("button",{name:"Cancel preview",exact:true}).click();
      assert.equal(facts.imported, importedBeforeCancel);
      await page.getByRole("button",{name:"Prepare import preview",exact:true}).click();
      await page.getByRole("heading",{name:"Review before importing"}).waitFor();
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
      for(const section of ["Your business","Contact migration","Campaign concierge","Connections","Walkthroughs","Launch review"]){
        await page.getByRole("button",{name:section,exact:true}).click();
        await page.screenshot({path:`docs/concierge/previews/journey-${section.replaceAll(" ","-").toLowerCase()}-${width}.png`,fullPage:true});
      }
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
      "PASS Concierge browser: welcome, persisted preferences, dashboard discovery, journey screenshots, discovery save, CSV mapping, explicit import/campaign approval, immediate summaries, billing safety, outage handling, no sends, desktop/tablet/mobile overflow and staff preview. Synthetic APIs only.",
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
