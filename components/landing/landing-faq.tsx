"use client";

import { FOUNDING_100 } from "@/lib/marketing/founding";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "How long does setup take?",
    a: "Most agents are live within 24–48 hours. We include white-glove setup on every plan — we import your leads, configure follow-up, and walk you through the dashboard.",
  },
  {
    q: "Is there a free trial?",
    a: `Yes — ${SITE_OFFER.trialDays} days free on every plan. ${SITE_OFFER.cardRequiredNote}. Trial includes ${FOUNDING_100.trialUsageCaps.sms} SMS, ${FOUNDING_100.trialUsageCaps.rvm} voicemails, and ${FOUNDING_100.trialUsageCaps.email} emails so you can test safely.`,
  },
  {
    q: "Can I import my existing leads?",
    a: `Yes. CSV import is built in, and ${SITE_OFFER.whiteGlove.shortLine.toLowerCase()} — we load your database and configure your first follow-up campaign for you.`,
  },
  {
    q: "What is the Founding 100 offer?",
    a: `The first ${FOUNDING_100.seatsTotal} agents get early access, founding-member pricing, and a direct feedback channel to the team. ${SITE_OFFER.whiteGlove.shortLine}.`,
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. ARI is month-to-month with no long-term contract. Cancel from your account settings — your data exports anytime.",
  },
  {
    q: "What integrations do you support?",
    a: `Google Calendar and Dotloop (transactions). Messaging via Twilio SMS, email delivery, and Slybroadcast ringless voicemail. Import via CSV and onboarding-assisted migration.`,
  },
  {
    q: "Does ARI help with outreach compliance?",
    a: `${SITE_OFFER.compliance.shortNote} You stay in control of who gets contacted and when.`,
  },
  {
    q: "What if I exceed my SMS or RVM limits?",
    a: "Starter uses pay-as-you-go messaging. Growth and Pro include monthly allotments with transparent overage rates. Team plans get volume pricing — contact us for a quote.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="scroll-mt-[4.25rem] bg-cream pt-8 pb-6 md:py-20 lg:py-24"
    >
      <div className="landing-shell mx-auto max-w-[44rem]">
        <p className="text-center text-label-md font-semibold uppercase tracking-widest text-rose-gold-deep md:text-[13px]">
          FAQ
        </p>
        <h2 className="mt-2 text-center font-serif text-[28px] font-semibold text-ink md:mt-3 md:text-[36px] lg:text-[40px]">
          Common questions
        </h2>
        <ul className="mt-6 space-y-3 md:mt-10">
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
