/* Read-only production verification: no login, form submission or provider mutations. */
const assert = require("node:assert/strict"),
  fs = require("fs");
const { chromium } = require("playwright");
(async () => {
  const origin = "https://www.myari.io",
    out = "artifacts/public-production-qa";
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const results = [];
  try {
    const media = await fetch(origin + "/videos/ari-demo.mp4", {
      method: "HEAD",
      signal: AbortSignal.timeout(15000),
    });
    console.log(
      `Existing video asset: HTTP ${media.status}, ${media.headers.get("content-type")}, ${media.headers.get("content-length")} bytes.`,
    );
    assert.equal(media.status, 200, "Existing video file must be reachable");
    for (const width of [1440, 390]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      const errors = [];
      await page.addInitScript(() => {
        window.__mediaFailures = [];
        document.addEventListener(
          "error",
          (event) => {
            if (event.target instanceof HTMLMediaElement)
              window.__mediaFailures.push({
                code: event.target.error?.code,
                message: event.target.error?.message,
                source: new URL(event.target.currentSrc || location.href)
                  .pathname,
              });
          },
          true,
        );
      });
      page.on("response", (response) => {
        if (response.url().includes(".mp4"))
          console.log(
            `Video response: ${response.status()} ${new URL(response.url()).pathname} ${response.headers()["content-type"] || ""}`,
          );
      });
      page.on("pageerror", (e) => errors.push(e.message));
      for (const route of [
        "/",
        "/pricing",
        "/features",
        "/features/lead-management",
        "/features/campaign-builder",
        "/features/analytics",
        "/resources/ultimate-real-estate-lead-follow-up-guide",
        "/contact",
        "/playbook",
        "/sign-in",
        "/sign-up?plan=growth",
      ]) {
        const response = await page.goto(origin + route, {
          waitUntil: "networkidle",
        });
        assert.equal(response.status(), 200, route);
        if (!route.startsWith("/sign-"))
          assert.equal(await page.locator("h1").count(), 1);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        if (route.startsWith("/sign-")) {
          if (overflow)
            console.warn(
              `Existing hosted authentication layout overflow: ${route} at ${width}px`,
            );
        } else assert.equal(overflow, false, route);
        if (route === "/") {
          await page
            .getByRole("button", { name: "Watch MyARI in Action", exact: true })
            .click();
          const dialog = page.getByRole("dialog");
          await dialog.waitFor();
          try {
            await page.locator("video").evaluate((v) => v.play());
          } catch (error) {
            console.log(
              "Media diagnostics:",
              JSON.stringify(await page.evaluate(() => window.__mediaFailures)),
            );
            await page.screenshot({
              path: `${out}/video-failure-${width}.png`,
            });
            throw error;
          }
          await page.waitForFunction(
            () => document.querySelector("video")?.currentTime > 0,
          );
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("dialog").count(), 0);
        }
        if (route === "/pricing") {
          await page
            .getByAltText(
              "Sunlit organic-modern home office with an olive tree, natural oak and travertine",
            )
            .waitFor();
          const plans = require("./campaign-audit/harness.cjs")
            .fixture()
            .load("lib/billing/plans.ts")
            .PLAN_OPTIONS.filter((p) => !p.contactSales);
          const prices = page.locator(".approved-price strong");
          for (let i = 0; i < plans.length; i++)
            assert.equal(await prices.nth(i).innerText(), `$${plans[i].price}`);

          await page
            .getByRole("button", { name: "Yearly", exact: true })
            .click();
          assert.equal(
            await page
              .getByRole("button", { name: "Yearly", exact: true })
              .getAttribute("aria-pressed"),
            "true",
          );
          for (let i = 0; i < plans.length; i++)
            assert.equal(
              await prices.nth(i).innerText(),
              `$${plans[i].price * 10}`,
            );
          const annual = await page
            .locator(".approved-plan-cta")
            .first()
            .getAttribute("href");
          assert.ok(annual.includes("billing=yearly"));
          await page
            .getByRole("button", { name: "Monthly", exact: true })
            .click();
        }
        await page.screenshot({
          path: `${out}/${width}-${route === "/" ? "home" : route.slice(1).replace(/[^a-zA-Z0-9_-]/g, "-")}.png`,
          fullPage: true,
        });
        results.push({
          route,
          width,
          status: response.status(),
          overflow,
        });
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    const reference = await fetch("https://www.nar.realtor/", {
      signal: AbortSignal.timeout(15000),
    })
      .then((response) => ({
        url: response.url,
        status: response.status,
        verified: response.ok,
      }))
      .catch(() => ({
        url: "https://www.nar.realtor/",
        verified: false,
        status: "unavailable",
      }));
    fs.writeFileSync(
      `${out}/external-reference.json`,
      JSON.stringify(reference, null, 2),
    );
    console.log(
      `External NAR reference: ${reference.status}; verified=${reference.verified}. General reading only, not evidence of conversion claims.`,
    );
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
    console.log(
      "Public production routes, actual video playback, modal close, pricing toggle and responsive screenshots passed. No records or communications changed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
