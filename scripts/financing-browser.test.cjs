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
  const output = path.join(root, "docs/financing-studio");
  fs.mkdirSync(output, { recursive: true });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const width of [1440, 1536, 1920, 768, 390]) {
      reset();
      const page = await browser.newPage({ viewport: { width, height: 1050 } }),
        errors = [];
      page.on("pageerror", (e) => {
        errors.push(e.message);
        console.error(e.stack);
      });
      await page.goto(origin + "/dashboard/mortgage");
      await page
        .getByRole("heading", { name: "Clarity behind every number." })
        .waitFor({ timeout: 6000 })
        .catch(async (e) => {
          console.error(
            (await page.locator("body").innerText()).slice(0, 3000),
          );
          await page.screenshot({ path: "/tmp/financing-debug.png" });
          throw e;
        });
      await page.locator(".fc-workflow").waitFor();
      await page
        .getByLabel("Selected client", { exact: true })
        .selectOption("00000000-0000-4000-8000-000000000002");
      await page
        .getByText("Property, partners & report assumptions", { exact: true })
        .click();
      await page
        .getByLabel("Saved property (from contact records)", { exact: true })
        .selectOption("00000000-0000-4000-8000-000000000002");
      assert.equal(
        await page
          .getByLabel("Property address (editable)", { exact: true })
          .inputValue(),
        "123 Example Lane",
      );
      await page.getByLabel("County", { exact: true }).fill("Synthetic County");
      await page.getByLabel("State", { exact: true }).fill("FL");
      await page
        .getByText("Property, partners & report assumptions", { exact: true })
        .click();
      // Actual mortgage controls and callback must settle without render loops.
      await page.getByLabel("Home price", { exact: true }).fill("300000");
      await page.locator("#mortgage-down-payment-input").fill("60000");
      await page.getByLabel("Interest rate", { exact: true }).fill("6");
      await page
        .getByLabel("Property tax (annual)", { exact: true })
        .fill("3600");
      await page
        .getByLabel("Home insurance (annual)", { exact: true })
        .fill("1200");
      await page.getByLabel("HOA (monthly)", { exact: true }).fill("50");
      const summary = page.getByRole("region", {
        name: "Estimated monthly payment breakdown",
      });
      await summary.waitFor();
      assert.match(await summary.innerText(), /1,888.92/);
      assert.equal(await summary.getByRole("img").count(), 1);
      if (width >= 1200) {
        const property = await page.locator(".fc-workflow").boundingBox(),
          payment = await summary.boundingBox();
        assert.ok(
          payment.y <= property.y && property.y - payment.y < 100,
          "Payment begins beside the section navigation, above property details",
        );
        assert.ok(
          payment.x > property.x + property.width,
          "Payment is right of property",
        );
      }
      await page
        .getByRole("button", { name: "Share / create report", exact: true })
        .click();
      await page.locator("#financing-estimate-review").waitFor();
      await page.evaluate(() => window.scrollTo(0, 0));

      await page.screenshot({
        path: path.join(output, `mortgage-${width}.png`),
        fullPage: false,
      });
      for (const tab of [
        "Seller Net Sheet",
        "Buyer Estimate",
        "Compare Offers",
        "Partners",
        "Resources",
      ]) {
        await page.getByRole("button", { name: tab, exact: true }).click();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${width} ${tab} overflow`,
        );
      }
      await page
        .getByRole("button", { name: "Seller Net Sheet", exact: true })
        .click();
      await page.getByLabel("Sale price", { exact: true }).fill("300000");
      await page.getByLabel("Loan payoff", { exact: true }).fill("150000");
      await page
        .getByLabel("Broker compensation % (negotiable)", { exact: true })
        .fill("2.5");
      assert.equal(
        await page.locator(".fc-total").textContent(),
        "$142,500.00",
      );
      await page
        .getByLabel("I have reviewed the inputs", { exact: false })
        .check();
      await page
        .getByRole("button", { name: "Preview / create report", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      assert.ok(
        (await page.locator(".fc-report-preview").innerText()).includes(
          "$142,500.00",
        ),
      );
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Download PDF", exact: true })
        .click();
      const d = await download;
      await d.saveAs(path.join(output, `seller-${width}.pdf`));
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      await page
        .getByRole("button", {
          name: "Save to client / report library",
          exact: true,
        })
        .click();
      await page
        .getByText("Report saved. Linked contact activity has been updated.", {
          exact: true,
        })
        .waitFor();
      assert.equal(state.reports.length, 1);
      assert.equal(
        state.reports[0].payload.context.contactId,
        "00000000-0000-4000-8000-000000000002",
      );
      await page
        .getByRole("button", { name: "Seller to net", exact: true })
        .click();
      await page
        .getByLabel("Target seller net ($)", { exact: true })
        .fill("150000");
      assert.equal(
        await page.locator(".fc-total").textContent(),
        "$307,692.31",
      );
      await page
        .getByRole("button", { name: "Buyer Estimate", exact: true })
        .click();
      await page
        .getByLabel("Purchase price ($)", { exact: true })
        .fill("300000");
      await page.getByLabel("Down payment ($)", { exact: true }).fill("60000");
      await page
        .getByLabel("Earnest money already paid ($)", { exact: true })
        .fill("10000");
      assert.equal(await page.locator(".fc-total").textContent(), "$50,000.00");
      await page
        .getByRole("button", { name: "Compare Offers", exact: true })
        .click();
      await page.getByLabel("Sale price", { exact: true }).fill("310000");
      await page
        .getByRole("button", { name: "+ Add offer", exact: true })
        .click();
      assert.equal(await page.locator(".fc-offer").count(), 2);
      await page.getByRole("button", { name: "Partners", exact: true }).click();
      await page
        .getByRole("button", { name: "+ Add title company", exact: true })
        .click();
      await page
        .getByLabel("Company name", { exact: true })
        .fill("Synthetic Title Partner");
      await page
        .getByLabel("Default for this partner type", { exact: true })
        .check();
      await page
        .getByRole("button", { name: "Save partner", exact: true })
        .click();
      await page
        .getByRole("heading", {
          name: "Synthetic Title PartnerDefault",
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("button", { name: "Use for report", exact: true })
        .click();
      await page
        .getByRole("button", { name: "+ Add lender", exact: true })
        .click();
      await page
        .getByLabel("Company name", { exact: true })
        .fill("Synthetic Lender");
      await page
        .getByLabel("Contact person", { exact: true })
        .fill("QA Lending Contact");
      await page
        .getByRole("button", { name: "Save partner", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Synthetic Lender", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Mortgage Calculator", exact: true })
        .click();
      await page
        .getByLabel("Calculator preferred lender", { exact: true })
        .selectOption(state.partners.find((p) => p.kind === "lender").id);
      assert.match(
        await page.locator(".fc-lender-details").innerText(),
        /QA Lending Contact/,
      );
      await page
        .getByRole("button", { name: "Refinance", exact: true })
        .click();
      await page
        .getByLabel("Current principal balance ($)", { exact: true })
        .fill("240000");
      await page
        .getByLabel("Current interest rate (%)", { exact: true })
        .fill("7");
      await page.getByLabel("Proposed rate (%)", { exact: true }).fill("6");
      assert.equal(await page.locator(".fc-total").textContent(), "$1,438.92");
      await page
        .getByRole("button", { name: "Seller Net Sheet", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("Sale price", { exact: true }).inputValue(),
        "300000",
      );
      await page.reload();
      await page.getByLabel("Selected client", { exact: true }).waitFor();
      assert.equal(
        await page.getByLabel("Selected client", { exact: true }).inputValue(),
        "00000000-0000-4000-8000-000000000002",
      );
      assert.equal(
        await page.getByLabel("Sale price", { exact: true }).inputValue(),
        "300000",
      );
      await page.screenshot({
        path: path.join(output, `seller-${width}.png`),
        fullPage: false,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${width} final overflow`,
      );
      assert.deepEqual(errors, []);
      results.push({
        width,
        passed: true,
        clientSelection: true,
        savedProperty: true,
        mortgage: true,
        seller: true,
        reverse: true,
        buyer: true,
        refinance: true,
        offers: true,
        partners: true,
        pdf: true,
        persistence: true,
        noOverflow: true,
      });
      await page.close();
    }
    const malformedPage = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    state.malformedRates = true;
    const malformedErrors = [];
    malformedPage.on("pageerror", (e) => malformedErrors.push(e.message));
    await malformedPage.goto(origin + "/dashboard/mortgage");
    await malformedPage
      .getByText(
        "Verified rates are unavailable. Retry or enter a manually sourced rate.",
        { exact: true },
      )
      .waitFor();
    assert.deepEqual(malformedErrors, []);
    await malformedPage.close();
    const errorPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    state.fail = true;
    await errorPage.goto(origin + "/dashboard/mortgage");
    await errorPage
      .getByText("Contacts could not be loaded.", { exact: false })
      .waitFor();
    assert.equal(
      await errorPage.getByLabel("Selected client", { exact: true }).count(),
      0,
    );
    await errorPage
      .getByRole("button", { name: "Buyer Estimate", exact: true })
      .click();
    await errorPage
      .getByLabel("Purchase price ($)", { exact: true })
      .fill("100000");
    assert.equal(await errorPage.locator(".fc-total").textContent(), "$0.00");
    await errorPage.close();
    fs.writeFileSync(
      path.join(output, "browser-results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(
      "Financing component browser checks passed at 1440, 1536, 1920, 768 and 390px; errors remain distinct from empty data.",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
