# Agent guide (MyARI / Voice-Reach-CRM)

- **Auth:** Clerk `requireUserId()` on all dashboard APIs; filter Supabase by `owner_id`.
- **Billing:** Use `lib/billing/claim-checkout-session.ts` for Stripe session claims — never attach sessions without ownership checks.
- **Webhooks:** Twilio SMS must validate signature; voice webhooks require `VOICE_WEBHOOK_SECRET` in production.
- **Outbound:** Respect `ALLOW_LIVE_OUTBOUND`; default campaigns to mock/simulation for demos.
- **Theme CSS:** Avoid `max-w-xl` for prose — spacing tokens override width (use `var(--container-xl)` or `max-w-[36rem]`).
- **Demo:** See `docs/SYMPOSIUM-DEMO.md` before presentations.
