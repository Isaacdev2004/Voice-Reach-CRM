export type PropertyFinderActionCard = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
  imageAlt: string;
};

export const PROPERTY_FINDER_ACTION_CARDS: PropertyFinderActionCard[] = [
  {
    id: "search",
    title: "Search Listings",
    description: "Run a tailored search and share links with your client.",
    image: "/brand/heroes/properties.jpg",
    href: "#client-workspace",
    imageAlt: "Suburban home exterior",
  },
  {
    id: "saved",
    title: "Saved Searches",
    description: "Review area and budget criteria saved on each contact.",
    image: "/brand/heroes/dashboard.jpg",
    href: "#client-workspace",
    imageAlt: "Sunlit living room",
  },
  {
    id: "activity",
    title: "Client Activity",
    description: "See recent outreach, notes, and touchpoints in one feed.",
    image: "/brand/heroes/contacts.jpg",
    href: "/dashboard/activity",
    imageAlt: "Keys on a table",
  },
  {
    id: "campaign",
    title: "Create Campaign",
    description: "Launch listing alerts or nurture sequences in minutes.",
    image: "/brand/heroes/campaigns.jpg",
    href: "/dashboard/campaigns#campaign-builder",
    imageAlt: "Notebook and pen on a desk",
  },
];

export const RECENT_CONTACTS_STORAGE_KEY = "ari-property-finder-recent";
