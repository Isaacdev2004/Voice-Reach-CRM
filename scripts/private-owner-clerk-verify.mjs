// One-off operator script: reads .env locally, prints sanitized Clerk + workspace linkage. Never prints secrets.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnv();

const ownerId = process.argv[2]?.trim();
if (!ownerId) {
  console.log(JSON.stringify({ error: "usage: node scripts/private-owner-clerk-verify.mjs <clerk_user_id>" }));
  process.exit(1);
}

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
const sk = process.env.CLERK_SECRET_KEY?.trim() ?? "";
const mode = pk.startsWith("pk_live_") ? "live" : pk.startsWith("pk_test_") ? "test" : "unknown";

if (!sk) {
  console.log(JSON.stringify({ error: "clerk_secret_missing" }));
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
let contactCount = null;
if (supabaseUrl && serviceKey) {
  const res = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/contacts?owner_id=eq.${encodeURIComponent(ownerId)}&select=id`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "count=exact",
      },
    },
  );
  const body = await res.text();
  const countHeader = res.headers.get("content-range");
  if (countHeader?.includes("/")) {
    contactCount = Number(countHeader.split("/").pop());
  } else if (body.startsWith("[")) {
    contactCount = JSON.parse(body).length;
  }
}

const clerkRes = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(ownerId)}`, {
  headers: { Authorization: `Bearer ${sk}` },
});
if (!clerkRes.ok) {
  console.log(
    JSON.stringify({
      ownerId,
      clerkMode: mode,
      clerkLookup: "failed",
      status: clerkRes.status,
      contactCount,
      supabaseHost: supabaseUrl ? new URL(supabaseUrl).hostname : null,
    }),
  );
  process.exit(1);
}

const user = await clerkRes.json();
const primary =
  user.email_addresses?.find((e) => e.id === user.primary_email_address_id) ??
  user.email_addresses?.[0];
const email = primary?.email_address ?? "";
const masked = email ? `${email.slice(0, 2)}***${email.slice(email.indexOf("@"))}` : null;

console.log(
  JSON.stringify({
    ownerId,
    clerkMode: mode,
    publishableKeyModeMatchesSecret: mode !== "unknown",
    primaryEmailMasked: masked,
    emailVerified: primary?.verification?.status ?? null,
    accountBanned: Boolean(user.banned),
    lastSignInAt: user.last_sign_in_at ?? null,
    myariWorkspace: {
      supabaseHost: supabaseUrl ? new URL(supabaseUrl).hostname : null,
      contactCount,
    },
  }),
);
