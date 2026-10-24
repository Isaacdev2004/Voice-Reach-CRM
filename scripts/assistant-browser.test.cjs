/* Local browser fixtures only. No microphone hardware or provider requests. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  { chromium } = require("playwright"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    fixture = path.join(__dirname, "assistant-browser"),
    out = "docs/ai-operating-assistant";
  fs.mkdirSync(out, { recursive: true });
  const bundle = await esbuild.build({
    entryPoints: [path.join(fixture, "entry.jsx")],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    alias: {
      "next/navigation": path.join(fixture, "stubs.jsx"),
      "@clerk/nextjs": path.join(fixture, "stubs.jsx"),
    },
  });
  const css = fs
    .readdirSync(".next/static/css")
    .filter((x) => x.endsWith(".css"))
    .map((x) => fs.readFileSync(".next/static/css/" + x, "utf8"))
    .join("\n");
  const server = http.createServer((req, res) => {
    if (req.url === "/app.js") {
      res.setHeader("content-type", "text/javascript");
      return res.end(bundle.outputFiles[0].text);
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
  try {
    for (const width of [1440, 1280, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1050 } });
      const errors = [],
        writes = [];
      page.on("pageerror", (e) => {
        errors.push(e.message);
        console.error("Fixture page error:", e.message);
      });
      let outcome = null,
        chatCalls = 0;
      const p = {
        id: "00000000-0000-4000-8000-000000000080",
        digest: "a".repeat(64),
        action: {
          kind: "task",
          contactId: "00000000-0000-4000-8000-000000000002",
          title: "Call Jordan Friday",
          dueAt: "2026-11-06T15:00:00Z",
          notes: "",
        },
        preview: {
          contact: {
            id: "00000000-0000-4000-8000-000000000002",
            name: "Jordan Lee",
          },
          title: "Call Jordan Friday",
          dueAt: "2026-11-06T15:00:00Z",
          scope: "One internal task; no external invitations",
        },
        expiresAt: "2026-12-01T00:00:00Z",
        executable: true,
        createdAt: "2026-10-24T00:00:00Z",
      };
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
      await page.route("**/api/billing/ai/usage", (r) =>
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            entitlement: { tier: "plus", crmPlan: "starter" },
            resetAt: "2026-11-24T00:00:00Z",
            usage: [
              {
                capability: "requests",
                label: "AI requests",
                limit: 200,
                used: 160,
                reserved: 0,
                remaining: 40,
                state: "near_limit",
              },
            ],
            notice: "Synthetic usage records for QA only.",
          }),
        }),
      );
      await page.route("**/api/assistant/**", async (route) => {
        const req = route.request(),
          url = new URL(req.url());
        let data = {};
        if (req.method() !== "GET") writes.push(url.pathname);
        if (url.pathname.endsWith("/history"))
          data = { recent: [], messages: [] };
        else if (url.pathname.endsWith("/transcribe"))
          data = { transcript: "Create a task to call Jordan Friday at ten." };
        else if (url.pathname.endsWith("/chat")) {
          chatCalls++;
          const body = req.postDataJSON();
          assert.ok(body.context.contactId);
          data = {
            message: "Review this proposed task. Nothing was saved.",
            proposals: [p],
            results: [
              {
                name: "read_contact",
                data: { id: p.action.contactId, first_name: "Jordan" },
              },
            ],
            usage: { provider: "openai", inputTokens: 10, outputTokens: 5 },
          };
        } else if (url.pathname.endsWith("/approve")) {
          const body = req.postDataJSON();
          assert.equal(body.confirmation, "CONFIRM_SAVE");
          assert.equal(body.digest, p.digest);
          outcome = {
            state: "completed",
            result: {
              href: "/dashboard/tasks?taskId=" + p.id,
              message: "Task saved in MyARI.",
            },
          };
          data = { outcome };
        } else if (url.pathname.endsWith("/proposals"))
          data = { proposal: p, outcome };
        else if (url.pathname.endsWith("/work"))
          data = {
            work: [
              {
                proposal: p,
                outcome,
                status: outcome ? "Completed" : "Awaiting Approval",
                at: p.createdAt,
              },
            ],
          };
        else throw Error("Unexpected request " + url.pathname);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      await page.goto(
        `http://127.0.0.1:${server.address().port}/dashboard/contacts/00000000-0000-4000-8000-000000000002`,
      );
      await page
        .getByRole("button", { name: "Open MyARI Assistant", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Assistant command" })
        .fill("Keep this unfinished command");
      await page.getByRole("button", { name: "Close", exact: true }).click();
      assert.equal(
        await page.locator("#unsaved").inputValue(),
        "Unsent page draft",
      );
      await page
        .getByRole("button", { name: "Open MyARI Assistant", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("textbox", { name: "Assistant command" })
          .inputValue(),
        "Keep this unfinished command",
      );
      await page.getByText("Voice command", { exact: true }).click();
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
          .querySelector('textarea[aria-label="Assistant command"]')
          .value.includes("call Jordan Friday"),
      );
      assert.equal(chatCalls, 0);
      await page
        .getByRole("button", { name: "Prepare response", exact: true })
        .click();
      await page
        .getByText("Review this proposed task. Nothing was saved.", {
          exact: true,
        })
        .waitFor();
      assert.equal(writes.filter((x) => x.endsWith("/approve")).length, 0);
      await page
        .getByRole("button", { name: "Approve & save", exact: true })
        .isDisabled()
        .then((v) => assert.equal(v, true));
      await page
        .getByRole("checkbox", { name: /reviewed the exact target/ })
        .check();
      await page
        .getByRole("button", { name: "Approve & save", exact: true })
        .click();
      await page.getByText("Task saved in MyARI.", { exact: false }).waitFor();
      assert.equal(writes.filter((x) => x.endsWith("/approve")).length, 1);
      await page
        .getByRole("button", { name: "Expand workspace", exact: true })
        .click();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: `${out}/assistant-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Close", exact: true }).click();
      assert.equal(
        await page.locator("#unsaved").inputValue(),
        "Unsent page draft",
      );
      assert.deepEqual(errors, []);
      await page.goto(
        `http://127.0.0.1:${server.address().port}/dashboard/assistant`,
      );
      await page
        .getByRole("heading", { name: "Your work, thoughtfully organized." })
        .waitFor();
      await page.getByText("Completed ·", { exact: false }).waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: `${out}/command-center-${width}.png`,
        fullPage: true,
      });
      await page.goto(
        `http://127.0.0.1:${server.address().port}/pricing-render`,
      );
      await page.getByRole("heading", { name: "Choose your plan." }).waitFor();
      assert.equal(await page.locator(".approved-plan").count(), 3);
      for (const amount of ["$65", "$115", "$215"])
        await page.getByText(amount, { exact: true }).waitFor();
      const compare = page.getByText("Your AI assistant, built into MyARI.", {
        exact: true,
      });
      await compare.click();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: `docs/ai-pricing-launch/pricing-${width}.png`,
        fullPage: true,
      });
      await page.close();
    }
    console.log(
      "Assistant browser QA passed: 1440/1280/768/390, preserved unsaved work, explicit dictation, editable transcript, no auto-submit, exact approval, completed record link, drawer expansion and Command Center; all APIs mocked.",
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
