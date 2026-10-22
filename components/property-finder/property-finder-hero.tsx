"use client";

import { PropertyFinderClientBar } from "@/components/property-finder/property-finder-client-bar";
import { PROPERTY_FINDER_HERO_IMAGE } from "@/lib/property-finder/assets";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { PremiumPageHeader } from "@/components/layout/premium-page-header";

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
    <PremiumPageHeader className="property-finder-hero" config={{
      eyebrow: "Property Finder",
      title: "The right property changes everything.",
      subtitle: "Discover homes that match your clients' goals and move their search forward.",
      image: PROPERTY_FINDER_HERO_IMAGE, imageWidth: 1024, imageHeight: 576,
      imageAlt: "Modern luxury home at sunset", imageObjectPosition: "55% center",
    }}>
      <PropertyFinderClientBar contacts={contacts} loading={loading} value={selectedId} onChange={onSelectContact} />
    </PremiumPageHeader>
  );
}
