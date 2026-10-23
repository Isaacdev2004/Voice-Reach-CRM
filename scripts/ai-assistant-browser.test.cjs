/* Real React drawer + isolated synthetic API. Never reaches configured services. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { chromium } = require("playwright"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "myari-assistant-"));
  const adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, "ai-assistant-browser-entry.jsx")],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    alias: {
      "next/server": path.join(adapters, "server.jsx"),
      "next/link": path.join(adapters, "link.jsx"),
      "next/navigation": path.join(adapters, "stubs.jsx"),
      "@clerk/nextjs": path.join(adapters, "stubs.jsx"),
    },
  });
  const js = bundle.outputFiles[0].text,
    css = fs.readFileSync(
      path.join(root, "components/ai/crm-assistant.css"),
      "utf8",
    );
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const server = http.createServer((req, res) => {
    res.setHeader(
      "Content-Type",
      req.url === "/app.js" ? "text/javascript" : "text/html",
    );
    res.end(
      req.url === "/app.js"
        ? js
        : `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;font-family:Arial;background:#f8f5ef}button,textarea,select{font:inherit}${css}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`,
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const output = path.join(root, "docs/ai-assistant-review");
  fs.mkdirSync(output, { recursive: true });
  const results = [];
  try {
    for (const width of [1440, 1920, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", (e) => {
        errors.push(e.message);
        console.error("Browser page error:", e.message);
      });
      let saved = false,
        sendCount = 0,
        fail = false,
        lastRequest,
        approvals = 0;
      let draft = {
        id: id(4),
        payload: {
          kind: "task",
          title: "Follow up with Alex",
          body: "Review the recorded property preferences with Alex.",
          contactId: id(1),
          dueAt: null,
        },
        status: "proposed",
      };
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        const success = (data) =>
          route.fulfill({ json: { success: true, data } });
        if (url.pathname === "/api/ai/assistant/actions") {
          if (request.method() === "PATCH") {
            const change = JSON.parse(request.postData());
            assert.deepEqual(change.expected, draft.payload);
            draft = { ...draft, payload: change.payload };
            return success({ proposal: draft });
          }
          approvals++;
          assert.equal(JSON.parse(request.postData()).id, id(4));
          saved = true;
          return success({
            proposal: { ...draft, status: "saved", record_id: id(10) },
          });
        }
        if (url.pathname === "/api/ai/assistant/briefing")
          return success({
            sections: [
              {
                title: "Tasks due or overdue",
                available: true,
                items: [
                  {
                    id: id(1),
                    title: "Review follow-up",
                    href: "/dashboard/tasks",
                    overdue: true,
                  },
                ],
              },
            ],
            limitations: ["Unanswered-message status is not reliably tracked."],
          });
        if (
          url.pathname === "/api/ai/assistant" &&
          request.method() === "POST"
        ) {
          lastRequest = JSON.parse(request.postData());
          sendCount++;
          if (fail)
            return route.fulfill({
              status: 503,
              json: { success: false, error: "private provider trace" },
            });
          return success({
            conversationId: id(2),
            reply: {
              answer:
                "Alex has recorded preferences. Please review the proposed follow-up.",
              sources: [
                {
                  id: id(1),
                  label: "Alex Morgan",
                  href: "/dashboard/contacts/" + id(1),
                },
              ],
            },
            proposals: [draft],
          });
        }
        if (url.searchParams.has("conversationId"))
          return success({
            turns: [
              {
                id: id(3),
                role: "assistant",
                content: "Alex has recorded preferences.",
                result: {
                  sources: [
                    {
                      id: id(1),
                      label: "Alex Morgan",
                      href: "/dashboard/contacts/" + id(1),
                    },
                  ],
                },
              },
            ],
            proposals: [{ ...draft, status: saved ? "saved" : "proposed" }],
          });
        return success({
          conversations: [{ id: id(2), title: "Alex follow-up" }],
        });
      });
      await page.goto(origin + "/dashboard/contacts");
      await page
        .getByRole("button", { name: "Ask MyARI", exact: true })
        .click();
      const drawer = page.getByRole("dialog", {
        name: "Ask MyARI",
        exact: true,
      });
      await drawer.waitFor();
      await page
        .getByLabel("What would you like to work on?")
        .fill("Prepare a task for Alex");
      await drawer.getByRole("button", { name: "Ask MyARI →" }).click();
      await page.getByText("Follow up with Alex", { exact: true }).waitFor();
      assert.equal(sendCount, 1);
      assert.equal(lastRequest.context.contactId, id(1));
      assert.equal("contactNotes" in lastRequest.context, false);
      assert.equal(approvals, 0);
      await page
        .getByLabel("Follow up with Alex draft")
        .fill("Reviewed follow-up instructions for Alex.");
      assert.equal(
        await page
          .getByRole("button", { name: "Review approval" })
          .isDisabled(),
        true,
      );
      await page.getByRole("button", { name: "Save draft edits" }).click();
      await page.getByRole("button", { name: "Review approval" }).waitFor();
      await page.getByRole("button", { name: "Review approval" }).click();
      assert.equal(approvals, 0);
      await page
        .getByRole("button", { name: "Confirm save", exact: true })
        .click();
      await page.getByText("SAVED TO CRM", { exact: true }).waitFor();
      assert.equal(approvals, 1);
      await page
        .getByLabel("What would you like to work on?")
        .fill("Preserve this prompt");
      await page.getByRole("button", { name: "Close assistant" }).click();
      assert.equal(
        await page.getByLabel("Unsaved note").inputValue(),
        "Keep this unsaved work",
      );
      await page
        .getByRole("button", { name: "Ask MyARI", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("What would you like to work on?").inputValue(),
        "Preserve this prompt",
      );
      await page
        .getByRole("button", { name: "Daily briefing", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Your business briefing" })
        .waitFor();
      await page.screenshot({
        path: path.join(output, `assistant-${width}.png`),
        fullPage: true,
      });
      assert.ok(
        await page.evaluate(() => document.body.scrollWidth <= innerWidth + 1),
      );
      await page
        .getByRole("button", { name: "New conversation", exact: true })
        .click();
      await page.getByLabel("Conversation history").selectOption(id(2));
      await page
        .getByText("Alex has recorded preferences.", { exact: true })
        .waitFor();
      await page
        .getByLabel("What would you like to work on?")
        .fill("Retryable prompt");
      fail = true;
      await drawer.getByRole("button", { name: "Ask MyARI →" }).click();
      await page.getByRole("alert").waitFor();
      assert.equal(
        (await page.getByRole("alert").innerText()).includes(
          "private provider trace",
        ),
        false,
      );
      assert.equal(
        await page.getByLabel("What would you like to work on?").inputValue(),
        "Retryable prompt",
      );
      const requestId = lastRequest.requestId;
      fail = false;
      await drawer.getByRole("button", { name: "Ask MyARI →" }).click();
      await page.getByText("Follow up with Alex", { exact: true }).waitFor();
      assert.equal(lastRequest.requestId, requestId);
      await page.getByRole("button", { name: "Close assistant" }).click();
      await page.getByRole("button", { name: "Go to Tasks" }).click();
      await page
        .getByRole("button", { name: "Ask MyARI", exact: true })
        .click();
      await page
        .getByLabel("What would you like to work on?")
        .fill("Review the selected task");
      await drawer.getByRole("button", { name: "Ask MyARI →" }).click();
      await page.getByRole("button", { name: "Ask MyARI →" }).waitFor();
      await page.waitForFunction(
        () => document.querySelector("#assistant-message").value === "",
      );
      assert.equal(lastRequest.context.page, "/dashboard/tasks");
      assert.equal(lastRequest.context.taskId, id(1));
      assert.equal(lastRequest.context.contactId, undefined);
      await page.getByRole("button", { name: "Close assistant" }).click();
      await page
        .getByRole("button", { name: "Switch synthetic account" })
        .click();
      await page
        .getByRole("button", { name: "Ask MyARI", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("What would you like to work on?").inputValue(),
        "",
      );
      assert.equal(
        await page.getByText("Follow up with Alex", { exact: true }).count(),
        0,
      );
      await page.keyboard.press("Escape");
      assert.equal(await drawer.count(), 0);
      assert.deepEqual(errors, []);
      results.push({
        width,
        passed: true,
        checks: [
          "selected owned context",
          "propose without mutation",
          "explicit confirm",
          "unsaved work",
          "conversation reload",
          "failure privacy",
          "stable retry",
          "cross-tab context",
          "account switch",
          "no overflow",
          "Escape",
        ],
      });
      await page.close();
    }
    fs.writeFileSync(
      path.join(output, "browser-results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log("Assistant browser QA passed at 1440, 1920, 768 and 390px.");
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
