"use client";

import { PropertyFinderClientBar } from "@/components/property-finder/property-finder-client-bar";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import Image from "next/image";

type PropertyFinderHeroProps = {
  contacts: ApiContact[];
  loading: boolean;
  selectedId: string;
  onSelectContact: (id: string) => void;
};

export function PropertyFinderHero({
  contacts,
  loading,
  selectedId,
  onSelectContact,
}: PropertyFinderHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-outline-variant/10 bg-ivory shadow-card">
      <div className="relative min-h-[280px] sm:min-h-[320px] lg:min-h-[360px]">
        <Image
          src="/brand/heroes/properties.jpg"
          alt="Modern luxury home at sunset"
          fill
          priority
          quality={92}
          sizes="(max-width: 1400px) 100vw, 1400px"
          className="object-cover"
          style={{ objectPosition: "52% center" }}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cream/95 via-cream/55 to-transparent sm:from-cream/90 sm:via-cream/35"
          aria-hidden
        />
        <div className="pointer-events-none absolute right-4 top-4 z-[2] max-w-[240px] text-right sm:right-8 sm:top-8">
          <p className="font-serif text-[13px] italic leading-snug text-ink/90 sm:text-[14px]">
            &ldquo;The right home changes everything.&rdquo;
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
            MyARI
          </p>
        </div>

        <div className="relative z-[2] flex h-full min-h-[280px] flex-col justify-between px-6 py-8 sm:min-h-[320px] sm:px-10 sm:py-10 lg:min-h-[360px] lg:px-12">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-gold-deep sm:text-[11px]">
              Property finder
            </p>
            <h1 className="mt-2 font-serif text-[28px] font-semibold leading-[1.12] text-ink sm:text-[36px] lg:text-[40px]">
              Find the right match
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-text sm:text-[16px]">
              Search listings and send curated property follow-up tied to each contact.
            </p>
          </div>

          <div className="mt-8 max-w-3xl">
            <PropertyFinderClientBar
              contacts={contacts}
              loading={loading}
              value={selectedId}
              onChange={onSelectContact}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
