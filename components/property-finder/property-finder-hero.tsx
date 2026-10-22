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
          <div className="property-finder-hero-copy flex w-full flex-col justify-center bg-gradient-to-br from-cream via-cream to-champagne/35 px-6 py-5 sm:px-10 sm:py-6 lg:min-w-[min(100%,20rem)] lg:px-12 lg:py-7">
            <p className="whitespace-normal text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-gold-deep sm:text-[11px]">
              Property finder
            </p>
            <h1 className="mt-1.5 whitespace-normal font-serif text-[24px] font-semibold leading-[1.15] text-ink sm:mt-2 sm:text-[30px] lg:text-[32px]">
              The right property changes everything.
            </h1>
            <p className="property-finder-hero-description mt-2 whitespace-normal text-[14px] leading-relaxed text-slate-text sm:mt-3 sm:text-[15px]">
              Discover homes that match your clients&apos; goals and move their search forward.
            </p>
          </div>

          <div className="relative min-h-[200px] w-full min-w-0 sm:min-h-[220px] md:min-h-[240px] lg:min-h-[260px]">
            <Image
              src={PROPERTY_FINDER_HERO_IMAGE}
              alt="Modern luxury home at sunset"
              fill
              priority
              unoptimized
              sizes="(max-width: 768px) 100vw, 55vw"
              className="object-cover saturate-[1.05] contrast-[1.03]"
              style={{ objectPosition: "55% center" }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 hidden w-[12%] max-w-[120px] bg-gradient-to-r from-cream/90 via-cream/15 to-transparent md:block"
              aria-hidden
            />
          </div>
        </div>

        <div className="border-t border-outline-variant/10 bg-ivory px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
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
