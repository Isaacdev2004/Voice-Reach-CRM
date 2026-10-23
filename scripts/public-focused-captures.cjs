/* Real UI, isolated synthetic fixtures. No live backend/provider requests. */
const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  assert = require("assert/strict"),
  sharp = require("sharp");
const { chromium } = require("playwright"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    adapter = path.join(__dirname, "contacts-browser");
  const bundles = {};
  for (const name of ["contacts", "campaigns"]) {
    bundles[name] = (
      await esbuild.build({
        entryPoints: [path.join(__dirname, `marketing-captures/${name}.jsx`)],
        bundle: true,
        write: false,
        jsx: "automatic",
        tsconfig: path.join(root, "tsconfig.json"),
        loader: { ".css": "empty" },
        define: { "process.env.NODE_ENV": '"development"' },
        alias: {
          "next/server": path.join(adapter, "server.jsx"),
          "next/link": path.join(adapter, "link.jsx"),
          "next/image": path.join(adapter, "image.jsx"),
          "next/navigation": path.join(adapter, "stubs.jsx"),
          "@clerk/nextjs": path.join(adapter, "stubs.jsx"),
        },
      })
    ).outputFiles[0].text;
  }
  const iconFont =
    "/workspace/work/contacts-metrics/ui-review/material-icons.ttf";
  const css =
    `@font-face{font-family:'Material Symbols Outlined';src:url(/review-icons.ttf)}.material-symbols-outlined{font-family:'Material Symbols Outlined'}` +
    fs
      .readdirSync(".next/static/css")
      .filter((x) => x.endsWith(".css"))
      .map((x) =>
        fs
          .readFileSync(".next/static/css/" + x, "utf8")
          .replaceAll("../media/", "/review-fonts/")
          .replaceAll("/_next/static/media/", "/review-fonts/"),
      )
      .join("\n");
  const fontClasses = [
    ...css.matchAll(/\.([\w-]+)\{--font-(?:serif|inter|hand):[^}]+\}/g),
  ]
    .map((m) => m[1])
    .join(" ");
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    if (u.pathname === "/review-icons.ttf")
      return res.end(fs.readFileSync(iconFont));
    if (u.pathname.endsWith(".js")) {
      res.setHeader("Content-Type", "application/javascript");
      return res.end(
        bundles[u.pathname.includes("contacts") ? "contacts" : "campaigns"],
      );
    }
    if (u.pathname === "/style.css") {
      res.setHeader("Content-Type", "text/css");
      return res.end(css);
    }
    if (u.pathname.startsWith("/dashboard")) {
      const name = u.pathname.includes("contacts") ? "contacts" : "campaigns";
      res.setHeader("Content-Type", "text/html");
      return res.end(
        `<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="${fontClasses}"><div id="root"></div><script src="/${name}.js"></script></body></html>`,
      );
    }
    let file = u.pathname.startsWith("/review-fonts/")
      ? path.join(root, ".next/static/media", path.basename(u.pathname))
      : path.join(root, "public", u.pathname);
    try {
      res.end(fs.readFileSync(file));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 2,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      `http://127.0.0.1:${server.address().port}/dashboard/contacts`,
    );
    await page.getByRole("button", { name: /Total Contacts: 32/ }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator(".contacts-workspace");
    await page.locator(".contacts-table tbody tr").first().click();
    const rect = await card.boundingBox();
    assert.ok(rect);
    const shot = await page.screenshot({
      clip: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: Math.min(rect.height, 600),
      },
    });
    await sharp(shot)
      .webp({ quality: 96 })
      .toFile("public/brand/product-captures/contacts.webp");
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(
      `http://127.0.0.1:${server.address().port}/dashboard/campaigns?edit=00000000-0000-4000-8000-000000000002`,
    );
    await page.waitForFunction(
      () =>
        document.querySelector('input[aria-label="Campaign name"]')?.value ===
        "Thoughtful buyer follow-up",
    );
    await page.evaluate(() => document.fonts.ready);
    const body = await page.locator("body").innerText();
    assert.match(body, /Automation sequence/);
    assert.match(body, /Casual search-status SMS/);
    assert.match(body, /Low-pressure availability VM/);
    await page
      .getByLabel("Campaign description", { exact: true })
      .fill(
        "A measured email, SMS and voicemail sequence. Review every step before enrollment.",
      );
    const frame = await page.locator("#root > div").boundingBox();
    const crop = {
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
    };
    const campaign = await page.screenshot({ clip: crop });
    await sharp(campaign)
      .webp({ quality: 96 })
      .toFile("public/brand/product-captures/builder.webp");
    let registry = fs.readFileSync("lib/marketing/product-captures.ts", "utf8");
    for (const name of ["contacts", "builder"]) {
      const meta = await sharp(
        `public/brand/product-captures/${name}.webp`,
      ).metadata();
      registry = registry.replace(
        new RegExp(`(\\b${name}: \\{[^}]*?width: )\\d+(,[^}]*?height: )\\d+`),
        `$1${meta.width}$2${meta.height}`,
      );
    }
    fs.writeFileSync("lib/marketing/product-captures.ts", registry);
    assert.deepEqual(errors, []);
    console.log(
      "Retina Contacts crop and actual editable Campaign Builder captured; synthetic data only.",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
