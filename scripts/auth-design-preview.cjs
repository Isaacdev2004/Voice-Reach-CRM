/* Real auth shell/components with visual Clerk fixtures. No credentials or live login. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  esbuild = require("esbuild");
const { chromium } = require("playwright");
(async () => {
  const root = path.resolve(__dirname, ".."),
    adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, "auth-design-preview/entry.jsx")],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    alias: {
      "next/link": path.join(adapters, "link.jsx"),
      "next/image": path.join(adapters, "image.jsx"),
      "next/navigation": path.join(adapters, "stubs.jsx"),
      "@clerk/nextjs": path.join(__dirname, "auth-design-preview/clerk.jsx"),
    },
  });
  const css =
    fs
      .readdirSync(path.join(root, ".next/static/css"))
      .filter((x) => x.endsWith(".css"))
      .map((x) =>
        fs.readFileSync(path.join(root, ".next/static/css", x), "utf8"),
      )
      .join("\n") +
    fs.readFileSync(
      path.join(root, "components/marketing/public-auth-refinement.css"),
      "utf8",
    ) +
    `
  .fixture-social{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;background:white;border:1px solid #dfd6cc;color:#51483e;font-size:13px;font-weight:500}.fixture-google{font-size:19px;color:#4285f4;font-weight:bold}.fixture-divider{display:flex;align-items:center;gap:16px;margin:24px 0;color:#958b80;font-size:11px}.fixture-divider span{height:1px;flex:1;background:#e8e1d8}.fixture-label{display:block;font-size:12px;font-weight:500;color:#51483e;margin:0 0 18px}.fixture-input{display:block;width:100%;border:1px solid #ddd4c9;padding:0 14px;margin-top:8px;background:#fff;color:#292723;font-size:13px}.fixture-primary{width:100%;display:flex;justify-content:center;align-items:center;gap:12px;font-size:13px;font-weight:600;border:0;margin-top:6px}`;
  let mutations = 0,
    overviewFails = false,
    overviewAvailable = true;
  const overviewRequests = [];
  const server = http.createServer(async (req, res) => {
    if (req.url === "/api/marketing/overview" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({ success: true, available: overviewAvailable }),
      );
    }
    if (req.url === "/api/marketing/overview" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      overviewRequests.push(JSON.parse(body));
      res.setHeader("Content-Type", "application/json");
      if (overviewFails) {
        res.statusCode = 502;
        return res.end(
          JSON.stringify({
            success: false,
            code: "overview_delivery_unconfirmed",
          }),
        );
      }
      return res.end(
        JSON.stringify({
          success: true,
          ok: true,
          capture: "accepted",
          delivery: "accepted",
        }),
      );
    }
    if (req.url.startsWith("/api/")) {
      mutations++;
      res.statusCode = 403;
      return res.end("No provider or billing calls allowed in design preview");
    }
    if (req.url === "/app.js") {
      res.setHeader("Content-Type", "text/javascript");
      return res.end(bundle.outputFiles[0].text);
    }
    if (req.url === "/style.css") {
      res.setHeader("Content-Type", "text/css");
      return res.end(css);
    }
    if (req.url.startsWith("/brand/")) {
      const f = path.join(root, "public", req.url.split("?")[0]);
      if (fs.existsSync(f)) {
        res.setHeader(
          "Content-Type",
          f.endsWith("webp")
            ? "image/webp"
            : f.endsWith("svg")
              ? "image/svg+xml"
              : "image/png",
        );
        return res.end(fs.readFileSync(f));
      }
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><title>MyARI auth design preview</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    for (const width of [1440, 768, 390])
      for (const mode of ["sign-in", "sign-up"]) {
        const page = await browser.newPage({
          viewport: { width, height: 960 },
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        await page.goto(
          `http://127.0.0.1:${server.address().port}/${mode}?plan=growth&billing=yearly&utm_source=auth-review&session_id=private`,
        );
        await page
          .getByRole("button", {
            name: mode === "sign-in" ? "Continue" : "Create account",
            exact: false,
          })
          .last()
          .waitFor();
        await page
          .locator(".auth-editorial-image")
          .evaluate((img) => img.decode());
        assert.equal(
          await page
            .getByRole("heading", {
              name:
                mode === "sign-in" ? "Welcome back." : "Create your account",
            })
            .count(),
          1,
        );
        assert.equal(
          await page.getByRole("link", { name: "Privacy Policy" }).count(),
          1,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${mode} overflows at ${width}`,
        );
        assert.equal(
          await page
            .locator(".cl-cardBox")
            .evaluate((e) => getComputedStyle(e).borderTopLeftRadius),
          "12px",
        );
        await page.screenshot({
          path: path.join(
            root,
            `docs/auth-refresh/previews/${mode}-${width}.jpg`,
          ),
          fullPage: true,
          type: "jpeg",
          quality: 85,
        });
        assert.equal(await page.locator(".auth-overview-form").count(), 0);
        await page.locator(".auth-explore > summary").click();
        await page
          .getByRole("button", { name: "Email me an overview" })
          .click();
        const form = page.locator(".auth-overview-form");
        await form.waitFor();
        assert.equal(await form.getByRole("checkbox").isChecked(), false);
        await form
          .getByRole("textbox", { name: "Email address", exact: true })
          .fill("agent@example.test");
        if (width === 1440 && mode === "sign-in") {
          await page.screenshot({
            path: path.join(
              root,
              "docs/auth-refresh/previews/explore-email-1440.jpg",
            ),
            type: "jpeg",
            quality: 85,
            fullPage: true,
          });
          overviewFails = true;
          await form
            .getByRole("button", { name: "Email my overview", exact: true })
            .click();
          await page.getByRole("alert").waitFor();
          assert.equal(
            await form
              .getByRole("textbox", { name: "Email address", exact: true })
              .inputValue(),
            "agent@example.test",
          );
          overviewFails = false;
        }
        await form
          .getByRole("button", { name: "Email my overview", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "Your overview is on its way." })
          .waitFor();
        const submission = overviewRequests.at(-1);
        assert.equal(submission.updatesConsent, false);
        assert.deepEqual(submission.context, {
          plan: "growth",
          billing: "yearly",
          utm_source: "auth-review",
        });
        assert.equal(JSON.stringify(submission).includes("private"), false);
        await page
          .getByRole("button", { name: "Watch the walkthrough now" })
          .click();
        assert.equal(await page.locator("video[controls]").count(), 1);
        assert.equal(
          await page.locator("video").getAttribute("autoplay"),
          null,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await page.locator(".auth-explore > summary").click();
        assert.equal(
          await page.locator(".cl-rootBox").count(),
          1,
          "Clerk form remains mounted while exploring",
        );
        if (width === 390 && mode === "sign-in") {
          overviewAvailable = false;
          await page.locator(".auth-explore > summary").click();
          await page
            .getByRole("button", { name: "Email me an overview" })
            .click();
          await page
            .getByText("Overview emails aren’t available here yet.", {
              exact: false,
            })
            .waitFor();
          assert.equal(
            await page.locator(".auth-overview-form").count(),
            0,
            "never collect email when delivery is unavailable",
          );
          overviewAvailable = true;
        }
        await page.close();
      }
    assert.equal(mutations, 0);
    assert.equal(overviewRequests.length, 7);
    console.log(
      "PASS: immersive auth at 1440/768/390, safe opt-in email overview/retry/success, retained plan context without checkout tokens, on-demand walkthrough without autoplay, Clerk remains mounted and no billing/account/campaign API mutations. All providers mocked; live Clerk authentication not exercised.",
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
