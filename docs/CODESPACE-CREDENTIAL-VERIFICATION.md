# Secure credential verification in Codespaces

This standalone verifier is for `myari-clerk-auth-isolated-qa`, branch
`test/property-interest-clerk-request-context`, and staging Supabase project
`jojgdfpmaxvbhobjrsbm`. It does not call Vercel, load environment files, change
configuration, deploy, or prove which values Vercel actually uses.

The script and synthetic tests are prepared for review. **Live credential probes
require separate authorization. Do not run `--probe` until that is granted.**

## Review and local tests

Review [the verifier](../scripts/verify-preview-credentials.py) and
[its tests](../scripts/verify-preview-credentials.test.py) before providing any
credentials. Use Python 3.10 or newer in a trusted Linux Codespace. There are no
third-party Python dependencies.

Run the synthetic suite without providing credentials:

```sh
python3 scripts/verify-preview-credentials.test.py
```

The tests forbid socket connections and use synthetic inputs and mocked provider
responses. A real pseudo-terminal test confirms that credential entry is not
echoed. No live credential probes are part of the suite.

## Secure input

Use a private, trusted Codespace terminal with no session recording, debugger,
tracing, or shared terminal viewer. Credentials are entered only at Python's
hidden prompts, not at the shell prompt. Do not place values in commands,
arguments, shell history, environment exports, files, clipboard-sharing tools,
logs, or chat. Do not redirect or pipe input. The script requires an interactive
TTY and refuses getpass's echoed-input fallback. Ctrl-C aborts with sanitized
UNVERIFIED results and a nonzero exit.

Enter the complete original values through the hidden prompts, in this order:

1. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` from the intended Clerk Development instance.
2. `CLERK_SECRET_KEY` from that same Development instance.
3. `NEXT_PUBLIC_SUPABASE_URL`: `https://jojgdfpmaxvbhobjrsbm.supabase.co`.
4. `SUPABASE_SERVICE_ROLE_KEY` for that staging project, either its legacy
   service-role JWT or a current `sb_secret_` server key.

For comparison with Vercel, an authorized operator must establish that the values
entered are the exact effective Preview branch values. The verifier cannot prove
that provenance. An empty protected secret in `.env.preview.local` does **not**
mean the saved Vercel secret is invalid. No dotenv or process credential variables
are consumed. Leave unavailable input blank; the result is UNVERIFIED, the exit is
nonzero, and no requests are made. Never copy masked values or reconstruct, trim,
or encode a truncated credential.

The default command validates format only and makes **zero external requests**:

```sh
python3 scripts/verify-preview-credentials.py
```

This deliberately exits nonzero because credential authentication and pairing
remain UNVERIFIED. A format PASS does not establish completeness or validity.

## Read-only probes after separate authorization

After review and explicit authorization, this command enables the three possible
read-only requests:

```sh
python3 scripts/verify-preview-credentials.py --probe
```

Do not use `vercel env run` for this procedure. No Vercel CLI command is needed.

All four inputs must pass local validation before any request starts. The script
rejects whitespace, Unicode ellipses, non-ASCII/control characters, known
placeholders, and malformed encodings. It requires canonical publishable-key
encoding of one valid `*.clerk.accounts.dev` hostname ending in the Clerk `$`
delimiter. The secret must have the supported `sk_test_` alphanumeric form. It
never guesses completeness from a prefix or length. Legacy Supabase JWTs must
declare the approved project and service-role claim; those unverified claims are
only a preliminary guard. New server keys remain opaque until the API probe.

| Request | Credential handling | Evidence |
| --- | --- | --- |
| `GET https://api.clerk.com/v1/jwks` | Clerk secret in the Authorization header, to this fixed host only | Successful authenticated response with usable signing keys |
| `GET https://<validated-development-host>/.well-known/jwks.json` | No credentials or cookies | At least one identical RSA public modulus/exponent across both key sets establishes pairing; matching key IDs alone is insufficient |
| `GET https://jojgdfpmaxvbhobjrsbm.supabase.co/auth/v1/admin/users?page=1&per_page=1` | Staging key in `apikey`; legacy JWTs also use Bearer authorization | HTTP 200 from the admin-only API establishes service/admin authorization against the fixed staging project |

The Supabase endpoint may generate a response containing one Auth user. The
verifier closes that response **without reading, parsing, storing, or printing its
body**. It does not query application tables or modify users. The requests do not
send messages, initiate billing, execute schedulers, or run migrations.

TLS certificate and hostname verification remain enabled. TLS key logging is not
enabled, including when `SSLKEYLOGFILE` exists. Redirects are refused, even between
approved hosts. Each network operation uses a ten-second socket timeout; Clerk
JSON reads are capped at 64 KiB. There are no retries. No SDK logging, raw
exceptions, request headers, returned cookies, JWT contents, provider responses,
or user data are printed. Only fixed result names and PASS/FAIL/UNVERIFIED statuses
are emitted. Python does not guarantee erasure of immutable strings from process
memory; use a trusted Codespace and close the process after verification.

## Interpret results

- **PASS:** the named check completed successfully. An overall credential PASS
  requires successful provider authentication and Clerk pairing.
- **FAIL:** supplied input failed validation, a credential probe returned 401/403,
  or the successfully retrieved Clerk signing-key sets did not match. No raw
  provider error is printed. Review privately; do not alter credentials to force
  a pass.
- **UNVERIFIED:** input was unavailable, probes were not enabled, input was
  cancelled, or a request could not establish evidence (including redirects,
  rate limits, network/TLS failures, or unusable response data).

Exit `0` means all seven credential checks passed. Exit `1` means at least one
failed or remains unverified. An HTTP 200 alone is insufficient for Clerk: usable
signing keys and a matching frontend/backend key are also required.

`nine_effective_preview_checks` is **always UNVERIFIED** in this tool. It never
sets `VERCEL_ENV`, `VERCEL_GIT_COMMIT_REF`, or other deployment metadata and never
runs `scripts/auth-diagnostics-safety.mjs`. Outbound/provider/billing/scheduler
configuration, Concierge, inheritance, Vercel build restrictions, actual runtime
scope, hosted scheduler rejection, and Subscriber A/B sign-in still require their
separate checks. A credential PASS does not authorize deployment or establish
hosted authentication success.
