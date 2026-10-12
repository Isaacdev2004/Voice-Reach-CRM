"use client";

import Link from "next/link";

import { Reveal, RevealStagger } from "@/components/marketing/motion-reveal";
import { FEATURE_PAGES, type FeaturePageSlug } from "@/lib/seo/feature-pages";

type FeaturesIndexGridProps = {
  groups: Array<{ category: string; items: FeaturePageSlug[] }>;
};

export function FeaturesIndexGrid({ groups }: FeaturesIndexGridProps) {
  return (
    <section className="bg-cream py-10 md:py-14">
      <div className="landing-shell space-y-12">
        {groups.map(({ category, items }) => (
          <div key={category}>
            <Reveal>
              <h2 className="font-serif text-[22px] font-semibold text-ink md:text-[26px]">{category}</h2>
            </Reveal>
            <RevealStagger className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stepMs={70}>
              {items.map((slug) => {
                const page = FEATURE_PAGES[slug];
                return (
                  <Link
                    key={slug}
                    href={page.path}
                    className="luxury-hover group block rounded-2xl border border-outline-variant/10 bg-ivory p-6 shadow-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-gold-deep">
                      {page.category}
                    </p>
                    <h3 className="mt-2 font-serif text-[18px] font-semibold text-ink group-hover:text-rose-gold-deep">
                      {page.h1}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-slate-text">
                      {page.intro}
                    </p>
                  </Link>
                );
              })}
            </RevealStagger>
          </div>
        ))}
      </div>
    </section>
  );
}
