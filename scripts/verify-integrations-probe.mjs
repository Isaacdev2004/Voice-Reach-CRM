/**
 * Local/server probe for OpenAI + Clerk env (no secrets printed).
 * Usage: node --env-file=.env scripts/verify-integrations-probe.mjs
 * Optional: CLERK_PROBE_USER_ID=user_... for Clerk backend check.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnvFile();

function clerkMode() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  if (pk.startsWith("pk_live_")) return "live";
  if (pk.startsWith("pk_test_")) return "test";
  return "missing";
}

async function probeOpenAi() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, error: "not_configured" };
  const res = await fetch("https://api.openai.com/v1/models?limit=1", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(12_000),
  });
  if (res.ok) return { ok: true };
  return {
    ok: false,
    error: res.status === 401 ? "invalid_key" : `http_${res.status}`,
  };
}

async function probeClerk(userId) {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret?.startsWith("sk_")) return { ok: false, error: "not_configured" };
  if (!userId) return { ok: null, error: "skip_no_user_id" };
  const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(12_000),
  });
  if (res.ok) return { ok: true };
  return {
    ok: false,
    error: res.status === 401 ? "invalid_key" : `http_${res.status}`,
  };
}

const userId = process.env.CLERK_PROBE_USER_ID?.trim() ?? "";
const report = {
  clerkMode: clerkMode(),
  openai: await probeOpenAi(),
  clerk: await probeClerk(userId),
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.openai.ok && (report.clerk.ok === true || report.clerk.ok === null) ? 0 : 1);
