/* Read-only production verification: no login, form submission or provider mutations. */
const assert = require("node:assert/strict"),
  fs = require("fs");
const { chromium } = require("playwright");
(async () => {
  const origin = "https://www.myari.io",
    out = "artifacts/public-production-qa";
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      const errors = [];
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
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          route,
        );
        if (route === "/") {
          await page
            .getByRole("button", { name: "Watch MyARI in Action", exact: true })
            .click();
          const dialog = page.getByRole("dialog");
          await dialog.waitFor();
          await page.locator("video").evaluate((v) => v.play());
          await page.waitForFunction(
            () => document.querySelector("video")?.currentTime > 0,
          );
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("dialog").count(), 0);
        }
        if (route === "/pricing") {
          await page
            .getByRole("button", { name: "Yearly", exact: true })
            .click();
          assert.equal(
            await page
              .getByRole("button", { name: "Yearly", exact: true })
              .getAttribute("aria-pressed"),
            "true",
          );
          await page
            .getByRole("button", { name: "Monthly", exact: true })
            .click();
        }
        await page.screenshot({
          path: `${out}/${width}-${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}.png`,
          fullPage: true,
        });
        results.push({
          route,
          width,
          status: response.status(),
          overflow: false,
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
