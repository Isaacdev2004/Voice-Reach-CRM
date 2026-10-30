/* Actual components with isolated fixtures; never contacts live services. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { state, handle, reset } = require("./financing-browser/fixtures.cjs")();
const { chromium } = require("playwright"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "myari-notes-"));
  const adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, "financing-browser/entry.jsx")],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
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
      path.join(root, "components/financing/financing-studio.css"),
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
  const results = [];
  const output = path.join(root, "docs/mortgage-pdf-2/browser");
  fs.mkdirSync(output, { recursive: true });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const width of [1440, 768, 390]) {
      reset();
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        acceptDownloads: true,
      });
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/dashboard/mortgage");
      await page
        .getByRole("heading", { name: "Clarity behind every number." })
        .waitFor();
      await page.getByLabel("Home price", { exact: true }).fill("450000");
      await page.locator("#mortgage-down-payment-input").fill("90000");
      await page.getByLabel("Interest rate", { exact: true }).fill("6.25");
      await page
        .getByLabel("Property tax (annual)", { exact: true })
        .fill("4800");
      await page
        .getByLabel("Home insurance (annual)", { exact: true })
        .fill("1800");
      await page.getByLabel("HOA (monthly)", { exact: true }).fill("0");
      await page
        .getByLabel("I have reviewed the inputs", { exact: false })
        .check();
      await page
        .getByRole("button", { name: "Preview PDF", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Your mortgage presentation",
        exact: true,
      });
      await dialog.waitFor();
      await dialog
        .getByRole("button", { name: "Download PDF", exact: true })
        .waitFor();
      assert.equal(await dialog.getByRole("alert").count(), 0);
      await page.screenshot({
        path: path.join(output, `preview-${width}.png`),
        fullPage: false,
      });
      const pending = page.waitForEvent("download");
      await dialog
        .getByRole("button", { name: "Download PDF", exact: true })
        .click();
      const download = await pending;
      assert.ok(download.suggestedFilename().endsWith("-estimate.pdf"));
      await download.saveAs(path.join(output, `download-${width}.pdf`));
      await dialog
        .getByLabel("PDF branding template", { exact: true })
        .selectOption("cobranded");
      await dialog
        .getByRole("button", { name: "Download PDF", exact: true })
        .waitFor();
      await dialog.getByRole("checkbox").uncheck();
      await dialog
        .getByRole("button", { name: "Download PDF", exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      await page
        .getByRole("region", { name: "Estimated monthly payment breakdown" })
        .waitFor();
      assert.deepEqual(errors, []);
      results.push({ width, passed: true });
      await page.close();
    }
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(
      "PASS mortgage PDF preview, template selection, generation and download at desktop, tablet and mobile sizes. All CRM/provider services are synthetic.",
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
