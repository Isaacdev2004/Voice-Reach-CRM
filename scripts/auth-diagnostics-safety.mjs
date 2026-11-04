// Run inside the target deployment environment. Emits booleans only, never values.
export function previewSafety(env) {
  const blocked = /^(TWILIO_|SLYBROADCAST_|RESEND_|STRIPE_|NEXT_PUBLIC_STRIPE_|VOICE_WEBHOOK_SECRET$|VOICE_PROVIDER_FROM_NUMBER$|CRON_SECRET$|CAMPAIGN_RUNNER_SECRET$|GOOGLE_CLIENT_|ELEVENLABS_|OPENAI_API_KEY$|ANTHROPIC_API_KEY$)/;
  return {
    expectedPreviewBranch: env.VERCEL_ENV === 'preview' && env.VERCEL_GIT_COMMIT_REF === 'test/property-interest-clerk-request-context',
    stagingSupabase: env.NEXT_PUBLIC_SUPABASE_URL === 'https://jojgdfpmaxvbhobjrsbm.supabase.co',
    clerkDevelopment: ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'].every((name, i) => (env[name] ?? '').startsWith(i === 0 ? 'pk_test_' : 'sk_test_') && !/paste_full|placeholder|replace_me|\.\.\./.test(env[name])),
    stagingServiceCredentialPresent: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    outboundDisabled: env.ALLOW_LIVE_OUTBOUND === 'false',
    mockProvider: env.VOICE_PROVIDER === 'mock',
    credentialsNeutralized: !Object.keys(env).some(name => blocked.test(name) && Boolean(env[name])),
    conciergeDisabled: env.CONCIERGE_ENABLED !== 'true' && !env.CONCIERGE_OWNER_IDS && !env.CONCIERGE_ADMIN_IDS,
    billingAndSendingDisabled: ['ASSISTANT_APPROVED_SENDS_ENABLED', 'MYARI_AI_BILLING_ENABLED', 'MYARI_AI_PUBLIC_LAUNCH_VERIFIED', 'MYARI_AI_ENTITLEMENTS_ENABLED'].every(name => env[name] !== 'true'),
  };
}
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const checks = previewSafety(process.env);
  console.log(JSON.stringify(checks));
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
}
