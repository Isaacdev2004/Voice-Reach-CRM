// Explicit operator-only read. No auth/session creation, account mutation, credential logging, or .env loading.
const labels = [
  "Pilot Subscriber A", "Pilot Subscriber B", "Pilot Manager",
  "MyARI Synthetic Acceptance A", "MyARI Synthetic Acceptance B",
];
const normalize = value => value.trim().replace(/\s+/g, " ").toLowerCase();
async function inspect() {
  const e = process.env;
  if (e.VERCEL_ENV !== "preview" || e.VERCEL_PROJECT_ID !== "prj_x619EYFFa4U3AV0irnzkx0jDnN1R" ||
      e.VERCEL_GIT_COMMIT_REF !== "feat/premium-assistant-workspace" ||
      !e.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
      !e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") ||
      e.NEXT_PUBLIC_SUPABASE_URL !== "https://jojgdfpmaxvbhobjrsbm.supabase.co" ||
      e.ALLOW_LIVE_OUTBOUND !== "false" || e.ASSISTANT_APPROVED_SENDS_ENABLED !== "false" ||
      e.MYARI_AI_BILLING_ENABLED !== "false" || e.MYARI_AI_PUBLIC_LAUNCH_VERIFIED !== "false")
    return { success: false, code: "isolated_development_context_required" };
  const accounts = [];
  for (const label of labels) {
    const url = new URL("https://api.clerk.com/v1/users");
    url.searchParams.set("query", label); url.searchParams.set("limit", "10");
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + e.CLERK_SECRET_KEY }, redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) { accounts.push({ label, lookup: "unverified", status: response.status }); continue; }
    const payload = await response.json();
    if (!Array.isArray(payload.data)) { accounts.push({ label, lookup: "unverified" }); continue; }
    const matches = payload.data.filter(user => normalize([user.first_name, user.last_name].filter(Boolean).join(" ")) === normalize(label));
    accounts.push({ label, exactMatches: matches.length, users: matches.map(user => {
      const primary = user.email_addresses?.find(email => email.id === user.primary_email_address_id);
      return {
        id: user.id,
        emailVerified: primary?.verification?.status === "verified",
        banned: user.banned === true,
        passwordEnabled: user.password_enabled === true,
        mfaEnabled: user.two_factor_enabled === true,
        usesClerkTestEmail: typeof primary?.email_address === "string" && /\+clerk_test[^@]*@/i.test(primary.email_address),
        syntheticMetadata: user.private_metadata?.synthetic === true || user.private_metadata?.testAccount === true || user.public_metadata?.synthetic === true,
      };
    }) });
  }
  return { success: true, scope: "read-only Clerk Development identities; no session or access changes", accounts };
}
try {
  const result = await inspect();
  console.log("MYARI_DEV_IDENTITY_INVENTORY", JSON.stringify(result));
  if (!result.success) process.exitCode = 1;
} catch {
  console.log("MYARI_DEV_IDENTITY_INVENTORY", JSON.stringify({ success: false, code: "private_identity_lookup_unavailable" }));
  process.exitCode = 1;
}
