/* Real local assistant route/validation/adapter code with synthetic OpenAI, Twilio and Resend transport. */
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  modules = root + "/node_modules",
  out = root + "/docs/assistant-messaging-repair";
fs.mkdirSync(out + "/screenshots", { recursive: true });
const localRequire = require("node:module").createRequire(
  root + "/package.json",
);
const { chromium } = localRequire("playwright"),
  esbuild = localRequire("esbuild"),
  { setup } = require("./assistant-messaging/fixture.cjs");
(async () => {
  const built = await esbuild.build({
    entryPoints: [__dirname + "/assistant-messaging/entry.jsx"],
    bundle: true,
    write: false,
    jsx: "automatic",
    nodePaths: [modules],
    tsconfig: root + "/tsconfig.json",
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    alias: {
      "next/navigation": root + "/scripts/assistant-browser/stubs.jsx",
      "@clerk/nextjs": root + "/scripts/assistant-browser/stubs.jsx",
    },
  });
  const css = fs
    .readdirSync(root + "/.next/static/css")
    .filter((p) => p.endsWith(".css"))
    .map((p) => fs.readFileSync(root + "/.next/static/css/" + p, "utf8"))
    .join("\n");
  let state;
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1"),
        pathname = url.pathname;
      if (pathname === "/app.js") {
        res.setHeader("content-type", "text/javascript");
        return res.end(built.outputFiles[0].text);
      }
      if (pathname.startsWith("/_next/static/")) {
        const file = path.resolve(
          root + "/.next/static",
          pathname.slice("/_next/static/".length),
        );
        if (file.startsWith(root + "/.next/static/") && fs.existsSync(file))
          return res.end(fs.readFileSync(file));
        res.statusCode = 404;
        return res.end();
      }
      if (pathname.startsWith("/api/")) {
        const routes = {
          "/api/assistant/chat": "chat",
          "/api/assistant/approve": "approve",
          "/api/assistant/history": "history",
          "/api/assistant/proposals": "proposals",
          "/api/assistant/work": "work",
        };
        if (!routes[pathname]) {
          res.statusCode = 404;
          return res.end("{}");
        }
        let body = "";
        for await (const b of req) body += b;
        const request = new Request("http://127.0.0.1" + req.url, {
          method: req.method,
          headers: req.headers,
          ...(!["GET", "HEAD"].includes(req.method) ? { body } : {}),
        });
        const handler = state.f.load(
          "app/api/assistant/" + routes[pathname] + "/route.ts",
        )[req.method];
        const response = await handler(request, undefined);
        res.writeHead(
          response.status,
          Object.fromEntries(response.headers.entries()),
        );
        return res.end(Buffer.from(await response.arrayBuffer()));
      }
      res.setHeader("content-type", "text/html");
      return res.end(
        `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/app.js"></script>`,
      );
    } catch (e) {
      console.error(e);
      res.statusCode = 500;
      res.end("{}");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const outcomes = [];
  try {
    for (const width of [1440, 1280, 768, 390])
      for (const channel of ["sms", "email"]) {
        const s = setup();
        state = s;
        s.setAction(s.message(channel));
        const page = await browser.newPage({
            viewport: { width, height: 1050 },
          }),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", (r) =>
          new URL(r.request().url()).hostname === "127.0.0.1"
            ? r.continue()
            : r.abort(),
        );
        try {
          await page.goto(
            `http://127.0.0.1:${server.address().port}/dashboard/contacts/00000000-0000-4000-8000-000000000002`,
          );
          await page
            .getByRole("button", { name: "Open assistant", exact: true })
            .click();
          await page
            .getByRole("textbox", { name: "Assistant command", exact: true })
            .fill(
              channel === "sms"
                ? "Draft a text to Jordan about Friday."
                : "Draft an email to Jordan about Friday.",
            );
          await page
            .getByRole("button", { name: "Prepare response", exact: true })
            .click();
          const send = page.getByRole("button", {
            name: "Approve & send this message",
            exact: true,
          });
          await send.waitFor();
          assert.equal(await send.isDisabled(), true);
          assert.equal(s.transmissions.length, 0);
          await page
            .getByRole("checkbox", { name: /I reviewed the exact target/ })
            .check();
          await page.screenshot({
            path: `${out}/screenshots/${channel}-preview-${width}.png`,
            fullPage: true,
          });
          await send.click();
          await page
            .getByRole("status")
            .filter({ hasText: /Provider (accepted|submission recorded)/ })
            .waitFor();
          assert.equal(s.transmissions.length, 1);
          assert.equal(
            s.f.tables.outbound_messages[0].submission_status,
            "accepted",
          );
          await page.screenshot({
            path: `${out}/screenshots/${channel}-accepted-${width}.png`,
            fullPage: true,
          });
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          assert.deepEqual(errors, []);
          const record = s.f.tables.outbound_messages[0];
          await s.f
            .load("lib/delivery/store.ts")
            .insertDeliveryEvent({
              owner_id: s.owner,
              message_id: record.id,
              provider: channel === "sms" ? "twilio" : "resend",
              event_key: "synthetic-delivery-failure",
              event_type: channel === "sms" ? "undelivered" : "bounced",
              occurred_at: new Date().toISOString(),
              source: "webhook",
              error_code: "30003",
            });
          await page.getByText(/Delivery failed \(/).waitFor();
          const displayed = await page.getByRole("status").allTextContents();
          assert.ok(displayed.some((v) => /Delivery failed/.test(v)));
          assert.ok(
            (await page
              .getByText(
                channel === "sms" ? "+15555550001" : "beta@example.test",
                { exact: false },
              )
              .count()) > 0,
          );
          outcomes.push({
            width,
            channel,
            commandToProvider: "passed",
            separateConfirmation: true,
            providerSubmissions: s.transmissions.length,
            confirmedDeliveryClaimed: displayed.some((v) =>
              /message (?:was )?delivered/i.test(v),
            ),
            providerFailureInEvidence: true,
            assistantShowsFailure: displayed.some((v) =>
              /undelivered|bounced|delivery failed/i.test(v),
            ),
            actualSenderShown:
              (await page
                .getByText(
                  channel === "sms" ? "+15555550001" : "beta@example.test",
                  { exact: false },
                )
                .count()) > 0,
            trace: s.trace,
          });
          await page
            .getByRole("button", { name: "Close", exact: true })
            .click();
          assert.equal(
            await page.locator("#page-draft").inputValue(),
            "Unsent CRM note",
          );
        } finally {
          await page.close();
          s.restore();
        }
      }
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
  fs.writeFileSync(
    out + "/ui-results.json",
    JSON.stringify(outcomes, null, 2) + "\n",
  );
  console.log(JSON.stringify(outcomes, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
