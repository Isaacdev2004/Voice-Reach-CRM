/* Local acceptance using actual UI components and explicitly mocked providers/CRM. Never uses real credentials. */
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict"),
  esbuild = require("esbuild"),
  { chromium } = require("playwright");
(async () => {
  const root = path.resolve(__dirname, ".."),
    fixture = path.join(__dirname, "assistant-workspace"),
    out = path.join(root, "docs/assistant-workspace/previews");
  fs.mkdirSync(out, { recursive: true });
  const build = await esbuild.build({
    entryPoints: [path.join(fixture, "entry.jsx")],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    alias: {
      "next/server": path.join(root, "scripts/contacts-browser/server.jsx"),
      "next/navigation": path.join(fixture, "stubs.jsx"),
      "@clerk/nextjs": path.join(fixture, "stubs.jsx"),
      "next/link": path.join(fixture, "link.jsx"),
      "next/image": path.join(root, "scripts/contacts-browser/image.jsx"),
    },
  });
  const css =
    fs
      .readdirSync(path.join(root, ".next/static/css"))
      .filter((n) => n.endsWith(".css"))
      .map((n) =>
        fs.readFileSync(path.join(root, ".next/static/css", n), "utf8"),
      )
      .join("\n") +
    fs.readFileSync(
      path.join(root, "components/assistant/workspace.css"),
      "utf8",
    );
  const server = http.createServer((req, res) => {
    if (req.url === "/app.js") {
      res.setHeader("content-type", "text/javascript");
      return res.end(build.outputFiles[0].text);
    }
    if (req.url.startsWith("/brand/")) {
      const p = path.join(root, "public", req.url);
      if (fs.existsSync(p)) {
        res.setHeader(
          "content-type",
          p.endsWith(".png") ? "image/png" : "image/jpeg",
        );
        return fs.createReadStream(p).pipe(res);
      }
      res.statusCode = 404;
      return res.end();
    }
    res.setHeader("content-type", "text/html");
    res.end(
      `<!doctype html><html lang="en"><head><title>MyARI Assistant — local synthetic acceptance</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\n.fixture-nav{position:fixed;inset:0 auto 0 0;width:256px;background:#faf5ed;padding:30px;display:flex;flex-direction:column;gap:15px;border-right:1px solid #dfd2bf}.fixture-nav h2{font:38px Georgia;color:#92643e}.fixture-nav img{width:90px}.fixture-nav a{font-size:14px;color:#655440}.fixture-header{position:fixed;top:0;left:256px;right:0;height:64px;background:#fffdf9;padding:12px 24px;display:flex;justify-content:space-between;border-bottom:1px solid #dfd2bf}.fixture-main{margin:100px 40px 0 280px}@media(max-width:1023px){.fixture-nav{display:none}.fixture-header{left:0;height:60px}.fixture-main{margin-left:20px}} </style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`,
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  let checks = 0;
  const results = [];
  try {
    for (const width of [1440, 1280, 1024, 768, 390]) {
      const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage(),
        errors = [],
        chats = new Map(),
        proposals = new Map(),
        outcomes = new Map();
      let sessionOwner = "stage_a";
      let calls = 0,
        writes = [],
        fail = false;
      page.on("pageerror", (e) => {
        errors.push(e.message);
        console.error(e.stack);
      });
      page.on("dialog", (d) => d.accept());
      const proposal = (
        name = "Cold buyer follow-up",
        id = crypto.randomUUID(),
      ) => ({
        id,
        digest: "a".repeat(64),
        rootId: id,
        action: {
          kind: "campaign",
          name,
          audience: "Cold buyer leads",
          description: "Thoughtful follow-up for review.",
          durationDays: 21,
          steps: [
            {
              type: "sms",
              day: 1,
              title: "Warm introduction",
              description:
                "Hi {{first_name}}, how can I help? Reply STOP to opt out.",
            },
            {
              type: "email",
              day: 7,
              title: "A little inspiration",
              description: "A helpful buyer guide, prepared for your review.",
            },
            {
              type: "voicemail",
              day: 21,
              title: "Personal check-in",
              description: "Hi, just checking in. Text script only.",
            },
          ],
        },
        preview: {},
        executable: true,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "mediaDevices", {
          configurable: true,
          value: {
            getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
          },
        });
        window.AudioContext = class {
          async decodeAudioData() {
            return {
              sampleRate: 16000,
              getChannelData: () => new Float32Array(16000),
            };
          }
          async close() {}
        };
        window.MediaRecorder = class {
          static isTypeSupported() {
            return true;
          }
          constructor() {
            this.state = "inactive";
          }
          start() {
            this.state = "recording";
          }
          stop() {
            if (this.state !== "recording") return;
            this.state = "inactive";
            this.ondataavailable?.({
              data: new Blob(["synthetic-audio"], { type: "audio/webm" }),
            });
            this.onstop?.();
          }
        };
      });
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          u = new URL(request.url()),
          method = request.method(),
          owner = request.headers()["x-myari-owner"] || sessionOwner;
        const body = request
          .headers()
          ["content-type"]?.includes("application/json")
          ? request.postDataJSON() || {}
          : {};
        let data = {},
          status = 200;
        if (method !== "GET") writes.push({ path: u.pathname, method, body });
        if (u.pathname === "/api/assistant/config")
          data = {
            enabled: owner !== "denied",
            safetyLimits: { dailyInteractions: 5, dailyProviderCalls: 10 },
            provider: "openai",
            configured: true,
            externalActionsEnabled: false,
          };
        else if (u.pathname === "/api/assistant/history") {
          if (method === "GET") {
            const id = u.searchParams.get("conversationId");
            data = id
              ? { messages: chats.get(owner + id) || [] }
              : {
                  recent: [...chats.entries()]
                    .filter(([key]) => key.startsWith(owner))
                    .map(([key, messages]) => ({
                      conversationId: key.slice(owner.length),
                      message: messages[0]?.content || "Conversation",
                      at: new Date().toISOString(),
                    })),
                };
          } else data = { deleted: true };
        } else if (u.pathname === "/api/assistant/chat") {
          calls++;
          if (fail) {
            status = 429;
            data = {
              error:
                "Daily interaction limit reached. Your saved work is intact.",
            };
          } else {
            const p = proposal();
            proposals.set(p.id, p);
            const messages = chats.get(owner + body.conversationId) || [];
            messages.push(
              { role: "user", content: body.message },
              {
                role: "assistant",
                content:
                  "Here is your reviewable campaign draft. Nothing has been saved, enrolled or sent.",
                proposalIds: [p.id],
              },
            );
            chats.set(owner + body.conversationId, messages);
            data = {
              message: messages.at(-1).content,
              proposals: [p],
              results: [
                {
                  name: "search_contacts",
                  data: [
                    {
                      id: "hidden-id",
                      name:
                        owner === "stage_a" ? "Alex Example" : "Blair Example",
                      stage: "Buyer",
                      notes: "Synthetic authorized record",
                    },
                  ],
                },
              ],
              usage: { provider: "openai", inputTokens: 12, outputTokens: 45 },
            };
          }
        } else if (u.pathname === "/api/assistant/proposals") {
          if (method === "GET") {
            const id = u.searchParams.get("id");
            data = {
              proposal: proposals.get(id),
              outcome: outcomes.get(id) || null,
            };
          } else {
            const p = proposal(body.action.name);
            p.action = body.action;
            proposals.set(p.id, p);
            data = { proposal: p };
          }
        } else if (u.pathname === "/api/assistant/approve") {
          const id = body.proposalId;
          if (outcomes.has(id)) {
            status = 409;
            data = { error: "Already resolved" };
          } else {
            const result = {
              state: method === "DELETE" ? "cancelled" : "completed",
              result: {
                message:
                  method === "DELETE"
                    ? "Proposal rejected. Nothing saved."
                    : "Campaign draft saved. No enrollment or sending.",
                href: "/dashboard/campaigns",
              },
            };
            outcomes.set(id, result);
            data = { outcome: result };
          }
        } else if (u.pathname === "/api/assistant/transcribe")
          data = { transcript: "Create a task to call Jordan Friday at ten." };
        else if (u.pathname === "/api/assistant/work") data = { work: [] };
        else if (u.pathname === "/api/ai/generate")
          data = {
            success: true,
            data: {
              task: "email_writer",
              provider: "template",
              output: {
                subject: "Synthetic draft",
                body: "Keep this draft while switching views.",
              },
            },
          };
        else {
          status = 404;
          data = { error: "Unsupported test route" };
        }
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      await page.goto(origin + "/dashboard/assistant");
      await page
        .getByRole("heading", { name: /Turn ideas/ })
        .waitFor({ timeout: 8000 })
        .catch(async (e) => {
          console.error(
            (await page.locator("body").innerText()).slice(0, 1500),
          );
          console.error(errors);
          await page.screenshot({ path: "/tmp/assistant-debug.png" });
          throw e;
        });
      await page.screenshot({
        path: path.join(out, `workspace-welcome-${width}.jpg`),
        fullPage: true,
        type: "jpeg",
        quality: 82,
      });
      await page
        .getByRole("button", { name: "Create a campaign", exact: false })
        .first()
        .click();
      assert.equal(calls, 0);
      checks++;
      const command = page.getByRole("textbox", { name: "Assistant command" });
      assert.match(await command.inputValue(), /21-day/);
      await page.locator(".aw-composer-actions summary").click();
      await page
        .getByRole("checkbox", { name: /authorize microphone/ })
        .check();
      await page
        .getByRole("button", {
          name: "Microphone · dictate command",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Stop recording", exact: true })
        .click();
      await page.waitForFunction(() =>
        document
          .querySelector('[aria-label="Assistant command"]')
          .value.includes("call Jordan Friday"),
      );
      assert.equal(calls, 0);
      assert.equal(
        writes.some((w) => w.path === "/api/assistant/approve"),
        false,
      );
      checks++;
      await page.locator(".aw-composer-actions summary").click();
      await command.fill(
        "Prepare a reviewable 21-day cold buyer follow-up campaign. Save nothing until I approve the exact draft. Do not enroll or send.",
      );
      await page
        .getByRole("button", { name: "Prepare response →", exact: true })
        .click();
      await page
        .getByText("Here is your reviewable campaign draft.", { exact: false })
        .waitFor();
      assert.equal(calls, 1);
      checks++;
      await page.screenshot({
        path: path.join(out, `workspace-campaign-${width}.jpg`),
        fullPage: true,
        type: "jpeg",
        quality: 82,
      });
      await command.fill("Make the messages warmer, but keep this unsent.");
      await page
        .getByRole("button", { name: "Compact Drawer", exact: true })
        .click();
      await page.waitForURL("**/dashboard");
      assert.equal(
        await command.inputValue(),
        "Make the messages warmer, but keep this unsent.",
      );
      checks++;
      await page.screenshot({
        path: path.join(out, `drawer-${width}.jpg`),
        fullPage: true,
        type: "jpeg",
        quality: 82,
      });
      await page.goBack();
      await page.waitForURL("**/dashboard/assistant");
      assert.equal(
        await command.inputValue(),
        "Make the messages warmer, but keep this unsent.",
      );
      await page.goForward();
      await page.waitForURL("**/dashboard");
      checks++;
      await page
        .getByRole("button", { name: "Expanded Overlay", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("dialog", { name: "MyARI Assistant" })
          .getAttribute("aria-modal"),
        "true",
      );
      assert.equal(
        await command.inputValue(),
        "Make the messages warmer, but keep this unsent.",
      );
      checks++;
      await page.locator(".aw-panel").focus();
      await page.keyboard.press("Shift+Tab");
      assert.equal(
        await page
          .locator(".aw-panel")
          .evaluate((e) => e.contains(document.activeElement)),
        true,
      );
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Ask MyARI", exact: true })
        .click();
      assert.equal(
        await command.inputValue(),
        "Make the messages warmer, but keep this unsent.",
      );
      checks++;
      await page.screenshot({
        path: path.join(out, `overlay-${width}.jpg`),
        fullPage: true,
        type: "jpeg",
        quality: 82,
      });
      await page
        .getByRole("button", { name: "Claude draft tools", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Claude draft tools", exact: true })
        .waitFor();
      const legacy = page.locator(".aw-legacy");
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: path.join(out, `claude-tools-${width}.jpg`),
          fullPage: true,
          type: "jpeg",
          quality: 82,
        });
      await legacy
        .locator("textarea")
        .fill("Preserve this standalone Claude brief.");
      await legacy
        .getByRole("button", { name: "← Return to Assistant", exact: true })
        .click();
      assert.equal(
        await command.inputValue(),
        "Make the messages warmer, but keep this unsent.",
      );
      await page
        .getByRole("button", { name: "Claude draft tools", exact: true })
        .click();
      assert.equal(
        await legacy.locator("textarea").inputValue(),
        "Preserve this standalone Claude brief.",
      );
      await legacy
        .getByRole("button", { name: "← Return to Assistant", exact: true })
        .click();
      checks++;
      await page
        .getByRole("button", { name: "Full Workspace", exact: true })
        .click();
      await page.waitForURL("**/dashboard/assistant");
      await page
        .locator(".assistant-preview")
        .getByRole("button", { name: "Edit", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Step 1 message" })
        .fill("A warmer synthetic message. Reply STOP to opt out.");
      await page
        .getByRole("button", { name: "Compact Drawer", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Full Workspace", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("textbox", { name: "Step 1 message" })
          .inputValue(),
        "A warmer synthetic message. Reply STOP to opt out.",
      );
      checks++;
      await page
        .getByRole("button", { name: "Prepare edited preview", exact: true })
        .click();
      await page
        .locator(".assistant-preview")
        .getByText("A warmer synthetic message.", { exact: false })
        .count();
      checks++;
      assert.equal(
        await page
          .getByRole("button", { name: "Approve & save", exact: true })
          .isDisabled(),
        true,
      );
      await page
        .getByRole("checkbox", { name: /I reviewed the exact target/ })
        .check();
      await page
        .getByRole("button", { name: "Approve & save", exact: true })
        .click();
      await page
        .getByText("Campaign draft saved. No enrollment or sending.", {
          exact: false,
        })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Approve & save", exact: true })
          .count(),
        0,
      );
      checks++;
      await page.reload();
      await page
        .getByText("Here is your reviewable campaign draft.", { exact: false })
        .waitFor();
      assert.equal(calls, 1);
      checks++;
      if (
        !(await page
          .getByRole("button", { name: "＋ New conversation", exact: true })
          .isVisible())
      )
        await page
          .getByRole("button", { name: "History", exact: true })
          .click();
      await page
        .getByRole("button", { name: "＋ New conversation", exact: true })
        .click();
      await page.getByRole("heading", { name: /Turn ideas/ }).waitFor();
      await page.screenshot({
        path: path.join(out, `workspace-home-${width}.jpg`),
        fullPage: true,
        type: "jpeg",
        quality: 82,
      });
      await command.fill("Synthetic retry text");
      fail = true;
      await page
        .getByRole("button", { name: "Prepare response →", exact: true })
        .click();
      await page
        .getByRole("alert")
        .getByText(/Daily interaction limit/)
        .waitFor();
      assert.equal(await command.inputValue(), "Synthetic retry text");
      checks++;
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.equal(
        await page.getByRole("button", { name: /Approve & send/ }).count(),
        0,
      );
      assert.equal(
        writes.some((w) => /billing|send|enroll|launch/.test(w.path)),
        false,
      );
      assert.deepEqual(errors, []);
      checks++;
      if (width === 1440 || width === 390) {
        await page.addScriptTag({ path: require.resolve("axe-core") });
        const audit = await page.evaluate(
          async () =>
            await window.axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa"],
              },
            }),
        );
        const violations = audit.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        }));
        fs.writeFileSync(
          path.join(root, `docs/assistant-workspace/axe-${width}.json`),
          JSON.stringify(violations, null, 2),
        );
        assert.deepEqual(violations, []);
        checks++;
      }
      await page
        .getByRole("button", {
          name: "Reload conversation safely",
          exact: true,
        })
        .click();
      fail = false;
      await page
        .getByRole("button", { name: "Prepare response →", exact: true })
        .click();
      await page
        .locator(".assistant-preview")
        .getByRole("button", { name: "Cancel proposal", exact: true })
        .click();
      await page
        .getByText("Proposal rejected. Nothing saved.", { exact: false })
        .waitFor();
      checks++;
      sessionOwner = "stage_b";
      await page.evaluate(() => {
        window.__owner = "stage_b";
        window.dispatchEvent(new Event("review:auth"));
      });
      await page.getByRole("heading", { name: /Turn ideas/ }).waitFor();
      assert.equal(
        await page
          .getByText("Here is your reviewable campaign draft.", {
            exact: false,
          })
          .count(),
        0,
      );
      await page
        .getByRole("textbox", { name: "Assistant command" })
        .fill("Find my authorized synthetic contact");
      await page
        .getByRole("button", { name: "Prepare response →", exact: true })
        .click();
      await page.getByText("search contacts", { exact: true }).click();
      await page.getByText("Blair Example", { exact: true }).waitFor();
      assert.equal(
        await page.getByText("Alex Example", { exact: true }).count(),
        0,
      );
      checks++;
      sessionOwner = "denied";
      await page.evaluate(() => {
        window.__owner = "denied";
        window.dispatchEvent(new Event("review:auth"));
      });
      await page.waitForFunction(() => !document.querySelector(".aw-host"));
      assert.equal(
        await page.getByRole("textbox", { name: "Assistant command" }).count(),
        0,
      );
      checks++;
      results.push({
        width,
        status: "PASS",
        chatCalls: calls,
        mutations: writes.map((w) => ({ path: w.path, method: w.method })),
      });
      await context.close();
    }
    fs.writeFileSync(
      path.join(root, "docs/assistant-workspace/browser-results.json"),
      JSON.stringify(
        {
          environment:
            "local UI with mocked APIs, not hosted Clerk/provider acceptance",
          checks,
          results,
        },
        null,
        2,
      ),
    );
    console.log(
      `PASS ${checks} Assistant workspace checks across 5 viewports: navigation, persistent modes/Claude, restore, campaign revision/approval, error recovery and no outbound/billing requests. All remote APIs mocked.`,
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
