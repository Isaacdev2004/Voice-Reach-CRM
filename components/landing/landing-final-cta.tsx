import Image from "next/image";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { FOUNDING_100 } from "@/lib/marketing/founding";

/** Warm lifestyle accent — plant on books, matches mockup footer greenery. */
const GREENERY_IMAGE =
  "https://images.unsplash.com/photo-1456324504439-367ceeef1552?auto=format&fit=crop&w=900&h=1100&q=80";

export function LandingFinalCta() {
  return (
    <section className="relative overflow-hidden bg-cream py-12 md:py-16 lg:py-20">
      <div className="landing-shell">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] md:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:gap-16">
          <div className="max-w-xl md:max-w-none">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep md:text-[13px]">
              Ready to close more deals?
            </p>
            <h2 className="mt-3 font-serif text-[32px] font-semibold leading-tight text-ink md:text-[38px] lg:text-[42px]">
              Start your {FOUNDING_100.trialDays}-day free trial.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-slate-text lg:text-[17px]">
              Join {FOUNDING_100.name} — white-glove setup, founding-member pricing, and a CRM that
              turns leads into conversations and closed deals.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <StartFreeButton
                location="final-cta"
                showArrow
                className="!px-12 !py-4 !text-[15px]"
              />
              <p className="text-[13px] text-taupe">
                No credit card required · Cancel anytime
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[320px] md:mx-0 md:max-w-none md:justify-self-end">
            <div className="overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_20px_50px_rgba(26,20,16,0.12)] lg:rounded-[1.25rem]">
              <Image
                src={GREENERY_IMAGE}
                alt=""
                width={900}
                height={1100}
                sizes="(max-width: 768px) 320px, 360px"
                className="h-auto w-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
