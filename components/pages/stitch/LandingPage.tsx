import Link from "next/link";
import { LandingPageHero } from "@/components/landing/landing-page-hero";
import { DemoVideo } from "@/components/landing/demo-video";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFeaturesBar } from "@/components/landing/landing-features-bar";
import { LandingFinalCta } from "@/components/landing/landing-final-cta";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingProductProof } from "@/components/landing/landing-product-proof";
import { LandingReactivation } from "@/components/landing/landing-reactivation";
import { LandingWhiteGlove } from "@/components/landing/landing-white-glove";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Reveal, RevealStagger } from "@/components/marketing/motion-reveal";
import { SITE_OFFER } from "@/lib/marketing/site-offer";

const { leadIntake } = SITE_OFFER;

const HOW_IT_WORKS = [
  {
    num: "1",
    title: "Import your leads",
    body: "Bring your existing database into ARI.",
  },
  {
    num: "2",
    title: "Automate follow-up",
    body: "ARI runs SMS, email, and voicemail sequences on your schedule.",
  },
  {
    num: "3",
    title: "Close more deals",
    body: "ARI shows you who needs attention so you can focus on real conversations.",
  },
];

export function LandingPage() {
  return (
    <MarketingShell variant="home">
      <LandingPageHero />

      <LandingFeaturesBar />
      <Reveal>
        <DemoVideo />
      </Reveal>
      <Reveal delayMs={80}>
        <LandingWhiteGlove />
      </Reveal>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-[4.25rem] bg-cream py-10 md:py-12 lg:py-14">
        <div className="landing-shell">
          <Reveal className="text-center">
            <h2 className="font-serif text-[32px] font-semibold text-ink md:text-[40px] lg:text-[44px]">
              Everything you need to keep leads moving
            </h2>
            <p className="mt-2 text-[17px] text-slate-text lg:text-[18px]">
              {SITE_OFFER.whiteGlove.setupWindow}
            </p>
          </Reveal>
          <RevealStagger className="mt-8 grid gap-8 md:mt-10 md:grid-cols-3 md:gap-6 lg:gap-8" stepMs={120}>
            {HOW_IT_WORKS.map((step) => (
              <article key={step.num} className="luxury-hover text-center rounded-2xl bg-ivory/40 px-4 py-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose-gold/20 bg-ivory font-serif text-[20px] font-semibold text-rose-gold-deep">
                  {step.num}
                </div>
                <h3 className="mb-2 font-serif text-[22px] font-semibold text-ink lg:text-[24px]">
                  {step.title}
                </h3>
                <p className="text-[16px] leading-relaxed text-slate-text lg:text-[17px]">{step.body}</p>
              </article>
            ))}
          </RevealStagger>
          <Reveal className="mt-10 text-center text-[15px] text-slate-text" delayMs={100}>
            Learn more about our{" "}
            <Link href="/real-estate-crm" className="font-semibold text-rose-gold-deep hover:underline">
              real estate CRM
            </Link>{" "}
            and{" "}
            <Link href="/lead-follow-up" className="font-semibold text-rose-gold-deep hover:underline">
              lead follow-up system
            </Link>
            .
          </Reveal>
        </div>
      </section>

      <Reveal>
        <LandingProductProof />
      </Reveal>
      <Reveal delayMs={60}>
        <LandingReactivation />
      </Reveal>
      <Reveal>
        <LandingPricing />
      </Reveal>
      <Reveal>
        <LandingFaq />
      </Reveal>
      <Reveal>
        <LandingFinalCta />
      </Reveal>
    </MarketingShell>
  );
}
