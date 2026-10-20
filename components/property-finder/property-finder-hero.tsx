"use client";

import { PropertyFinderClientBar } from "@/components/property-finder/property-finder-client-bar";
import { PROPERTY_FINDER_HERO_IMAGE } from "@/lib/property-finder/assets";
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
    <section className="property-finder-hero w-full max-w-full">
      <div className="overflow-hidden rounded-[28px] border border-outline-variant/10 bg-ivory shadow-card">
        <div className="grid w-full grid-cols-1 md:grid-cols-[minmax(17.5rem,1fr)_minmax(0,1.15fr)] md:items-stretch">
          <div className="property-finder-hero-copy flex w-full flex-col justify-center bg-cream px-6 py-8 sm:px-10 sm:py-10 lg:min-w-[min(100%,20rem)] lg:px-12 lg:py-12">
            <p className="whitespace-normal text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-gold-deep sm:text-[11px]">
              Property finder
            </p>
            <h1 className="mt-2 whitespace-normal font-serif text-[28px] font-semibold leading-[1.12] text-ink sm:text-[34px] lg:text-[38px]">
              Find the right match
            </h1>
            <p className="property-finder-hero-description mt-3 whitespace-normal text-[15px] leading-relaxed text-slate-text sm:text-[16px]">
              Search listings and send curated property follow-up tied to each contact.
            </p>
            <div className="mt-4 border-t border-outline-variant/15 pt-4 md:hidden">
              <p className="font-serif text-[13px] italic leading-snug text-ink/90">
                &ldquo;The right home changes everything.&rdquo;
              </p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
                MyARI
              </p>
            </div>
          </div>

          <div className="relative min-h-[220px] w-full min-w-0 sm:min-h-[260px] md:min-h-[300px] lg:min-h-[340px]">
            <Image
              src={PROPERTY_FINDER_HERO_IMAGE}
              alt="Modern luxury home at sunset"
              fill
              priority
              unoptimized
              sizes="(max-width: 768px) 100vw, 55vw"
              className="object-cover"
              style={{ objectPosition: "55% center" }}
            />
            <div
              className="pointer-events-none absolute inset-0 hidden bg-gradient-to-l from-transparent via-transparent to-cream/20 md:block"
              aria-hidden
            />
          </div>
        </div>

        <div className="hidden border-t border-outline-variant/10 bg-cream/80 px-6 py-4 sm:px-10 md:flex md:items-center md:justify-between md:gap-6 lg:px-12">
          <p className="font-serif text-[15px] italic leading-snug text-ink/90 sm:text-[16px]">
            &ldquo;The right home changes everything.&rdquo;
          </p>
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
            MyARI
          </p>
        </div>

        <div className="border-t border-outline-variant/10 bg-ivory px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <PropertyFinderClientBar
            contacts={contacts}
            loading={loading}
            value={selectedId}
            onChange={onSelectContact}
          />
        </div>
      </div>
    </section>
  );
}
