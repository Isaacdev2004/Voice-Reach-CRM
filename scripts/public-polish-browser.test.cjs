/* Actual public components, no live auth/provider requests. Video bytes are local. */
const assert = require("node:assert/strict"),
  fs = require("fs"),
  path = require("path"),
  http = require("http"),
  os = require("os"),
  cp = require("child_process"),
  sharp = require("sharp");
const { chromium } = require("playwright"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    adapters = path.join(__dirname, "contacts-browser"),
    before = process.env.PUBLIC_POLISH_BEFORE === "1";
  const bundle = (
    await esbuild.build({
      entryPoints: [path.join(__dirname, "public-browser/polish-entry.jsx")],
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
      plugins: before
        ? [
            {
              name: "baseline",
              setup(build) {
                build.onLoad({ filter: /\.(tsx|ts)$/ }, (args) => {
                  const rel = path.relative(root, args.path);
                  if (!/^(app|components|lib)\//.test(rel)) return;
                  try {
                    return {
                      contents: cp.execFileSync(
                        "git",
                        ["show", `45aca8f:${rel}`],
                        {
                          cwd: root,
                          encoding: "utf8",
                          stdio: ["ignore", "pipe", "ignore"],
                        },
                      ),
                      loader: "tsx",
                    };
                  } catch {}
                });
              },
            },
          ]
        : [],
    })
  ).outputFiles[0].text;
  const css =
    fs
      .readdirSync(".next/static/css")
      .filter((x) => x.endsWith(".css"))
      .map((x) =>
        fs
          .readFileSync(".next/static/css/" + x, "utf8")
          .replaceAll("../media/", "/review-fonts/")
          .replaceAll("/_next/static/media/", "/review-fonts/"),
      )
      .join("\n") +
    ["public-website.css", "public-site-refinement.css"]
      .map((name) =>
        before
          ? cp.execFileSync(
              "git",
              ["show", `45aca8f:components/marketing/${name}`],
              { encoding: "utf8" },
            )
          : fs.readFileSync("components/marketing/" + name, "utf8"),
      )
      .join("\n");
  const fontClasses = [
    ...css.matchAll(/\.([\w-]+)\{--font-(?:serif|inter|hand):[^}]+\}/g),
  ]
    .map((m) => m[1])
    .join(" ");
  let videoRequests = 0;
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    if (u.pathname === "/bundle.js") {
      res.setHeader("Content-Type", "application/javascript");
      return res.end(bundle);
    }
    if (u.pathname === "/style.css") {
      res.setHeader("Content-Type", "text/css");
      return res.end(css);
    }
    if (
      u.pathname === "/" ||
      (["/features", "/pricing", "/resources", "/contact"].some((p) =>
        u.pathname.startsWith(p),
      ) &&
        !path.extname(u.pathname))
    ) {
      res.setHeader("Content-Type", "text/html");
      return res.end(
        `<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="${fontClasses}"><div id="root"></div><script src="/bundle.js"></script></body></html>`,
      );
    }
    const file = u.pathname.startsWith("/review-fonts/")
      ? path.join(root, ".next/static/media", path.basename(u.pathname))
      : path.resolve(root, "public", "." + u.pathname);
    if (!file.startsWith(root + path.sep)) {
      res.statusCode = 403;
      return res.end();
    }
    try {
      if (file.endsWith(".mp4")) {
        videoRequests++;
        res.setHeader("Content-Type", "video/mp4");
        const size = fs.statSync(file).size;
        const match = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = Number(match[1]),
            end = match[2] ? Number(match[2]) : size - 1;
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": end - start + 1,
          });
          return fs.createReadStream(file, { start, end }).pipe(res);
        }
        res.setHeader("Content-Length", size);
        return fs.createReadStream(file).pipe(res);
      }
      if (before && u.pathname.startsWith("/brand/product-captures/")) {
        try {
          return res.end(
            cp.execFileSync("git", ["show", `45aca8f:public${u.pathname}`], {
              maxBuffer: 10 * 1024 * 1024,
              stdio: ["ignore", "pipe", "ignore"],
            }),
          );
        } catch {}
      }
      res.end(fs.readFileSync(file));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`,
    browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox"],
    });
  const out = "docs/public-polish";
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  try {
    for (const route of [
      "/",
      "/pricing",
      "/features",
      "/features/lead-management",
      "/features/campaign-builder",
      "/features/analytics",
      "/resources/ultimate-real-estate-lead-follow-up-guide",
    ])
      for (const width of [1440, 1280, 768, 390]) {
        const page = await browser.newPage({
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
        });
        page.setDefaultTimeout(15000);
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(base + route);
        await page.locator("h1").waitFor();
        await page.evaluate(() => document.fonts.ready);
        const image = await page.screenshot({ fullPage: true });
        await sharp(image)
          .webp({ quality: 88 })
          .toFile(
            path.join(
              out,
              `${before ? "before" : "after"}-${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}-${width}.webp`,
            ),
          );
        if (!before) {
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
            route + width,
          );
          assert.equal(await page.locator("h1").count(), 1);
          assert.deepEqual(errors, []);
          assert.ok(
            await page
              .locator("img")
              .evaluateAll((imgs) =>
                imgs.every((img) => img.complete && img.naturalWidth > 0),
              ),
            route,
          );
          if (route === "/features")
            assert.equal(
              await page
                .locator(".features-hero-copy > .public-eyebrow")
                .count(),
              0,
            );
          if (route === "/pricing") {
            const cards = page.locator("#pricing article");
            assert.equal(await cards.count(), 3);
            if (width >= 1280) {
              for (const card of await cards.all()) {
                const price = await card
                  .locator(".public-plan-heading + div")
                  .boundingBox();
                assert.ok(
                  price && price.y + price.height < 800,
                  "Plan price should be visible in the first desktop viewport",
                );
              }
            }

            const plans = require("./campaign-audit/harness.cjs")
              .fixture()
              .load("lib/billing/plans.ts")
              .PLAN_OPTIONS.filter((plan) => plan.id !== "team");
            for (let index = 0; index < plans.length; index++)
              assert.ok(
                (await cards.nth(index).innerText()).includes(
                  `$${plans[index].price}`,
                ),
              );
            const monthly = await cards.allTextContents();
            await page
              .getByRole("button", { name: "Yearly", exact: true })
              .click();
            assert.equal(
              await page
                .getByRole("button", { name: "Yearly", exact: true })
                .getAttribute("aria-pressed"),
              "true",
            );
            assert.ok(
              (await cards.allTextContents()).every((t) => t.includes("/yr")),
            );
            for (let index = 0; index < plans.length; index++)
              assert.ok(
                (await cards.nth(index).innerText()).includes(
                  `$${plans[index].price * 10}`,
                ),
              );
            await page
              .getByRole("button", { name: "Monthly", exact: true })
              .click();
            assert.deepEqual(await cards.allTextContents(), monthly);
            assert.equal(
              await page
                .locator('#pricing article a[href^="/sign-up?plan="]')
                .count(),
              3,
            );
          }
          if (route === "/") {
            assert.equal(await page.locator("video").count(), 0);
            const beforeRequests = videoRequests;
            const trigger = page.getByRole("button", {
              name: "Watch MyARI in Action",
              exact: true,
            });
            await trigger.click();
            const dialog = page.getByRole("dialog");
            await dialog.waitFor();
            assert.equal(
              await dialog.getAttribute("aria-labelledby"),
              "walkthrough-title",
            );
            assert.equal(
              await page.locator("video").getAttribute("preload"),
              "none",
            );
            assert.equal(videoRequests, beforeRequests);
            assert.equal(
              await page.locator("video").evaluate((v) => v.paused),
              true,
            );
            for (let tab = 0; tab < 12; tab++) {
              await page.keyboard.press("Tab");
              assert.equal(
                await dialog.evaluate((d) =>
                  d.contains(document.activeElement),
                ),
                true,
              );
            }
            await dialog.getByText("Video transcript", { exact: true }).click();
            await page
              .getByText("Original narration and legacy illustrative footage", {
                exact: false,
              })
              .waitFor();
            if ([1440, 390].includes(width)) {
              const modalShot = await dialog.screenshot();
              await sharp(modalShot)
                .webp({ quality: 92 })
                .toFile(path.join(out, `walkthrough-modal-${width}.webp`));
            }
            await page.locator("video").evaluate((video) => video.play());
            await page.waitForFunction(() => {
              const v = document.querySelector("video");
              return v.currentTime > 0 && !v.paused && v.readyState >= 2;
            });
            assert.equal(
              await page.locator("video").evaluate((v) => v.muted),
              false,
            );
            assert.ok(
              await page
                .locator("video")
                .evaluate((v) => v.duration > 37 && v.duration < 39),
            );
            await page.locator("video").evaluate(async (v) => {
              if (document.fullscreenEnabled) {
                await v.requestFullscreen();
                await document.exitFullscreen();
              }
            });
            await page.locator("video").evaluate((v) => {
              v.currentTime = v.duration - 0.15;
            });
            await page
              .getByText("Ready to make follow-up effortless?", { exact: true })
              .waitFor();
            assert.equal(
              await dialog
                .getByRole("link", { name: "Explore Features", exact: true })
                .getAttribute("href"),
              "/features",
            );
            await page.keyboard.press("Escape");
            assert.equal(await page.locator("dialog").count(), 0);
            assert.equal(
              await trigger.evaluate((e) => e === document.activeElement),
              true,
            );
            const previewTrigger = page.getByRole("button", {
              name: "Play MyARI product walkthrough",
              exact: true,
            });
            await previewTrigger.scrollIntoViewIfNeeded();
            const previousScroll = await page.evaluate(() => window.scrollY);
            await previewTrigger.click();
            await page.locator("video").evaluate((v) => {
              window.__heldVideo = v;
              return v.play();
            });
            await page
              .getByRole("button", { name: "Close walkthrough", exact: true })
              .click();
            assert.equal(
              await page.evaluate(() => window.__heldVideo.paused),
              true,
            );
            assert.equal(await page.locator("video").count(), 0);
            assert.equal(
              Math.abs(
                (await page.evaluate(() => window.scrollY)) - previousScroll,
              ) < 2,
              true,
            );
            assert.equal(
              await page.evaluate(() => document.body.style.overflow),
              "",
            );
          }
          results.push({
            route,
            width,
            overflow: false,
            errors: 0,
            controls: true,
          });
        }
        await page.close();
      }
    if (!before)
      fs.writeFileSync(
        path.join(out, "browser-results.json"),
        JSON.stringify(results, null, 2),
      );
    console.log(
      `${before ? "Before captures" : results.length + " responsive render/interaction checks"} completed.`,
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
