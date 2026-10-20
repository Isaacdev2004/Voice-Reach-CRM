import type { Metadata } from "next";
import Link from "next/link";
import { PlaybookLeadForm } from "@/components/landing/playbook-lead-form";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Free Agent Follow-Up Playbook | ARI CRM",
  description:
    "Download the free real estate follow-up playbook — scripts, cadences, and a simple system to re-engage cold leads without another hard sell.",
  path: "/playbook",
});

const INCLUDES = [
  "Speed-to-lead SMS scripts that sound like you",
  "A 7-touch cadence for portal and open-house leads",
  "Re-engagement messages for cold database contacts",
  "Compliance reminders before you hit send",
] as const;

export default function PlaybookPage() {
  const { playbook, trialDays } = SITE_OFFER;

  return (
    <MarketingShell>
      <section className="hero-gradient py-12 md:py-16">
        <div className="landing-shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start lg:gap-14">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
              Free resource
            </p>
            <h1 className="mt-3 font-serif text-[2.25rem] font-semibold leading-tight text-ink md:text-[2.75rem]">
              {playbook.title}
            </h1>
            <p className="mt-4 max-w-[36rem] text-[17px] leading-relaxed text-slate-text">
              {playbook.subtitle} Not ready for a trial? Start here — no checkout required.
            </p>
            <ul className="mt-8 space-y-3 text-[15px] text-slate-text">
              {INCLUDES.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-rose-gold-deep" aria-hidden>
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-[14px] text-taupe">
              <span>Already convinced?</span>
              <StartFreeButton
                location="playbook-inline"
                className="!px-6 !py-2 !text-[13px]"
              />
              <span>
                or{" "}
                <Link href="/contact" className="font-medium text-rose-gold-deep hover:underline">
                  request a live demo
                </Link>
              </span>
            </div>
          </div>
          <PlaybookLeadForm />
        </div>
      </section>
      <section className="border-t border-outline-variant/10 bg-cream py-10">
        <div className="landing-shell text-center text-[14px] text-slate-text">
          {trialDays}-day free trial available when you&apos;re ready · {SITE_OFFER.whiteGlove.shortLine}
        </div>
      </section>
    </MarketingShell>
  );
}
