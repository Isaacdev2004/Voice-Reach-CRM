import Image from "next/image";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { FOUNDING_100 } from "@/lib/marketing/founding";

const GREENERY_IMAGE = "/brand/final-cta-greenery.jpg";

export function LandingFinalCta() {
  return (
    <section className="relative overflow-hidden bg-cream py-12 md:py-16 lg:py-20">
      <div className="landing-shell">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:gap-16">
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
            <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:items-start">
              <StartFreeButton
                location="final-cta"
                showArrow
                className="w-full !px-10 !py-4 !text-[15px] sm:w-auto sm:!px-12"
              />
              <p className="text-[13px] leading-relaxed text-taupe sm:max-w-md">
                Card required · No charge until trial ends · Cancel anytime
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] lg:mx-0 lg:max-w-none lg:justify-self-end">
            <div className="overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_20px_50px_rgba(26,20,16,0.12)] lg:rounded-[1.25rem]">
              <Image
                src={GREENERY_IMAGE}
                alt=""
                width={900}
                height={1100}
                sizes="(max-width: 1024px) 100vw, 360px"
                className="aspect-[4/5] h-auto w-full object-cover object-center sm:aspect-[5/4] lg:aspect-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
