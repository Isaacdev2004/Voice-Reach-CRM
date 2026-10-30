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
  let mutations = 0;
  const server = http.createServer((req, res) => {
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
        });
        await page.goto(`http://127.0.0.1:${server.address().port}/${mode}`);
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
        await page.close();
      }
    const loading = await browser.newPage();
    await loading.goto(`http://127.0.0.1:${server.address().port}/sign-in?fixture=delayed`);
    await loading.getByRole("status").filter({hasText:"Connecting securely"}).waitFor();
    await loading.getByRole("button",{name:"Continue",exact:true}).waitFor();
    assert.equal(await loading.getByRole("status").count(),0);
    await loading.close();
    const failed = await browser.newPage();
    await failed.goto(`http://127.0.0.1:${server.address().port}/sign-in?fixture=empty`);
    await failed.getByRole("alert").waitFor({timeout:16000});
    await failed.getByRole("button",{name:"Retry sign in",exact:true}).waitFor();
    assert.match(await failed.getByRole("alert").innerText(),/No sign-in attempt was submitted/);
    await failed.close();
    assert.equal(mutations, 0);
    console.log(
      "PASS: sign-in/signup visual fixtures at 1440/768/390, headings, legal links, no overflow, rectangular Clerk card and zero API mutations. Live Clerk authentication not exercised.",
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
