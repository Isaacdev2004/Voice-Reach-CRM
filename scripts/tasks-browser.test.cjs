/* Actual components with isolated fixtures; never contacts live services. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { state, handle, reset } = require("./tasks-browser/fixtures.cjs")();
const { chromium } = require("playwright"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "myari-notes-"));
  const adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [
      process.env.TASKS_BASELINE_ENTRY ||
        path.join(__dirname, "tasks-browser/entry.jsx"),
    ],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    nodePaths: [path.join(root, "node_modules")],
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
      path.join(root, "components/tasks/tasks-workspace.css"),
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
  const results = [],
    output = path.join(root, "docs/tasks-workspace");
  fs.mkdirSync(output, { recursive: true });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const width of [1440, 1536, 1920, 768, 390]) {
      reset();
      const page = await browser.newPage({ viewport: { width, height: 1024 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/dashboard/tasks");
      if (process.env.TASKS_BASELINE_ENTRY) {
        await page.getByText("Open tasks", { exact: true }).waitFor();
        await page.screenshot({
          path: path.join(output, `before-${width}.png`),
          fullPage: true,
        });
        await page.close();
        continue;
      }
      await page
        .getByRole("heading", { name: "The details drive the deal." })
        .waitFor();
      await page
        .getByRole("button", { name: "Review buyer priorities", exact: true })
        .waitFor();
      await page.screenshot({
        path: path.join(output, `tasks-${width}.png`),
        fullPage: true,
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "page overflow " + width,
      );
      await page.getByRole("button", { name: /^Filter/ }).click();
      await page
        .getByLabel("Filter priority", { exact: true })
        .selectOption("high");
      assert.equal(await page.locator(".tw-task-row").count(), 1);
      await page
        .getByRole("searchbox", { name: "Search tasks", exact: true })
        .fill("no matches");
      await page
        .getByText("No tasks match these filters.", { exact: true })
        .waitFor();
      await page
        .getByRole("searchbox", { name: "Search tasks", exact: true })
        .fill("");
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await page.getByRole("button", { name: "Board", exact: true }).click();
      assert.equal(await page.locator(".tw-board-column").count(), 3);
      await page.getByRole("button", { name: "Focus", exact: true }).click();
      assert((await page.locator(".tw-focus-row").count()) <= 5);
      await page.getByRole("button", { name: "List", exact: true }).click();
      await page
        .getByRole("checkbox", {
          name: "Complete Review buyer priorities",
          exact: true,
        })
        .click();
      await page
        .getByRole("checkbox", {
          name: "Reopen Review buyer priorities",
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("checkbox", {
          name: "Reopen Review buyer priorities",
          exact: true,
        })
        .click();
      await page
        .getByRole("checkbox", {
          name: "Complete Review buyer priorities",
          exact: true,
        })
        .waitFor();
      await page.getByRole("button", { name: /New task/ }).click();
      await page.getByRole("dialog").waitFor();
      await page
        .getByLabel("Task title", { exact: true })
        .fill("Synthetic approved task");
      await page
        .getByRole("button", { name: "Save task", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Synthetic approved task", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Synthetic approved task", exact: true })
        .click();
      await page
        .getByLabel("Task title", { exact: true })
        .fill("Edited synthetic task");
      await page
        .getByRole("button", { name: "Save task", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Edited synthetic task", exact: true })
        .waitFor();
      const createdRow = page.locator(".tw-task-row").filter({
        has: page.getByRole("button", {
          name: "Edited synthetic task",
          exact: true,
        }),
      });
      await createdRow.locator("summary").click();
      page.once("dialog", (dialog) => dialog.accept());
      await createdRow
        .getByRole("button", { name: "Delete task", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Edited synthetic task", exact: true })
        .waitFor({ state: "hidden" });
      if (width === 390) {
        await page
          .getByRole("button", {
            name: /Buyer transaction checklist.*editable steps/,
          })
          .first()
          .click();
        await page.getByLabel("Checklist client", { exact: true }).waitFor();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Mobile template overflow",
        );
        await page.keyboard.press("Escape");
      }
      if (width === 1536) {
        await page
          .getByRole("button", { name: "Ask MyARI", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "MyARI AI", exact: true })
          .waitFor();
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "Templates", exact: true })
          .click();
        await page
          .getByRole("button", { name: /Buyer Transaction.*editable tasks/ })
          .first()
          .click();
        await page
          .getByLabel("Checklist client", { exact: true })
          .selectOption("00000000-0000-4000-8000-000000000001");
        await page
          .getByLabel("Checklist anchor date", { exact: true })
          .fill("2026-10-23");
        const approve = page.getByRole("button", {
          name: "Create reviewed checklist",
          exact: true,
        });
        assert(await approve.isDisabled());
        await page
          .getByRole("checkbox", { name: /I reviewed every proposed task/ })
          .check();
        await approve.click();
        await page.locator(".tw-transaction").waitFor();
        await page.locator(".tw-transaction").first().click();
        await page
          .getByRole("heading", { name: "Transaction checklist", exact: true })
          .waitFor();
        assert(
          await page
            .getByRole("checkbox", {
              name: "Complete Contract executed",
              exact: true,
            })
            .isDisabled(),
        );
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "My Tasks", exact: true })
          .click();
        await page
          .getByLabel("Task instructions", { exact: true })
          .fill("Call Alex");
        await page
          .getByRole("button", { name: "Review suggestions", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "Review AI suggestions", exact: true })
          .waitFor();
        const before = state.writes.length;
        assert(
          await page
            .getByRole("button", { name: "Create approved tasks", exact: true })
            .isDisabled(),
        );
        assert.equal(state.writes.length, before);
        await page
          .getByRole("checkbox", { name: /I resolved any questions/ })
          .check();
        await page
          .getByRole("button", { name: "Create approved tasks", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Call Alex", exact: true })
          .waitFor();
        const beforeDictation = state.writes.length;
        await page.evaluate(() => {
          window.SpeechRecognition = undefined;
          window.webkitSpeechRecognition = undefined;
        });
        await page
          .getByRole("button", { name: "Dictate task", exact: true })
          .click();
        await page.getByText(/Voice dictation is not available/).waitFor();
        await page.evaluate(() => {
          window.SpeechRecognition = class {
            start() {
              setTimeout(() => {
                this.onresult({
                  results: [
                    {
                      isFinal: true,
                      0: { transcript: "Review the client notes" },
                    },
                  ],
                });
                this.onend();
              }, 0);
            }
            stop() {}
            abort() {}
          };
        });
        await page
          .getByRole("button", { name: "Dictate task", exact: true })
          .click();
        await page
          .getByLabel("Task instructions", { exact: true })
          .inputValue()
          .then((value) => assert(value.includes("Review the client notes")));
        assert.equal(state.writes.length, beforeDictation);
        await page.evaluate(() => {
          window.SpeechRecognition = class {
            start() {
              setTimeout(() => this.onerror({ error: "not-allowed" }), 0);
            }
            stop() {}
            abort() {}
          };
        });
        await page
          .getByRole("button", { name: "Dictate task", exact: true })
          .click();
        await page.getByText(/Microphone access was unavailable/).waitFor();
        assert.equal(state.writes.length, beforeDictation);
        await page.getByRole("button", { name: "Board", exact: true }).click();
        await page.waitForTimeout(900);
        assert.equal(state.prefs.view, "board");
        await page.reload();
        await page.locator(".tw-board").waitFor();
        state.fail = true;
        await page.evaluate(() =>
          window.dispatchEvent(new Event("myari:activity-changed")),
        );
        await page.getByText(/Tasks could not be loaded/).waitFor();
        assert.equal(
          await page.locator(".tw-kpi strong").first().innerText(),
          "—",
        );
        state.fail = false;
        await page
          .getByRole("button", { name: "Retry tasks", exact: true })
          .click();
        await page.locator(".tw-board").waitFor();
        state.actor = "owner_b";
        await page.evaluate(() => {
          window.__owner = "owner_b";
          window.dispatchEvent(new Event("review:auth"));
        });
        await page
          .getByText("No tasks match these filters.", { exact: true })
          .waitFor();
        assert.equal(
          await page
            .getByRole("button", {
              name: "Review buyer priorities",
              exact: true,
            })
            .count(),
          0,
        );
      }
      assert.deepEqual(errors, []);
      results.push({
        width,
        noOverflow: true,
        consoleErrors: errors,
        flows:
          "search + combined filter, board/focus/list, completion/reopen, task create",
      });
      await page.close();
    }
    fs.writeFileSync(
      path.join(
        output,
        process.env.TASKS_BASELINE_ENTRY
          ? "before-results.json"
          : "browser-results.json",
      ),
      JSON.stringify(results, null, 2),
    );
    console.log(
      process.env.TASKS_BASELINE_ENTRY
        ? "Captured baseline Tasks layout with synthetic records."
        : "PASS Tasks actual-component browser QA at 1440,1536,1920,768,390; screenshots saved.",
    );
  } catch (e) {
    console.error("QA state", JSON.stringify(state));
    for (const p of browser.contexts().flatMap((c) => c.pages())) {
      console.error((await p.locator("body").innerText()).slice(-6000));
      await p.screenshot({
        path: "/tmp/tasks-browser-debug.png",
        fullPage: true,
      });
    }
    throw e;
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
