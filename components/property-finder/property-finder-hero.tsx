import { PROPERTY_FINDER_HERO_IMAGE } from "@/lib/property-finder/assets";
import Image from "next/image";

export function PropertyFinderHero() {
  return (
    <section className="pf-premium-hero" aria-labelledby="property-finder-title">
      <div className="pf-hero-photo"><Image src={PROPERTY_FINDER_HERO_IMAGE} alt="Sunlit architectural dining room with cream chairs, oak table and garden windows" fill priority sizes="(max-width: 767px) 100vw, 65vw" className="object-cover" /></div>
      <div className="pf-hero-copy">
        <p className="pf-eyebrow">PROPERTY FINDER</p>
        <h1 id="property-finder-title">The right property changes everything.</h1>
        <p>Discover homes that match your clients&apos; goals and move their search forward.</p>
      </div>
    </section>
  );
}
