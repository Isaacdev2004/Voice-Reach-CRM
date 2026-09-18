import Link from "next/link";
import { FOUNDING_100 } from "@/lib/marketing/founding";

export function LandingFoundingOffer() {
  return (
    <section className="border-y border-rose-gold/25 bg-gradient-to-r from-rose-gold-deep via-rose-gold-deep to-[#8f6848] py-10 md:py-12">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-8">
        <div className="text-ivory">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ivory/70">
            {FOUNDING_100.name}
          </p>
          <h2 className="mt-2 font-serif text-[26px] font-semibold leading-tight md:text-[32px]">
            {FOUNDING_100.positioning}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ivory/85">{FOUNDING_100.tagline}</p>
          <p className="mt-2 text-[13px] font-medium text-sage-light">{FOUNDING_100.promise}</p>
        </div>
        <div className="rounded-2xl border border-ivory/15 bg-ivory/10 p-6 backdrop-blur-sm">
          <ul className="space-y-3">
            {FOUNDING_100.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-[14px] text-ivory">
                <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-sage-light">
                  check_circle
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <Link
            href="/sign-up"
            className="mt-6 block rounded-full bg-ivory py-3 text-center text-[14px] font-bold uppercase tracking-wide text-ink transition-opacity hover:opacity-95"
          >
            Join Founding 100 — Start Free
          </Link>
          <p className="mt-3 text-center text-[11px] text-ivory/60">
            Limited to the first {FOUNDING_100.seatsTotal} agents · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
