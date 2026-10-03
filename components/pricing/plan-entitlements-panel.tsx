import Link from "next/link";
import { ENGAGEMENT_SCORING_DEFINITION, PLAN_ENTITLEMENTS } from "@/lib/billing/plan-entitlements";
import { PLAN_OPTIONS } from "@/lib/billing/plans";

const DISPLAY_PLANS = PLAN_OPTIONS.filter((p) => p.id !== "team");

export function PlanEntitlementsPanel() {
  return (
    <section className="bg-cream py-10 md:py-12">
      <div className="landing-shell mx-auto max-w-[52rem]">
        <h2 className="font-serif text-[24px] font-semibold text-ink md:text-[28px]">
          What each plan includes
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-text md:text-[16px]">
          Clear entitlements — no guessing. Multi-step automated campaigns and reactivation workflows
          start on Growth. Engagement scoring is on Pro and Team.
        </p>
        <div className="mt-8 space-y-6">
          {DISPLAY_PLANS.map((plan) => {
            const ent = PLAN_ENTITLEMENTS[plan.id];
            return (
              <article
                key={plan.id}
                className="rounded-2xl border border-outline-variant/15 bg-ivory p-6 md:p-7"
              >
                <h3 className="font-serif text-[20px] font-semibold text-ink">{plan.name}</h3>
                <dl className="mt-4 grid gap-3 text-[14px] md:grid-cols-2 md:gap-x-8">
                  <div>
                    <dt className="font-semibold text-ink">Campaigns</dt>
                    <dd className="mt-1 text-slate-text">{ent.campaigns}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">SMS</dt>
                    <dd className="mt-1 text-slate-text">{ent.sms}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">Ringless voicemail</dt>
                    <dd className="mt-1 text-slate-text">{ent.rvm}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">Email</dt>
                    <dd className="mt-1 text-slate-text">{ent.email}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="font-semibold text-ink">Automation</dt>
                    <dd className="mt-1 text-slate-text">{ent.automation}</dd>
                  </div>
                  {ent.scoring ? (
                    <div className="md:col-span-2">
                      <dt className="font-semibold text-ink">Engagement scoring</dt>
                      <dd className="mt-1 text-slate-text">{ent.scoring}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-[14px] text-slate-text">
          {ENGAGEMENT_SCORING_DEFINITION}{" "}
          <Link href="/features/analytics" className="font-semibold text-rose-gold-deep hover:underline">
            Learn more in Analytics
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
