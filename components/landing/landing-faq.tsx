"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "How long does setup take?",
    a: "Most agents are live within 24–48 hours. We include white-glove setup on every plan — we import your leads, configure follow-up, and walk you through the dashboard.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 14 days free for Founding 100 members. Create your account with email only; billing starts after your trial when you choose a plan. Cancel anytime.",
  },
  {
    q: "Can I import my existing leads?",
    a: "Yes. CSV import is built in, and Founding 100 onboarding includes white-glove import — we load your database and configure your first follow-up campaign for you.",
  },
  {
    q: "What is the Founding 100 offer?",
    a: "The first 100 agents get early access, white-glove setup, founding-member pricing locked for 3 months, and a direct feedback channel to the team.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. ARI is month-to-month with no long-term contract. Cancel from your account settings — your data exports anytime.",
  },
  {
    q: "What integrations do you support?",
    a: "Google Calendar, Twilio SMS, email delivery, ringless voicemail, and Dotloop (transactions). More CRM imports and Claude AI controls are rolling out for beta users.",
  },
  {
    q: "Is ARI compliant for real estate outreach?",
    a: "Yes. Built-in DNC scrubbing, consent tracking, quiet hours, and TCPA/FCC-aware campaign gates. You stay in control of who gets contacted and when.",
  },
  {
    q: "What if I exceed my SMS or RVM limits?",
    a: "Starter uses pay-as-you-go messaging. Growth and Pro include monthly allotments with transparent overage rates. Team plans get volume pricing — contact us for a quote.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-cream py-16 md:py-20 lg:py-24">
      <div className="landing-shell mx-auto max-w-[44rem]">
        <p className="text-center text-label-md font-semibold uppercase tracking-widest text-rose-gold-deep md:text-[13px]">
          FAQ
        </p>
        <h2 className="mt-3 text-center font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
          Common questions
        </h2>
        <ul className="mt-10 space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <li
                key={item.q}
                className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-ivory"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-semibold text-ink">{item.q}</span>
                  <span
                    className={`material-symbols-outlined shrink-0 text-[22px] text-rose-gold-deep transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {isOpen ? (
                  <p className="border-t border-outline-variant/10 px-5 pb-4 pt-2 text-[14px] leading-relaxed text-slate-text">
                    {item.a}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
