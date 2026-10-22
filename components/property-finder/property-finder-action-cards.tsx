import { Icon } from "@/components/ui/icon";
import { PROPERTY_FINDER_ACTION_CARDS } from "@/lib/property-finder/home-ui";
import Link from "next/link";

const ICONS: Record<string, string> = {search:"home",saved:"bookmark",activity:"monitoring",campaign:"send"};

export function PropertyFinderActionCards() {
  return <nav className="pf-action-grid" aria-label="Property Finder quick actions">
    {PROPERTY_FINDER_ACTION_CARDS.map(card => <Link key={card.id} href={card.href} className="pf-action-card">
      <span className="pf-action-icon" aria-hidden="true"><Icon name={ICONS[card.id]} /></span>
      <h2>{card.title}</h2><p>{card.description}</p>
      <span className="pf-action-arrow" aria-hidden="true"><Icon name="arrow_forward" /></span>
    </Link>)}
  </nav>;
}
