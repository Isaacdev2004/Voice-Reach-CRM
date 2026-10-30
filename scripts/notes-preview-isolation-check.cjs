// Private Preview build check. No .env loading, credential export, public endpoint, writes, or retries.
const PROJECT = "prj_x619EYFFa4U3AV0irnzkx0jDnN1R";
const BRANCH = "feat/notes-strategy-2";
const COMMIT =
  process.argv.find((x) => x.startsWith("--commit="))?.slice(9) ?? "";
const TEST = "jojgdfpmaxvbhobjrsbm";
const EXPECTED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "ALLOW_LIVE_OUTBOUND",
  "ASSISTANT_V2_ENABLED",
  "ASSISTANT_APPROVED_SENDS_ENABLED",
  "MYARI_AI_BILLING_ENABLED",
  "MYARI_AI_PUBLIC_LAUNCH_VERIFIED",
  "MYARI_AI_ENTITLEMENTS_ENABLED",
  "MYARI_AI_PRICING_ENABLED",
  "MYARI_AI_PLAN_CHANGES_ENABLED",
  "MYARI_AI_BILLING_LIVE_APPROVED",
  "MYARI_AI_METER_DATABASE_VERIFIED",
  "ASSISTANT_V2_OWNER_IDS",
  "ASSISTANT_SEND_OWNER_IDS",
  "ASSISTANT_SEND_RECIPIENTS",
  "AI_BETA_PLUS_OWNER_IDS",
  "MYARI_AI_ADMIN_OWNER_IDS",
  "MYARI_AI_ADMIN_REPORT_OWNER_IDS",
  "ASSISTANT_PARTNERS_VERIFIED",
  "ASSISTANT_TRANSACTIONS_VERIFIED",
  "ASSISTANT_INBOUND_VERIFIED",
  "ALLOW_DELIVERY_RECONCILIATION",
  "DELIVERY_EVIDENCE_ENABLED",
  "CALENDAR_LINKS_ENABLED",
  "AUTH_OVERVIEW_EMAIL_ENABLED",
  "CONCIERGE_ENABLED",
  "CONCIERGE_OWNER_IDS",
  "ASSISTANT_REASONING_PROVIDER",
  "OPENAI_ASSISTANT_MODEL",
  "ASSISTANT_DAILY_REQUEST_LIMIT",
  "ASSISTANT_DAILY_CALL_LIMIT",
  "MYARI_AI_STRIPE_MODE",
  "MYARI_AI_LAUNCH_CONFIG",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
  "NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL",
  "APP_BASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "VOICE_PROVIDER",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_WEBHOOK_SECRET",
  "SLYBROADCAST_USERNAME",
  "SLYBROADCAST_PASSWORD",
  "SLYBROADCAST_CALLER_ID",
  "SLYBROADCAST_DISPO_URL",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "ELEVENLABS_VOICE_LABEL",
  "VOICE_PROVIDER_API_KEY",
  "VOICE_PROVIDER_BASE_URL",
  "VOICE_PROVIDER_FROM_NUMBER",
  "VOICE_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "CALENDAR_TOKEN_ENCRYPTION_KEY",
  "DOTLOOP_CLIENT_ID",
  "DOTLOOP_CLIENT_SECRET",
  "CAMPAIGN_RUNNER_SECRET",
  "CRON_SECRET",
  "INTEGRATIONS_PROBE_SECRET",
  "SUPABASE_STORAGE_BUCKET",
  "BRAND_STORAGE_BUCKET",
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_DB_URL",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_META_PIXEL_ID",
  "STRIPE_PRICE_AI_PRO_MONTHLY",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_STARTER_YEARLY",
  "STRIPE_PRICE_GROWTH",
  "STRIPE_PRICE_GROWTH_YEARLY",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_PRO_YEARLY",
  "STRIPE_PRICE_TEAM",
  "STRIPE_PRICE_TEAM_YEARLY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "SHIPPO_API_TOKEN",
  "ANTHROPIC_MODEL",
  "CONCIERGE_ADMIN_IDS",
  "CONCIERGE_MANAGER_IDS",
  "CONCIERGE_SPECIALIST_IDS",
  "CONCIERGE_SALES_IDS",
  "CONCIERGE_RETENTION_ENABLED",
];
const EMPTY_KEYS = [
  "ASSISTANT_SEND_OWNER_IDS",
  "ASSISTANT_SEND_RECIPIENTS",
  "AI_BETA_PLUS_OWNER_IDS",
  "MYARI_AI_ADMIN_OWNER_IDS",
  "MYARI_AI_ADMIN_REPORT_OWNER_IDS",
  "CONCIERGE_OWNER_IDS",
  "MYARI_AI_LAUNCH_CONFIG",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_WEBHOOK_SECRET",
  "SLYBROADCAST_USERNAME",
  "SLYBROADCAST_PASSWORD",
  "SLYBROADCAST_CALLER_ID",
  "SLYBROADCAST_DISPO_URL",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "ELEVENLABS_VOICE_LABEL",
  "VOICE_PROVIDER_API_KEY",
  "VOICE_PROVIDER_BASE_URL",
  "VOICE_PROVIDER_FROM_NUMBER",
  "VOICE_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "CALENDAR_TOKEN_ENCRYPTION_KEY",
  "DOTLOOP_CLIENT_ID",
  "DOTLOOP_CLIENT_SECRET",
  "CAMPAIGN_RUNNER_SECRET",
  "CRON_SECRET",
  "INTEGRATIONS_PROBE_SECRET",
  "SUPABASE_STORAGE_BUCKET",
  "BRAND_STORAGE_BUCKET",
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_DB_URL",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_META_PIXEL_ID",
  "STRIPE_PRICE_AI_PRO_MONTHLY",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_STARTER_YEARLY",
  "STRIPE_PRICE_GROWTH",
  "STRIPE_PRICE_GROWTH_YEARLY",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_PRO_YEARLY",
  "STRIPE_PRICE_TEAM",
  "STRIPE_PRICE_TEAM_YEARLY",
  "SHIPPO_API_TOKEN",
  "ANTHROPIC_MODEL",
];
const OFF_KEYS = [
  "ALLOW_LIVE_OUTBOUND",
  "ASSISTANT_APPROVED_SENDS_ENABLED",
  "MYARI_AI_BILLING_ENABLED",
  "MYARI_AI_PUBLIC_LAUNCH_VERIFIED",
  "MYARI_AI_ENTITLEMENTS_ENABLED",
  "MYARI_AI_PRICING_ENABLED",
  "MYARI_AI_PLAN_CHANGES_ENABLED",
  "MYARI_AI_BILLING_LIVE_APPROVED",
  "MYARI_AI_METER_DATABASE_VERIFIED",
  "ASSISTANT_PARTNERS_VERIFIED",
  "ASSISTANT_TRANSACTIONS_VERIFIED",
  "ASSISTANT_INBOUND_VERIFIED",
  "ALLOW_DELIVERY_RECONCILIATION",
  "DELIVERY_EVIDENCE_ENABLED",
  "CALENDAR_LINKS_ENABLED",
  "AUTH_OVERVIEW_EMAIL_ENABLED",
  "CONCIERGE_ENABLED",
];
const REQUIRED_KEYS = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
];
async function checkPreview(env, fetcher = fetch) {
  const value = (key) => (typeof env[key] === "string" ? env[key].trim() : "");
  const fail = (error, extra = {}) => ({ success: false, error, ...extra });
  const ownerId = value("ASSISTANT_V2_OWNER_IDS");
  if (!/^[a-f0-9]{40}$/.test(COMMIT)) return fail("expected_commit_required");
  if (
    value("VERCEL_ENV") !== "preview" ||
    value("VERCEL_PROJECT_ID") !== PROJECT ||
    value("VERCEL_GIT_COMMIT_REF") !== BRANCH ||
    value("VERCEL_GIT_COMMIT_SHA") !== COMMIT
  )
    return fail("preview_project_branch_commit_guard");
  if (
    value("NEXT_PUBLIC_SUPABASE_URL") !== "https://" + TEST + ".supabase.co" ||
    value("OPENAI_ASSISTANT_MODEL") !== "gpt-5-mini" ||
    value("ASSISTANT_REASONING_PROVIDER") !== "openai"
  )
    return fail("test_project_and_model_guard");
  if (
    OFF_KEYS.some((key) => value(key) !== "false") ||
    EMPTY_KEYS.some((key) => value(key) !== "")
  )
    return fail("disabled_flags_and_empty_overrides_guard");
  if (
    value("ASSISTANT_V2_ENABLED") !== "false" ||
    ownerId ||
    value("CONCIERGE_RETENTION_ENABLED") !== "false" ||
    [
      "CONCIERGE_ADMIN_IDS",
      "CONCIERGE_MANAGER_IDS",
      "CONCIERGE_SPECIALIST_IDS",
      "CONCIERGE_SALES_IDS",
    ].some((key) => value(key))
  )
    return fail("notes_preview_access_disabled_guard");
  const unknown = Object.keys(env).filter(
    (key) =>
      /(KEY|SECRET|TOKEN|PASSWORD|DATABASE_URL|POSTGRES.*URL)/i.test(key) &&
      value(key) &&
      !EXPECTED_KEYS.includes(key) &&
      ![
        "VERCEL_OIDC_TOKEN",
        "VERCEL_ARTIFACTS_TOKEN",
        "FAKEROOTKEY",
        "VERCEL_USE_HASHED_ISR_CACHE_KEY",
        "TURBO_CI_VENDOR_ENV_KEY",
        "VERCEL_DEPLOYMENT_KEY",
        "VERCEL_ENV_ENC_KEY",
      ].includes(key),
  );
  if (unknown.length)
    return fail("unexpected_host_credential_names", { names: unknown });
  if (REQUIRED_KEYS.some((key) => !value(key)))
    return fail("required_staging_credential_missing");
  const pk = value("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    sk = value("CLERK_SECRET_KEY"),
    service = value("SUPABASE_SERVICE_ROLE_KEY");
  if (!pk.startsWith("pk_test_") || !sk.startsWith("sk_test_"))
    return fail("clerk_development_guard");
  let clerkHost;
  try {
    clerkHost = Buffer.from(pk.slice(8), "base64")
      .toString("utf8")
      .replace(/\$$/, "");
    if (!/^[a-z0-9-]+\.clerk\.accounts\.dev$/i.test(clerkHost))
      return fail("clerk_development_hostname_guard");
  } catch {
    return fail("clerk_publishable_configuration_invalid");
  }
  if (!service.startsWith("sb_secret_")) {
    try {
      const claims = JSON.parse(
        Buffer.from(service.split(".")[1], "base64url").toString("utf8"),
      );
      if (claims.role !== "service_role" || claims.ref !== TEST)
        return fail("supabase_test_service_role_guard");
    } catch {
      return fail("supabase_service_credential_format");
    }
  }
  try {
    const pending = await Promise.allSettled([
      fetcher("https://api.clerk.com/v1/domains", {
        headers: { Authorization: "Bearer " + sk },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      }),
      fetcher(
        "https://" + TEST + ".supabase.co/rest/v1/rpc/ai_usage_schema_version",
        {
          method: "POST",
          headers: {
            apikey: service,
            Authorization: "Bearer " + service,
            "Content-Type": "application/json",
          },
          body: "{}",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        },
      ),
    ]);
    if (pending.some((r) => r.status !== "fulfilled"))
      return fail("read_only_credential_checks_unavailable");
    const [clerk, db] = pending.map((r) => r.value);
    if (!clerk.ok)
      return fail("clerk_authentication_rejected", { status: clerk.status });
    const domains = await clerk.json();
    if (
      !Array.isArray(domains.data) ||
      !domains.data.some((domain) => {
        try {
          return (
            new URL(
              domain.frontend_api_url.startsWith("https://")
                ? domain.frontend_api_url
                : "https://" + domain.frontend_api_url,
            ).hostname === clerkHost
          );
        } catch {
          return false;
        }
      })
    )
      return fail("clerk_development_pair_mismatch");
    if (!db.ok)
      return fail("test_supabase_service_rejected", { status: db.status });
    if ((await db.json()) !== 1)
      return fail("test_supabase_read_only_rpc_unexpected");
    const model = await fetcher("https://api.openai.com/v1/models/gpt-5-mini", {
      headers: { Authorization: "Bearer " + value("OPENAI_API_KEY") },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!model.ok)
      return fail("staging_openai_authentication_rejected", {
        status: model.status,
      });
    const modelData = await model.json();
    if (modelData.id !== "gpt-5-mini")
      return fail("staging_openai_model_unexpected");
    return {
      success: true,
      clerkDevelopmentPair: "PASS",
      testSupabaseService: "PASS",
      stagingOpenAIAuthentication: "PASS",
      sendingAndBilling: "DISABLED",
      scope:
        "Notes Preview only; Assistant and Concierge remain disabled; signed-in acceptance remains separate",
    };
  } catch {
    return fail("private_preview_check_unavailable");
  }
}

checkPreview(process.env)
  .then((result) => {
    console.log("MYARI_NOTES_PREVIEW_CREDENTIALS", JSON.stringify(result));
    if (!result.success) process.exitCode = 1;
  })
  .catch(() => {
    console.log(
      "MYARI_NOTES_PREVIEW_CREDENTIALS",
      JSON.stringify({
        success: false,
        error: "private_preview_runner_failed",
      }),
    );
    process.exitCode = 1;
  });
