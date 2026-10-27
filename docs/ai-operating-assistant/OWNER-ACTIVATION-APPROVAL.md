# Assistant 2.0 — owner activation (approval required)

Do **not** apply these Vercel Production variables until verification steps below pass and you reply **APPROVE ACTIVATION**.

## 1. Clerk + workspace verification

Sign in at **https://www.myari.io**, then run in the browser console:

```javascript
fetch("/api/assistant/verify")
  .then((r) => r.json())
  .then(console.log);
```

Confirm in the response:

- `clerkMode` is **`live`**
- `clerkUserId` is the account you intend to allowlist
- `sessionMatchesOwner` is **`true`**
- `primaryEmailVerified` is **`true`**
- `myariWorkspace.contactCount` matches your CRM (owner-scoped)
- `assistantPreflight.flagsOk` is **`true`** (Assistant still disabled pre-activation)

**Read-only database evidence (Production Supabase `qlochlyyimulyzzrzyac`):** the primary owner workspace is **`user_3K3RSKGuUrGj35waMWovWke7S9K`** with **234** contacts. You must confirm the signed-in Live Clerk session resolves to this same `clerkUserId` via the request above.

## 2. OpenAI Responses connectivity

While still signed in:

```javascript
fetch("/api/assistant/verify", { method: "POST" })
  .then((r) => r.json())
  .then(console.log);
```

If `INTEGRATIONS_PROBE_SECRET` is set on Vercel, add header  
`x-integrations-probe-secret` with the **exact** Production value (or clear that env var and redeploy to use sign-in only for POST).

Expect `success: true` and `openai.model` **`gpt-5-mini`** (or your configured `OPENAI_ASSISTANT_MODEL`). No API keys appear in the response.

Alternative (authorized host only, pre-activation):  
`node scripts/assistant-production-connectivity-check.mjs` with documented `MYARI_*` guards.

## 3. Proposed Production env (after **APPROVE ACTIVATION**)

| Variable | Value |
|---|---|
| `ASSISTANT_V2_ENABLED` | `true` |
| `ASSISTANT_V2_OWNER_IDS` | `user_3K3RSKGuUrGj35waMWovWke7S9K` *(replace only if step 1 shows a different verified ID)* |
| `ASSISTANT_REASONING_PROVIDER` | `openai` |
| `OPENAI_ASSISTANT_MODEL` | `gpt-5-mini` |
| `ASSISTANT_DAILY_REQUEST_LIMIT` | `5` |
| `ASSISTANT_DAILY_CALL_LIMIT` | `10` |
| `ASSISTANT_DAILY_TOKEN_THRESHOLD` | `100000` |
| `ASSISTANT_APPROVED_SENDS_ENABLED` | `false` |
| `ASSISTANT_SEND_OWNER_IDS` | *(empty)* |
| `ASSISTANT_SEND_RECIPIENTS` | *(empty)* |
| `MYARI_AI_PUBLIC_LAUNCH_VERIFIED` | `false` |
| `MYARI_AI_ENTITLEMENTS_ENABLED` | `false` |
| `MYARI_AI_BILLING_ENABLED` | `false` |
| `MYARI_AI_PRICING_ENABLED` | `false` |
| `MYARI_AI_PLAN_CHANGES_ENABLED` | `false` |
| `ASSISTANT_PARTNERS_VERIFIED` | `false` |
| `ASSISTANT_TRANSACTIONS_VERIFIED` | `false` |
| `ASSISTANT_INBOUND_VERIFIED` | `false` |

**Unchanged:** subscriptions, Stripe plans, `ALLOW_LIVE_OUTBOUND`, campaign auto-send, global subscriber access.

Redeploy Production after saving env vars.

## 4. Post-activation browser checks

1. **`GET /api/assistant/config`** → `enabled: true`, `externalActionsEnabled: false`
2. **`/dashboard/assistant`** — Command Center chat, contact search, campaign draft preview
3. Legacy **Ask MyARI** / FAB still available (Claude task modal) — separate from Assistant 2.0
4. Confirm another signed-in user **without** allowlist still gets disabled Assistant 2.0

## Rollback

Set `ASSISTANT_V2_ENABLED=false`, clear `ASSISTANT_V2_OWNER_IDS`, redeploy. Do not delete CRM data.
