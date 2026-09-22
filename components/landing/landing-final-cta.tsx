import { StartFreeButton } from "@/components/landing/start-free-button";
import { FOUNDING_100 } from "@/lib/marketing/founding";

export function LandingFinalCta() {
  return (
    <section className="relative overflow-hidden py-20 md:py-24 lg:py-28">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(rgba(250,247,242,0.88), rgba(250,247,242,0.92)), url('https://images.unsplash.com/photo-1497366216548-375260702d4?auto=format&fit=crop&w=1800&q=80')",
        }}
        aria-hidden
      />
      <div className="landing-shell relative">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h2 className="font-serif text-[32px] font-semibold leading-tight text-ink md:text-[38px] lg:text-[42px]">
            Start your {FOUNDING_100.trialDays}-day free trial.
          </h2>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-slate-text lg:text-[17px]">
            Join {FOUNDING_100.name} — white-glove setup, founding-member pricing, and a CRM that
            turns leads into conversations and closed deals.
          </p>
          <StartFreeButton
            location="final-cta"
            showArrow
            className="mt-8 !px-12 !py-4 !text-[15px]"
          />
          <p className="mt-4 text-[13px] text-taupe">
            No credit card required · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
