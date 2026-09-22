import { StartFreeButton } from "@/components/landing/start-free-button";

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
      <div className="landing-shell relative flex flex-col items-center justify-between gap-8 md:flex-row md:gap-12">
        <div className="max-w-xl text-center md:text-left">
          <h2 className="font-serif text-[32px] font-semibold leading-tight text-ink md:text-[38px] lg:text-[42px]">
            Start your 14-day free trial.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-text lg:text-[17px]">
            Join 1,000+ real estate agents who trust ARI to turn leads into closed deals.
          </p>
          <p className="mt-3 text-[13px] text-taupe">No credit card required.</p>
        </div>
        <StartFreeButton
          location="final-cta"
          showArrow
          className="shrink-0 !px-12 !py-4 !text-[15px]"
        />
      </div>
    </section>
  );
}
