import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { HERO_IMAGES } from "@/lib/marketing/hero-images";
import { SITE_OFFER } from "@/lib/marketing/site-offer";

const PROOF_POINTS = [
  {
    icon: "dashboard" as const,
    title: "One dashboard for your pipeline",
    body: "Contacts, campaigns, tasks, and activity history - see who needs attention next.",
  },
  {
    icon: "campaign" as const,
    title: "Multi-step follow-up campaigns",
    body: "SMS, email, and ringless voicemail sequences you configure once and run on schedule.",
  },
  {
    icon: "replay" as const,
    title: "Reactivate leads you already paid for",
    body: "Segment dormant contacts and restart conversations with structured, consent-aware outreach.",
  },
  {
    icon: "support_agent" as const,
    title: SITE_OFFER.whiteGlove.shortLine,
    body: SITE_OFFER.whiteGlove.detail,
  },
];

/** Product proof block - replaces unverified placeholder testimonials until real quotes are approved. */
export function LandingProductProof() {
  return (
    <section id="proof" className="bg-ivory py-16 md:py-20 lg:py-24">
      <div className="landing-shell">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-gold-deep md:text-[12px]">
            See how ARI works
          </p>
          <h2 className="mt-3 font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
            {SITE_OFFER.primaryPromise}
          </h2>
          <p className="mx-auto mt-4 max-w-[40rem] text-[16px] leading-relaxed text-slate-text md:text-[17px]">
            ARI is a {SITE_OFFER.positioning.primary} - not just another contact database. Organize
            leads, automate repetitive outreach, and step in when a real conversation matters.
          </p>
        </div>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="overflow-hidden rounded-2xl border border-outline-variant/15 shadow-card">
            <Image
              src={HERO_IMAGES.followUpWorkflow.src}
              alt={HERO_IMAGES.followUpWorkflow.alt}
              width={1200}
              height={900}
              className="h-auto w-full object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <ul className="space-y-5">
            {PROOF_POINTS.map((point) => (
              <li key={point.title} className="flex gap-4 rounded-2xl border border-outline-variant/10 bg-cream p-5">
                <Icon name={point.icon} className="mt-0.5 shrink-0 text-[26px] text-rose-gold-deep" />
                <div>
                  <p className="font-serif text-[18px] font-semibold text-ink">{point.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-slate-text">{point.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-center text-[14px] text-taupe">
          Watch the workflow demo on the{" "}
          <Link href="/#demo" className="font-medium text-rose-gold-deep hover:underline">
            homepage
          </Link>{" "}
          ·{" "}
          <Link href="/resources" className="font-medium text-rose-gold-deep hover:underline">
            Read follow-up guides
          </Link>
        </p>
      </div>
    </section>
  );
}
