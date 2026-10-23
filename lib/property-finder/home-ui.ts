export type PropertyFinderActionCard = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageTile: number;
  href: string;
  imageAlt: string;
};

export const PROPERTY_FINDER_ACTION_CARDS: PropertyFinderActionCard[] = [
  {
    id: "search",
    title: "Search Listings",
    description: "Run a tailored search and share links with your client.",
    image: "/brand/campaigns/interiors-a.png",
    imageTile: 0,
    href: "#client-workspace",
    imageAlt: "Architectural living room artwork",
  },
  {
    id: "saved",
    title: "Saved Searches",
    description: "Review area and budget criteria saved on each contact.",
    image: "/brand/campaigns/interiors-a.png",
    imageTile: 2,
    href: "#saved-searches",
    imageAlt: "Sunlit living room",
  },
  {
    id: "activity",
    title: "Activity Log",
    description:
      "CRM events as you send campaigns, update contacts, and use Voice Studio.",
    image: "/brand/campaigns/interiors-a.png",
    imageTile: 5,
    href: "/dashboard/activity",
    imageAlt: "Sunlit residential interior artwork",
  },
  {
    id: "campaign",
    title: "Create Campaign",
    description: "Launch listing alerts or nurture sequences in minutes.",
    image: "/brand/campaigns/interiors-a.png",
    imageTile: 10,
    href: "/dashboard/campaigns#campaign-builder",
    imageAlt: "Luxury dining room artwork",
  },
];

export const RECENT_CONTACTS_STORAGE_KEY = "ari-property-finder-recent";
