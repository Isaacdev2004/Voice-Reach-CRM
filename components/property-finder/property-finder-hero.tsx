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
    <section className="property-finder-hero relative block w-full max-w-full">
      <div className="relative w-full overflow-hidden rounded-[28px] border border-outline-variant/10 bg-champagne shadow-card">
        <div className="relative aspect-[16/10] w-full min-h-[280px] sm:aspect-[21/9] sm:min-h-[300px] lg:min-h-[340px]">
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
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cream/95 via-cream/50 to-cream/10 sm:from-cream/88 sm:via-cream/40 sm:to-transparent"
            aria-hidden
          />
          <div className="pointer-events-none absolute right-4 top-4 z-[2] hidden max-w-[240px] text-right sm:block sm:right-8 sm:top-8">
            <p className="font-serif text-[13px] italic leading-snug text-ink/90 sm:text-[14px]">
              &ldquo;The right home changes everything.&rdquo;
            </p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
              MyARI
            </p>
          </div>

          <div className="absolute inset-0 z-[2] flex w-full flex-col justify-between p-6 sm:p-10 lg:p-12">
            <div className="w-full max-w-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-gold-deep sm:text-[11px]">
                Property finder
              </p>
              <h1 className="mt-2 font-serif text-[28px] font-semibold leading-[1.12] text-ink sm:text-[36px] lg:text-[40px]">
                Find the right match
              </h1>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-slate-text sm:text-[16px]">
                Search listings and send curated property follow-up tied to each contact.
              </p>
            </div>

            <div className="relative z-30 mt-6 w-full max-w-3xl sm:mt-8">
              <PropertyFinderClientBar
                contacts={contacts}
                loading={loading}
                value={selectedId}
                onChange={onSelectContact}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
