import Image from "next/image";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { FOUNDING_100 } from "@/lib/marketing/founding";

const LIFESTYLE_IMAGE = "/brand/final-cta-lifestyle.png";

const TRIAL_DETAILS = [
  "Card required",
  "No charge until trial ends",
  "Cancel anytime",
] as const;

export function LandingFinalCta() {
  return (
    <section className="relative overflow-hidden bg-cream py-12 md:py-16 lg:py-20">
      <div className="landing-shell">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:gap-16">
          <div className="w-full min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-rose-gold-deep sm:tracking-[0.18em] lg:text-[13px]">
              Ready to close more deals?
            </p>
            <h2 className="mt-3 font-serif text-[28px] font-semibold leading-[1.15] text-ink sm:text-[32px] md:text-[38px] lg:text-[42px]">
              Start your {FOUNDING_100.trialDays}-day free trial.
            </h2>
            <p className="mt-4 max-w-[36rem] text-[16px] leading-relaxed text-slate-text lg:max-w-none lg:text-[17px]">
              Join {FOUNDING_100.name} — white-glove setup, founding-member pricing, and a CRM that
              turns leads into conversations and closed deals.
            </p>
            <div className="mt-8 flex w-full flex-col items-stretch gap-5 sm:items-start">
              <StartFreeButton
                location="final-cta"
                showArrow
                className="w-full !px-10 !py-4 !text-[15px] sm:w-auto sm:!px-12"
              />
              <ul className="flex w-full max-w-sm flex-col gap-2.5 text-[14px] leading-snug text-taupe sm:max-w-md sm:gap-3 sm:text-[15px]">
                {TRIAL_DETAILS.map((line) => (
                  <li key={line} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-gold-deep/70"
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] lg:mx-0 lg:max-w-none lg:justify-self-end">
            <div className="overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_20px_50px_rgba(26,20,16,0.12)] lg:rounded-[1.25rem]">
              <Image
                src={LIFESTYLE_IMAGE}
                alt="Luxury coastal home with ARI mobile dashboard showing leads and follow-ups"
                width={1200}
                height={900}
                sizes="(max-width: 1024px) 100vw, 420px"
                className="aspect-[4/3] h-auto w-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
