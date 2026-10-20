"use client";

import { Icon } from "@/components/ui/icon";
import { PROPERTY_FINDER_ACTION_CARDS } from "@/lib/property-finder/home-ui";
import Image from "next/image";
import Link from "next/link";

export function PropertyFinderActionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PROPERTY_FINDER_ACTION_CARDS.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className="group flex flex-col overflow-hidden rounded-[22px] border border-outline-variant/10 bg-ivory shadow-card transition-shadow hover:shadow-md"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-champagne">
            <Image
              src={card.image}
              alt={card.imageAlt}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, 280px"
            />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="font-serif text-[18px] font-semibold text-ink">{card.title}</h3>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-text">
              {card.description}
            </p>
            <div className="mt-4 flex justify-end">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-gold-deep text-ivory shadow-sm transition-transform group-hover:translate-x-0.5">
                <Icon name="arrow_forward" className="text-[18px]" />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
