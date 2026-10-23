/* Read-only repository inventory; no provider requests or credential reads. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  sharp = require("sharp");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "docs/platform-audit");
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((x) =>
      x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)],
    );
const relative = (p) => path.relative(root, p).split(path.sep).join("/");
const route = (p) =>
  "/" +
  relative(p)
    .replace(/^app\//, "")
    .replace(/\/(page|route)\.(tsx|ts)$/, "")
    .split("/")
    .filter((s) => !/^\(.*\)$/.test(s))
    .join("/")
    .replace(/^page\.tsx$/, "");
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const routes = walk(path.join(root, "app"))
    .filter((p) => /\/(page|route)\.(tsx|ts)$/.test(p))
    .map((p) => {
      const s = fs.readFileSync(p, "utf8"),
        api = p.endsWith("route.ts");
      return {
        path: route(p),
        file: relative(p),
        kind: api ? "API" : s.includes("redirect(") ? "Page/redirect" : "Page",
        methods: api
          ? [
              ...s.matchAll(
                /export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)/g,
              ),
            ].map((m) => m[1])
          : [],
        auth: !api
          ? "Layout/proxy or public"
          : s.includes("requireUserId")
            ? "Direct requireUserId"
            : s.includes("taskHandler")
              ? "Delegated task handler"
              : /webhooks/.test(p)
                ? "Provider signature/secret — inspect handler"
                : /runner|reconcile/.test(p)
                  ? "Worker bearer secret — inspect handler"
                  : /calendar\/(feed|book)\//.test(p)
                    ? "Scoped public token"
                    : /health|contact\/|checkout-public|mortgage/.test(p)
                      ? "Public or separately gated — inspect handler"
                      : "Delegated/custom — inspect source",
        review:
          "Source inventory; runtime coverage is listed separately in REPORT.md",
      };
    });
  fs.writeFileSync(
    path.join(out, "routes.json"),
    JSON.stringify(routes, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(out, "ROUTES.md"),
    "# Implemented route inventory\n\nEvery row is a source inspection target, not a claim that all interactive states were tested. Dynamic feature/article expansions are in public-paths.json.\n\n| Route | Kind/method | Authorization boundary | Source |\n|---|---|---|---|\n" +
      routes
        .map(
          (r) =>
            `| \`${r.path}\` | ${r.kind} ${r.methods.join("/")} | ${r.auth} | [source](../../${r.file}) |`,
        )
        .join("\n") +
      "\n",
  );
  const code = ["app", "components", "lib"]
    .flatMap((d) => walk(path.join(root, d)))
    .filter((p) => /\.(tsx?|css)$/.test(p));
  const references = new Map();
  for (const p of code) {
    let s = fs.readFileSync(p, "utf8");
    const constants = [...s.matchAll(/const (\w+) = [\"']([^\"']+)[\"']/g)];
    for (const c of constants) s = s.split("${" + c[1] + "}").join(c[2]);
    for (const m of s.matchAll(
      /["'(`](\/(?:brand|images|assets)\/[^"'`\s)]+\.(?:png|jpg|jpeg|webp|avif|svg|gif))(?:\?[^"'`\s)]*)?/g,
    )) {
      const src = m[1];
      if (src.includes("*")) continue;
      references.set(src, [...(references.get(src) || []), relative(p)]);
    }
  }
  const images = [];
  for (const p of walk(path.join(root, "public")).filter((p) =>
    /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(p),
  )) {
    let m = {};
    try {
      m = await sharp(p).metadata();
    } catch {}
    const data = fs.readFileSync(p);
    const src = "/" + path.relative(path.join(root, "public"), p);
    images.push({
      src,
      width: m.width ?? null,
      height: m.height ?? null,
      bytes: data.length,
      sha256: crypto.createHash("sha256").update(data).digest("hex"),
      references: references.get(src) || [],
      review:
        m.width && m.width < 600
          ? "Small source: assess rendered dimensions; not automatically defective"
          : "Assess rendered size/crop in browser",
    });
  }
  const missing = [...references]
    .filter(([src]) => !fs.existsSync(path.join(root, "public", src)))
    .map(([src, files]) => ({ src, files }));
  const duplicateGroups = Object.values(Object.groupBy(images, (i) => i.sha256))
    .filter((g) => g.length > 1)
    .map((g) => g.map((i) => i.src));
  fs.writeFileSync(
    path.join(out, "images.json"),
    JSON.stringify({ images, missing, duplicateGroups }, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      routes: routes.length,
      pages: routes.filter((r) => r.kind !== "API").length,
      apis: routes.filter((r) => r.kind === "API").length,
      images: images.length,
      missing,
      duplicates: duplicateGroups.length,
    }),
  );
})();
