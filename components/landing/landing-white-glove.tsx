import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SITE_OFFER } from "@/lib/marketing/site-offer";

const SETUP_STEPS = [
  "Lead import — we help bring your existing database into ARI",
  "Pipeline setup — stages that match how you manage buyers and sellers",
  "First follow-up campaign — your initial automated sequence ready to run",
];

export function LandingWhiteGlove() {
  return (
    <section id="onboarding" className="scroll-mt-24 border-y border-outline-variant/10 bg-ivory py-12 md:py-16 lg:py-20">
      <div className="landing-shell grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
            Onboarding
          </p>
          <h2 className="mt-3 font-serif text-[28px] font-semibold text-ink md:text-[36px]">
            You bring the leads. We set up the system.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
            Every ARI plan includes help importing your contacts, configuring your pipeline, and
            building your first follow-up campaign. {SITE_OFFER.whiteGlove.setupWindow}
          </p>
          <ul className="mt-6 space-y-3">
            {SETUP_STEPS.map((step) => (
              <li key={step} className="flex gap-3 text-[15px] text-slate-text md:text-[16px]">
                <Icon name="check_circle" className="shrink-0 text-rose-gold-deep" />
                {step}
              </li>
            ))}
          </ul>
          <Link
            href="/contact"
            className="mt-8 inline-flex text-[15px] font-semibold text-rose-gold-deep hover:underline"
          >
            Book a walkthrough or ask a question →
          </Link>
        </div>
        <div className="rounded-2xl border border-outline-variant/15 bg-cream p-8">
          <p className="font-serif text-[22px] font-semibold text-ink">What happens after signup</p>
          <ol className="mt-5 space-y-4 text-[15px] leading-relaxed text-slate-text">
            <li>
              <span className="font-semibold text-ink">1.</span> Start your {SITE_OFFER.trialDays}
              -day trial ({SITE_OFFER.cardRequiredNote.toLowerCase()})
            </li>
            <li>
              <span className="font-semibold text-ink">2.</span> {SITE_OFFER.whiteGlove.contactWindow}
            </li>
            <li>
              <span className="font-semibold text-ink">3.</span> We import leads, configure pipeline,
              and launch your first campaign together
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
