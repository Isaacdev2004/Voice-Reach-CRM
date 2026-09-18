"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircleIcon } from "@/components/icons/landing-icons";
import { PLAN_OPTIONS } from "@/lib/billing/plans";

const SIGN_UP = "/sign-up";
const SALES_EMAIL = "hello@myari.io";

/** Starter, Growth (featured), Pro — Team shown as contact row below */
const DISPLAY_PLANS = PLAN_OPTIONS.filter((p) => p.id !== "team");

export function LandingPricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="text-center">
          <h2 className="font-serif text-[28px] font-semibold text-ink md:text-[36px]">
            Start free. Scale when you&apos;re ready.
          </h2>
          <p className="mx-auto mt-3 w-full max-w-[36rem] px-2 text-[15px] leading-relaxed text-slate-text">
            Growth is our recommended plan. Annual billing saves about two months.
          </p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-outline-variant/20 bg-ivory p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-colors ${
                !annual ? "bg-rose-gold text-ivory" : "text-taupe hover:text-ink"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-colors ${
                annual ? "bg-rose-gold text-ivory" : "text-taupe hover:text-ink"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
          {DISPLAY_PLANS.map((plan) => {
            const featured = Boolean(plan.featured);
            const monthly = plan.price;
            const displayPrice = annual ? Math.round(monthly * 10) : monthly;
            const suffix = annual ? "/yr" : "/mo";

            return (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-[28px] p-7 md:p-8 ${
                  featured
                    ? "z-10 border-[3px] border-rose-gold bg-rose-gold-deep text-ivory shadow-card md:-mt-2 md:mb-2 md:scale-[1.03]"
                    : "border border-outline-variant/20 bg-ivory"
                }`}
              >
                {featured ? (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-rose-gold px-5 py-1 text-[10px] font-bold uppercase tracking-widest text-ivory">
                    Most popular
                  </span>
                ) : null}

                <h3
                  className={`font-serif text-[22px] font-semibold ${featured ? "text-ivory" : "text-ink"}`}
                >
                  {plan.name}
                </h3>
                <p className={`mt-1 text-[13px] ${featured ? "text-ivory/80" : "text-taupe"}`}>
                  {plan.description}
                </p>

                <div className={`mt-6 flex items-baseline gap-1 ${featured ? "text-ivory" : "text-ink"}`}>
                  <span className="font-serif text-[40px] font-semibold leading-none">
                    ${displayPrice}
                  </span>
                  <span className={featured ? "text-ivory/70" : "text-taupe"}>{suffix}</span>
                </div>
                {annual && !featured ? (
                  <p className="mt-1 text-[11px] text-taupe">~2 months free vs monthly</p>
                ) : null}

                <Link
                  href={SIGN_UP}
                  className={`mt-6 block rounded-full py-3.5 text-center text-[14px] font-bold transition-opacity hover:opacity-95 ${
                    featured
                      ? "bg-rose-gold text-ivory"
                      : "border border-rose-gold text-rose-gold-deep hover:bg-rose-gold/5"
                  }`}
                >
                  Start Free
                </Link>

                <ul className={`mt-6 flex-1 space-y-2.5 text-[13px] ${featured ? "text-ivory/90" : "text-slate-text"}`}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircleIcon
                        className={`mt-0.5 shrink-0 ${featured ? "text-sage-light" : "text-rose-gold-deep"}`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {/* Team tier — full width below */}
        {PLAN_OPTIONS.filter((p) => p.id === "team").map((plan) => (
          <div
            key={plan.id}
            className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-outline-variant/15 bg-ivory px-6 py-5 md:flex-row"
          >
            <div>
              <p className="font-serif text-[18px] font-semibold text-ink">
                {plan.name} — from ${plan.price}/mo
              </p>
              <p className="text-[13px] text-slate-text">
                Teams &amp; brokerages · 5 users included · pooled messaging · custom volume
              </p>
            </div>
            <a
              href={`mailto:${SALES_EMAIL}?subject=ARI Team Plan`}
              className="shrink-0 rounded-full border border-rose-gold px-6 py-2.5 text-[13px] font-semibold text-rose-gold-deep hover:bg-rose-gold/5"
            >
              Contact Sales
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
