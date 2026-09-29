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
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,440px)] lg:gap-16">
          <div className="w-full">
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
            <div className="mt-8 flex w-full flex-col gap-8">
              <StartFreeButton
                location="final-cta"
                showArrow
                className="w-full !px-10 !py-4 !text-[15px] sm:w-auto sm:!px-12"
              />
              <div className="flex w-full flex-col gap-5 sm:gap-6">
                {TRIAL_DETAILS.map((line) => (
                  <p
                    key={line}
                    className="w-full text-[15px] font-medium leading-tight tracking-wide text-taupe sm:text-[16px]"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[440px] lg:mx-0 lg:max-w-none lg:justify-self-end">
            <div className="overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_20px_50px_rgba(26,20,16,0.12)] lg:rounded-[1.25rem]">
              <Image
                src={LIFESTYLE_IMAGE}
                alt="Luxury coastal home with ARI mobile dashboard showing leads and follow-ups"
                width={900}
                height={1125}
                sizes="(max-width: 1024px) 100vw, 440px"
                className="aspect-[4/5] h-auto w-full object-cover object-center"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
