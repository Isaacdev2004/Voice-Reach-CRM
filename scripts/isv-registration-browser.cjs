// Actual React component with a synthetic API boundary. Not hosted/provider acceptance.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const esbuild = require("esbuild"),
  { chromium } = require("playwright");
(async () => {
  const root = path.resolve(__dirname, ".."),
    out = "/tmp/isv-registration-browser.js";
  await esbuild.build({
    stdin: {
      contents:
        'import React from "react";import{createRoot}from"react-dom/client";import{ManagedMessagingSetup}from"./components/messaging/managed-setup";createRoot(document.getElementById("root")).render(<ManagedMessagingSetup/>);',
      resolveDir: root,
      loader: "jsx",
    },
    bundle: true,
    outfile: out,
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const css = process.env.MYARI_ISV_BROWSER_CSS
    ? fs.readFileSync(process.env.MYARI_ISV_BROWSER_CSS, "utf8")
    : fs
        .readdirSync(path.join(root, ".next/static/css"))
        .filter((x) => x.endsWith(".css"))
        .map((x) =>
          fs.readFileSync(path.join(root, ".next/static/css", x), "utf8"),
        )
        .join("\n");
  let saved = null,
    failSave = true,
    posts = 0,
    forbidden = 0;
  const server = http.createServer((req, res) => {
    if (req.url === "/app.js") {
      res.setHeader("Content-Type", "text/javascript");
      return res.end(fs.readFileSync(out));
    }
    if (req.url === "/style.css") {
      res.setHeader("Content-Type", "text/css");
      return res.end(css);
    }
    if (req.url === "/api/messaging/setup") {
      res.setHeader("Content-Type", "application/json");
      if (req.method === "POST") {
        let b = "";
        req.on("data", (c) => (b += c));
        req.on("end", () => {
          posts++;
          if (failSave) {
            failSave = false;
            res.statusCode = 503;
            res.end(JSON.stringify({ success: false }));
            return;
          }
          saved = { setup: JSON.parse(b), savedAt: new Date().toISOString() };
          res.end(
            JSON.stringify({
              success: true,
              saved,
              sendingEnabled: false,
              registration: {
                state: "pending",
                label: "Pending approval",
                number: null,
              },
            }),
          );
        });
        return;
      }
      return res.end(
        JSON.stringify({
          success: true,
          saved,
          channels: ["sms", "email", "voicemail"].map((channel) => ({
            channel,
            state: "pending_verification",
            reason: "MyARI sender registration and routing review is pending.",
          })),
          sendingEnabled: false,
          registration: {
            state: "pending",
            label: "Pending approval",
            number: null,
          },
        }),
      );
    }
    if (req.url.startsWith("/_next/static/media/")) {
      const file = path.basename(req.url);
      const loc = path.join(root, ".next/static/media", file);
      if (fs.existsSync(loc)) return res.end(fs.readFileSync(loc));
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MyARI managed messaging — synthetic component acceptance</title><link rel="stylesheet" href="/style.css"><body style="background:#faf7f1"><div id="root"></div><script src="/app.js"></script></body></html>',
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      (fs.existsSync(
        "/vercel/.cache/ms-playwright/chromium-1194/chrome-linux/chrome",
      )
        ? "/vercel/.cache/ms-playwright/chromium-1194/chrome-linux/chrome"
        : undefined),
    args: ["--no-sandbox"],
  });
  const evidence = path.join(root, "docs/messaging-isv/screenshots");
  fs.mkdirSync(evidence, { recursive: true });
  let checks = 0;
  const ok = (v) => {
    assert(v);
    checks++;
  };
  try {
    const context = await browser.newContext();
    await context.route("**/*", (route) => {
      if (new URL(route.request().url()).origin !== origin) {
        forbidden++;
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    for (const [width, height] of [
      [1440, 900],
      [768, 1024],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto(origin);
      await page
        .getByRole("button", { name: "Save setup details" })
        .waitFor({ state: "visible" });
      await page.waitForFunction(
        () => !document.querySelector('button[type="submit"]')?.disabled,
      );
      ok(
        (await page
          .getByText("Pending Verification", { exact: true })
          .count()) === 3,
      );
      ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (width === 1440) {
        for (const [label, value] of [
          ["Legal business or trading name", "Synthetic Realty"],
          ["Agent name", "Synthetic Agent"],
          ["Business email", "agent@example.test"],
          ["Business phone (+country code)", "+14075550100"],
          ["Business website", "https://example.test"],
          ["Business mailing address", "123 Synthetic Street, Apopka, FL"],
          ["Privacy policy URL", "https://example.test/privacy"],
          ["Terms URL", "https://example.test/terms"],
          [
            "What will you send?",
            "Consented follow-up for our real estate buyers.",
          ],
          [
            "How do your contacts give permission?",
            "Customers explicitly opt in through our signed buyer inquiry form.",
          ],
        ])
          await page.getByLabel(label, { exact: true }).fill(value);
        await page
          .getByLabel("Legally responsible sender", { exact: true })
          .selectOption("brokerage");
        await page
          .getByLabel("Brokerage affiliation (optional)", { exact: true })
          .fill("Synthetic Brokerage");
        await page
          .getByLabel("Representative messages", { exact: true })
          .fill(
            "Synthetic Brokerage: your requested appointment. Reply STOP to opt out.",
          );
        await page.getByLabel("I will send only", { exact: false }).check();
        await page.getByRole("button", { name: "Save setup details" }).click();
        await page
          .getByText("We could not save these details.", { exact: false })
          .waitFor();
        ok(
          (await page
            .getByLabel("Agent name", { exact: true })
            .inputValue()) === "Synthetic Agent",
        );
        await page.getByRole("button", { name: "Save setup details" }).click();
        await page
          .getByText("Your setup details are saved.", { exact: false })
          .waitFor();
        ok(saved.setup.agentName === "Synthetic Agent");
        ok(saved.setup.responsibleParty === "brokerage");
        ok(saved.setup.brokerageName === "Synthetic Brokerage");
        ok(posts === 2);
        await page.reload();
        await page.waitForFunction(
          () =>
            document.querySelector('input[type="email"]')?.value ===
            "agent@example.test",
        );
        ok(
          (await page
            .getByLabel("Agent name", { exact: true })
            .inputValue()) === "Synthetic Agent",
        );
      }
      ok(
        (await page.getByText("Pending approval", { exact: true }).count()) ===
          1,
      );
      await page.screenshot({
        path: path.join(evidence, "registration-" + width + ".png"),
        fullPage: true,
      });
    }
    ok(forbidden === 0);
    ok(!Object.keys(saved.setup).some((k) => /key|token|sid|ownerId/i.test(k)));
    const result = {
      result: "PASS",
      checks,
      viewports: [1440, 768, 390],
      externalRequests: forbidden,
      scope:
        "Actual component; synthetic API responses, no provider delivery or hosted authentication.",
    };
    fs.writeFileSync(
      path.join(evidence, "results.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
