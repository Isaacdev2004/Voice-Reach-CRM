// Actual Settings UI with explicitly synthetic authentication, storage and API boundaries.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const { chromium } = require("playwright"),
  esbuild = require("esbuild");
const { fixture } = require("./campaign-audit/harness.cjs");
(async () => {
  const root = path.resolve(__dirname, ".."),
    f = fixture(),
    defaults = f.load("lib/settings/defaults.ts").DEFAULT_SETTINGS;
  const { BrandKitSchema, emptyBrandKit, ownedBrandPath } = f.load(
    "lib/settings/brand-kit.ts",
  );
  const saved = new Map(),
    images = new Map();
  const initial = (owner) => ({
    ...structuredClone(defaults),
    profile: {
      ...defaults.profile,
      fullName: owner === "owner_a" ? "Agent A" : "Agent B",
    },
    workspace: { ...defaults.workspace, name: "Synthetic Realty" },
    brandKit: emptyBrandKit(),
  });
  let failSave = false,
    failUpload = false;
  const adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, "settings-recovery-browser/entry.jsx")],
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
  const iconFont = process.env.CONTACTS_ICON_FONT;
  const css =
    fs
      .readdirSync(path.join(root, ".next/static/css"))
      .filter((x) => x.endsWith(".css"))
      .map((x) =>
        fs
          .readFileSync(path.join(root, ".next/static/css", x), "utf8")
          .replaceAll("../media/", "/review-fonts/"),
      )
      .join("\n") +
    fs.readFileSync(
      path.join(root, "components/settings/settings-premium.css"),
      "utf8",
    );
  const fontClasses = [
    ...css.matchAll(/\.([\w-]+)\{--font-(?:serif|inter|hand):[^}]+\}/g),
  ]
    .map((m) => m[1])
    .join(" ");
  const iconCss = iconFont
    ? "@font-face{font-family:'Material Symbols Outlined';src:url(/review-icons.ttf)}.material-symbols-outlined{font-family:'Material Symbols Outlined'}"
    : "";
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost"),
        owner = req.headers["x-review-owner"] || "owner_a";
      const send = (data, status = 200) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(data));
      };
      if (url.pathname === "/api/settings") {
        if (req.method === "POST") {
          let raw = "";
          for await (const c of req) raw += c;
          if (failSave)
            return send(
              { success: false, error: "Settings storage is not ready." },
              503,
            );
          const next = JSON.parse(raw).settings;
          next.brandKit = BrandKitSchema.parse(next.brandKit);
          assert.ok(ownedBrandPath(owner, next.brandKit.headshotPath));
          next.updatedAt = new Date().toISOString();
          saved.set(owner, next);
        }
        return send({
          success: true,
          settings: saved.get(owner) || initial(owner),
          profileSync: true,
          billingVerification: { verified: true, status: "none" },
        });
      }
      if (url.pathname === "/api/settings/brand-kit/assets") {
        if (failUpload)
          return send(
            { success: false, error: "Private image storage is not ready." },
            503,
          );
        let chunks = [];
        for await (const c of req) chunks.push(c);
        const form = await new Request("http://localhost/upload", {
          method: "POST",
          headers: req.headers,
          body: Buffer.concat(chunks),
        }).formData();
        const file = form.get("file");
        assert.ok(file && file.size > 0);
        const key =
          owner + "/branding/00000000-0000-4000-8000-000000000040.png";
        images.set(key, Buffer.from(await file.arrayBuffer()));
        await new Promise((r) => setTimeout(r, 150));
        return send({
          success: true,
          path: key,
          url: "/synthetic-image?path=" + encodeURIComponent(key),
        });
      }
      if (url.pathname === "/synthetic-image") {
        const key = url.searchParams.get("path");
        const bytes = images.get(key);
        if (!bytes) {
          res.writeHead(404);
          return res.end();
        }
        res.writeHead(200, { "content-type": "image/png" });
        return res.end(bytes);
      }
      if (url.pathname === "/api/settings/brand-kit") {
        const kit = (saved.get(owner) || initial(owner)).brandKit;
        return send({
          success: true,
          kit,
          headshotUrl: kit.headshotPath
            ? "/synthetic-image?path=" + encodeURIComponent(kit.headshotPath)
            : "",
          logoUrl: "",
        });
      }
      if (url.pathname.startsWith("/api/"))
        return send({
          success: true,
          steps: [],
          data: { partners: [] },
          notifications: [],
          unreadCount: 0,
          events: [],
          enabled: false,
        });
      if (url.pathname === "/review-icons.ttf" && iconFont) {
        res.setHeader("content-type", "font/ttf");
        return res.end(fs.readFileSync(iconFont));
      }
      if (url.pathname === "/bundle.js") {
        res.setHeader("content-type", "application/javascript");
        return res.end(bundle.outputFiles[0].text);
      }
      if (url.pathname === "/style.css") {
        res.setHeader("content-type", "text/css");
        return res.end(css + iconCss);
      }
      if (url.pathname.startsWith("/dashboard")) {
        res.setHeader("content-type", "text/html");
        return res.end(
          `<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="${fontClasses}"><div id="root"></div><script src="/bundle.js"></script></body></html>`,
        );
      }
      const file = url.pathname.startsWith("/review-fonts/")
        ? path.join(root, ".next/static/media", path.basename(url.pathname))
        : path.resolve(root, "public", "." + url.pathname);
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end();
      }
      try {
        res.end(fs.readFileSync(file));
      } catch {
        res.writeHead(404);
        res.end();
      }
    } catch {
      res.writeHead(500);
      res.end("Synthetic test failure");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const output = path.join(root, "docs/settings-recovery/browser");
  fs.mkdirSync(output, { recursive: true });
  const results = [];
  try {
    for (const width of [1440, 390]) {
      saved.clear();
      images.clear();
      failSave = false;
      failUpload = false;
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const origin = "http://127.0.0.1:" + server.address().port;
      await page.goto(origin + "/dashboard/settings?tab=brand");
      const business = page.getByLabel("Business / brokerage name", {
        exact: true,
      });
      await business.waitFor();
      await business.fill("Coastal");
      await business.press("Space");
      await business.pressSequentially("Realty Group");
      assert.equal(await business.inputValue(), "Coastal Realty Group");
      const email = page.getByLabel("Business email", { exact: true });
      await email.fill("agent@");
      await email.pressSequentially("example.test");
      assert.equal(await email.inputValue(), "agent@example.test");
      await page
        .getByLabel("Agent name", { exact: true })
        .fill("María Agent A");
      await page
        .getByLabel("Business phone", { exact: true })
        .fill("+1 555-010-0123");
      await page
        .getByLabel("Website (https)", { exact: true })
        .fill("https://example.test");
      await page
        .getByLabel("Real estate license number", { exact: true })
        .fill("SYNTHETIC-12345");
      const upload = page.locator("input[type=file]").first(),
        bytes = fs.readFileSync(path.join(root, "public/brand/myari-logo.png"));
      failUpload = true;
      await upload.setInputFiles({
        name: "synthetic.png",
        mimeType: "image/png",
        buffer: bytes,
      });
      await page
        .getByText("Private image storage is not ready.", { exact: true })
        .waitFor();
      failUpload = false;
      await upload.setInputFiles({
        name: "synthetic.png",
        mimeType: "image/png",
        buffer: bytes,
      });
      await business.fill("Coastal Realty Group Updated");
      await page
        .getByText("Image uploaded privately.", { exact: false })
        .waitFor();
      assert.equal(await business.inputValue(), "Coastal Realty Group Updated");
      await page
        .getByLabel(/I reviewed these details and have permission/)
        .check();
      const save = page.getByRole("button", {
        name: "Save all changes",
        exact: true,
      });
      failSave = true;
      await save.click();
      await page.getByText(/Settings storage is not ready/).waitFor();
      assert.equal(await business.inputValue(), "Coastal Realty Group Updated");
      failSave = false;
      await save.click();
      await page.getByText("All changes saved", { exact: true }).waitFor();
      assert.equal(
        saved.get("owner_a").brandKit.businessName,
        "Coastal Realty Group Updated",
      );
      assert.ok(
        saved.get("owner_a").brandKit.headshotPath.startsWith("owner_a/"),
      );
      assert.equal(saved.get("owner_a").brandKit.approved, true);
      assert.equal(saved.get("owner_a").brandKit.email, "agent@example.test");
      assert.equal(
        saved.get("owner_a").brandKit.licenseNumber,
        "SYNTHETIC-12345",
      );
      await page.reload();
      await business.waitFor();
      assert.equal(await business.inputValue(), "Coastal Realty Group Updated");
      await page
        .getByAltText("Your professional headshot", { exact: true })
        .waitFor();
      await page.evaluate(() => window.__setOwner("owner_b"));
      await business.waitFor();
      await page.waitForFunction(
        () =>
          document.querySelector(
            'input[aria-label="Business / brokerage name"]',
          )?.value === "" || document.body.textContent.includes("Brand Kit"),
      );
      await page.waitForTimeout(150);
      assert.equal(await business.inputValue(), "");
      assert.equal(
        await page
          .getByAltText("Your professional headshot", { exact: true })
          .count(),
        0,
      );
      await page.evaluate(() => window.__setOwner("owner_a"));
      await page.waitForTimeout(200);
      assert.equal(await business.inputValue(), "Coastal Realty Group Updated");
      await page.evaluate(() => document.fonts.ready);
      await business.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(output, `settings-${width}.png`),
        fullPage: false,
      });
      await page
        .getByAltText("Your professional headshot", { exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(output, `headshot-${width}.png`),
        fullPage: false,
      });
      assert.deepEqual(errors, []);
      results.push({
        width,
        spaceInput: true,
        incompleteEmail: true,
        uploadRetry: true,
        asyncDraftPreserved: true,
        saveRetry: true,
        refresh: true,
        syntheticAccountSwitch: true,
      });
      await page.close();
    }
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(
      "PASS actual Settings UI at desktop/mobile with synthetic API/auth/storage: typing, upload, retries, save/resume and account isolation.",
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
