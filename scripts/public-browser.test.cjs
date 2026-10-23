/* Actual components with isolated fixtures; never contacts live services. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const sharp = require("sharp");
const { chromium } = require("playwright"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "myari-public-"));
  const adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    plugins:
      process.env.PUBLIC_REVIEW_BEFORE === "1"
        ? [
            {
              name: "baseline",
              setup(build) {
                build.onLoad({ filter: /\.(tsx|ts)$/ }, (args) => {
                  const rel = path.relative(root, args.path);
                  if (
                    [
                      "app/features/page.tsx",
                      "components/marketing/marketing-shell.tsx",
                      "components/pages/stitch/LandingPage.tsx",
                      "lib/marketing/hero-images.ts",
                      "components/marketing/marketing-hero-image.tsx",
                      "lib/seo/feature-pages.ts",
                      "lib/seo/feature-pages-additions.ts",
                    ].includes(rel)
                  )
                    return {
                      contents: require("node:child_process").execFileSync(
                        "git",
                        ["show", `861e942:${rel}`],
                        { cwd: root, encoding: "utf8" },
                      ),
                      loader: "tsx",
                    };
                });
              },
            },
          ]
        : [],
    entryPoints: [path.join(__dirname, "public-browser/entry.jsx")],
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
  const css =
    (iconFont
      ? "@font-face{font-family:'Material Symbols Outlined';src:url(/review-icons.ttf)}.material-symbols-outlined{font-family:'Material Symbols Outlined'}"
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
    (process.env.PUBLIC_REVIEW_BEFORE === "1"
      ? ""
      : fs.readFileSync(
          path.join(root, "components/marketing/public-website.css"),
          "utf8",
        ));
  const fontClasses = [
    ...css.matchAll(/\.([\w-]+)\{--font-(?:serif|inter|hand):[^}]+\}/g),
  ]
    .map((m) => m[1])
    .join(" ");
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
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
    if (
      file === "/" ||
      ["/features", "/contact", "/pricing"].some((p) => file.startsWith(p))
    ) {
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
      ? path.join(root, ".next/static/media", path.basename(file))
      : path.resolve(root, "public", "." + file);
    if (!local.startsWith(root + path.sep)) {
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
  const output = path.join(root, "docs/public-website");
  fs.mkdirSync(output, { recursive: true });
  try {
    const before = process.env.PUBLIC_REVIEW_BEFORE === "1";
    for (const route of ["/", "/features"])
      for (const width of [1440, 1920, 1024, 768, 390]) {
        const page = await browser.newPage({
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}${route}`);
        await page.locator("h1").waitFor();
        await page.evaluate(() => document.fonts.ready);
        const shot = await page.screenshot({ fullPage: true });
        await sharp(shot)
          .webp({ quality: 90 })
          .toFile(
            path.join(
              output,
              `${before ? "before" : "after"}-${route === "/" ? "home" : "features"}-${width}.webp`,
            ),
          );
        if (!before && route === "/" && [1440, 390].includes(width))
          await page.screenshot({
            path: path.join(output, `homepage-preview-${width}.png`),
            fullPage: false,
          });
        if (!before) {
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          assert.equal(await page.locator("h1").count(), 1);
          assert.equal(
            await page
              .locator("img")
              .evaluateAll((imgs) =>
                imgs.every((i) => i.complete && i.naturalWidth > 0),
              ),
            true,
          );
          if (width > 1000) {
            const trigger = page.getByRole("button", {
              name: "Product",
              exact: true,
            });
            await trigger.click();
            await page.locator("#public-Product").waitFor();
            assert.equal(await page.locator("#public-Product a").count(), 7);
            await page.keyboard.press("Escape");
            assert.equal(await trigger.getAttribute("aria-expanded"), "false");
            assert.equal(
              await trigger.evaluate((e) => e === document.activeElement),
              true,
            );
            await trigger.click();
            await page.mouse.click(8, 600);
            assert.equal(await trigger.getAttribute("aria-expanded"), "false");
            await page
              .getByRole("button", { name: "Solutions", exact: true })
              .click();
            assert.equal(await page.locator("#public-Solutions a").count(), 4);
            await page.keyboard.press("Escape");
          } else {
            await page.getByRole("button", { name: "Open navigation" }).click();
            await page
              .locator("#public-mobile-navigation summary")
              .filter({ hasText: "Product" })
              .click();
            await page
              .locator("#public-mobile-navigation")
              .getByRole("link", { name: "CRM & Contacts", exact: true })
              .waitFor();
            await page.keyboard.press("Escape");
            assert.equal(
              await page
                .getByRole("button", { name: "Open navigation" })
                .getAttribute("aria-expanded"),
              "false",
            );
          }
          await page.evaluate(() =>
            document.addEventListener("click", (e) => {
              if (
                e.target
                  .closest("a")
                  ?.getAttribute("href")
                  ?.startsWith("/sign-up")
              )
                e.preventDefault();
            }),
          );
          await page.locator('.public-nav-actions a[href^="/sign-up"]').click();
          assert.equal(
            await page.evaluate(() => localStorage.getItem("ari_pending_plan")),
            "growth",
          );
          if (route === "/features") {
            for (const name of [
              "Contacts",
              "Campaigns",
              "AI Assistant",
              "Calendar & Tasks",
              "Voice Studio",
              "Reporting",
              "Dashboard",
            ]) {
              await page.getByRole("tab", { name, exact: true }).click();
              assert.equal(
                await page
                  .getByRole("tab", { name, exact: true })
                  .getAttribute("aria-selected"),
                "true",
              );
              assert.equal(await page.getByRole("tabpanel").count(), 1);
            }
            await page
              .getByRole("tab", { name: "Dashboard", exact: true })
              .focus();
            await page.keyboard.press("ArrowRight");
            assert.equal(
              await page
                .getByRole("tab", { name: "Contacts", exact: true })
                .getAttribute("aria-selected"),
              "true",
            );
          }
          assert.deepEqual(errors, []);
          results.push({
            route,
            width,
            overflow: false,
            errors: 0,
            navigation: true,
            signupPlan: true,
          });
        }
        await page.close();
      }
    if (!before) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 900 },
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/contact`);
      for (const failed of [true, false]) {
        await page.evaluate((v) => {
          window.__failContact = v;
        }, failed);
        await page.getByLabel("Name", { exact: true }).fill("Synthetic Agent");
        await page
          .getByLabel("Email", { exact: true })
          .fill("agent@example.test");
        await page
          .locator("#contact-message")
          .fill("Synthetic test: please do not send.");
        await page
          .getByRole("button", { name: "Send message", exact: true })
          .click();
        if (failed) {
          await page.getByRole("alert").waitFor();
          assert.match(
            await page
              .getByRole("link", { name: "Open email app" })
              .getAttribute("href"),
            /^mailto:hello@myari.io/,
          );
          assert.equal(
            await page
              .getByRole("button", { name: "Send message", exact: true })
              .isEnabled(),
            true,
          );
        } else await page.getByText("Message sent", { exact: true }).waitFor();
      }
      assert.equal(
        await page.evaluate(
          () =>
            window.__submissions.filter((r) => r.url === "/api/contact").length,
        ),
        2,
      );
      await page.close();
    }
    if (!before)
      fs.writeFileSync(
        path.join(output, "browser-results.json"),
        JSON.stringify(results, null, 2),
      );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
