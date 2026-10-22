/** Shared dashboard main-column layout (shell wraps hero + page body). */
export const DASHBOARD_MAIN_COLUMN =
  "mx-auto box-border w-full max-w-[1400px] px-3 pb-8 sm:px-6 lg:px-8";

export const DASHBOARD_HERO_SLOT = "block w-full min-w-0 max-w-full pt-1.5 sm:pt-2";

/** Page body below shell hero — avoid duplicate max-width / horizontal padding. */
export const DASHBOARD_PAGE_BODY =
  "luxury-page box-border w-full max-w-full min-w-0 space-y-4 pt-2 sm:space-y-4 sm:pt-3";

/** Property Finder uses its own in-page hero (no shell split hero). */
export const PROPERTY_FINDER_PAGE =
  "property-finder-page box-border w-full max-w-full space-y-6 overflow-x-hidden pt-4 sm:pt-5";
