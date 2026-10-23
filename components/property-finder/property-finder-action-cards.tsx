"use client";
import { Icon } from "@/components/ui/icon";
import { PROPERTY_FINDER_ACTION_CARDS } from "@/lib/property-finder/home-ui";
import { PropertyLifestyleArt } from "./property-lifestyle-art";
import Link from "next/link";
const ICONS: Record<string, string> = {
  search: "home",
  saved: "bookmark",
  activity: "monitoring",
  campaign: "send",
};
export function PropertyFinderActionCards({
  onSearch,
}: {
  onSearch?: () => void;
}) {
  return (
    <nav className="pf-action-grid" aria-label="Property Finder quick actions">
      {PROPERTY_FINDER_ACTION_CARDS.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className="pf-action-card"
          onClick={(e) => {
            if (card.id === "search" && onSearch) {
              e.preventDefault();
              onSearch();
            }
          }}
        >
          <PropertyLifestyleArt
            tile={card.imageTile}
            image={card.image}
            className="pf-action-photo"
          />
          <span className="pf-action-fade" aria-hidden="true" />
          <span className="pf-action-icon" aria-hidden="true">
            <Icon name={ICONS[card.id]} />
          </span>
          <div className="pf-action-copy">
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </div>
          <span className="pf-action-arrow" aria-hidden="true">
            <Icon name="arrow_forward" />
          </span>
        </Link>
      ))}
    </nav>
  );
}
