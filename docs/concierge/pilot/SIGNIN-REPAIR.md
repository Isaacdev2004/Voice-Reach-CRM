# Concierge Preview sign-in repair

Confirmed: current Preview renders the luxury shell and includes a Development Clerk browser script. SignIn previously had no useful pending/failure surface after its asynchronous component loaded, so a failed SDK mount could leave a blank credential card. No server runtime error was found in the inspected sign-in routes; that does not establish frontend success.

Small presentation fix: ClerkMountGuard observes the actual Clerk form mount, shows accessible pending status, and after12seconds displays a safe retry message. A later successful mount clears the message. Existing Clerk form, methods, middleware, verification/recovery, session behavior and /dashboard redirect remain unchanged. No custom login or new public endpoint was added.

Private deployment-only prebuild check pins the exact Preview branch/project/commit, disabled flags, blank provider/scheduler credentials and test Supabase URL. It never retrieves/export secrets, logs credentials or prints provider bodies. It verifies Development key shape, pair/domain linkage and frontend/browser-script reachability when credentials are usable.

First diagnostic deployment dpl_4Cmvacgzf3WsrYRb9R788G8xSULr stopped with generic check-unavailable. A revised bounded diagnostic deployment dpl_5xoJgy7sg4JmxpNJ5LPTZR7WHspU identified clerk_secret_invalid_characters before any Clerk request. The branch's host-injected CLERK_SECRET_KEY contains non-ASCII/control characters after trimming. Synthetic tests independently validate that normal printable secret characters pass this check and embedded control characters fail. No key value was read back, printed, rotated or replaced.

This is a confirmed credential defect and blocks backend authentication. It is NOT proof that this is the only cause of the client UI failure; frontend reachability, pair matching and real login remain unverified until corrected.

Required owner action: Vercel voice-reach-crm Environment Variables, select CLERK_SECRET_KEY specifically Preview / feat/concierge-pilot-readiness, Edit the Secret, replace its value using the matching Development instance's existing sk_test_ key, save as one exact value without quotes or pasted formatting. Do not use Rotate Variable, do not change the Production/Preview-wide entry, do not send the value through chat. No new key generation is required.

Once corrected, rerun the exact-commit protected Preview with the deployment-only prebuild guard. Only a passed guard may proceed to app build. Previous Ready Preview remains at https://voice-reach-98j90ruxo-magnificent-soless-projects.vercel.app/sign-in; the diagnostic deployments are failed builds, NOT working replacement URLs. Production and all access/sending/billing flags remain unchanged.

Validation: TypeScript and optimized local build pass; affected lint clean; public marketing/contact/capture regressions and security check pass. Actual sign-in/signup component fixtures pass at1440/768/390, including delayed mount, mount timeout/retry visibility, no horizontal overflow and zero provider/API writes. Five private-guard tests pass using synthetic values, no network. These do not claim real Clerk account authentication. Current changes remain in unmerged PR52.
