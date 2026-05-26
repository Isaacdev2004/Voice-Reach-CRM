#!/usr/bin/env node
/**
 * VoiceReach end-to-end smoke test.
 *
 * Verifies every public API endpoint returns a well-formed JSON envelope
 * { success: true|false, ... } and never an empty body. Auth-gated routes
 * must return 401 with `success: false` when called unauthenticated.
 *
 * Run against a local server:
 *   npm run dev
 *   node scripts/smoke-test.mjs
 *
 * Run against staging/prod (no auth):
 *   BASE_URL=https://staging.voicereach.app node scripts/smoke-test.mjs
 *
 * Run with a session cookie to exercise authenticated GETs:
 *   AUTH_COOKIE="__session=..." node scripts/smoke-test.mjs
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const AUTH_COOKIE = process.env.AUTH_COOKIE || "";

const headers = AUTH_COOKIE ? { Cookie: AUTH_COOKIE } : {};

const ENDPOINTS = [
  { method: "GET", path: "/api/contacts", expectAuth: true },
  { method: "GET", path: "/api/voice-assets", expectAuth: true },
  { method: "GET", path: "/api/campaigns", expectAuth: true },
  { method: "GET", path: "/api/automations", expectAuth: true },
  { method: "GET", path: "/api/automations/rules", expectAuth: true },
  { method: "GET", path: "/api/partners", expectAuth: true },
  { method: "GET", path: "/api/activity", expectAuth: true },
  { method: "GET", path: "/api/analytics?range=30d", expectAuth: true },
  { method: "GET", path: "/api/settings", expectAuth: true },
  { method: "GET", path: "/api/compliance/audit", expectAuth: true },
  { method: "GET", path: "/api/engagement?limit=10", expectAuth: true },
  { method: "GET", path: "/api/webhooks/voice", expectAuth: false },
  { method: "GET", path: "/api/campaigns/runner", expectAuth: true },
];

const results = [];
let pass = 0;
let fail = 0;

for (const ep of ENDPOINTS) {
  const url = `${BASE_URL}${ep.path}`;
  try {
    const res = await fetch(url, { method: ep.method, headers });
    const text = await res.text();

    let body = null;
    let parseError = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (e) {
      parseError = e.message;
    }

    const isEnvelope =
      body && typeof body === "object" && "success" in body && typeof body.success === "boolean";
    const isEmpty = !text;
    const expectedStatus = ep.expectAuth && !AUTH_COOKIE ? 401 : null;
    const statusOk =
      expectedStatus === null ? res.ok || res.status === 401 : res.status === expectedStatus;

    const ok = !isEmpty && isEnvelope && !parseError && statusOk;
    if (ok) {
      pass++;
    } else {
      fail++;
    }
    results.push({
      method: ep.method,
      path: ep.path,
      status: res.status,
      ok,
      envelope: isEnvelope,
      empty: isEmpty,
      parseError,
      bodyPreview: text.slice(0, 80),
    });
  } catch (err) {
    fail++;
    results.push({
      method: ep.method,
      path: ep.path,
      status: "ERR",
      ok: false,
      envelope: false,
      empty: false,
      parseError: err.message,
      bodyPreview: "",
    });
  }
}

console.log("\nVoiceReach smoke test — " + BASE_URL);
console.log("─".repeat(64));
for (const r of results) {
  const tag = r.ok ? "PASS" : "FAIL";
  const flags = [
    r.envelope ? "envelope" : "no-envelope",
    r.empty ? "EMPTY-BODY" : "has-body",
    r.parseError ? "PARSE-ERR" : "json-ok",
  ];
  console.log(
    `${tag.padEnd(4)}  ${r.method.padEnd(4)} ${String(r.status).padEnd(4)}  ${r.path.padEnd(34)} ${flags.join(" · ")}`,
  );
}
console.log("─".repeat(64));
console.log(`${pass} passed · ${fail} failed`);

if (!AUTH_COOKIE) {
  console.log("\nℹ  No AUTH_COOKIE provided — 401 envelopes are the expected outcome on auth-gated routes.");
  console.log("   To exercise authenticated GETs, sign in and pass `AUTH_COOKIE=\"__session=...\"`.");
}

process.exit(fail === 0 ? 0 : 1);
