/** Shared dashboard main-column layout (shell wraps hero + page body). */
export const DASHBOARD_MAIN_COLUMN =
  "mx-auto box-border w-full max-w-[1400px] px-4 pb-8 max-md:pb-24 sm:px-6 lg:px-8";

export const DASHBOARD_HERO_SLOT = "block w-full min-w-0 max-w-full pt-1 sm:pt-1.5";

/** Page body below shell hero — avoid duplicate max-width / horizontal padding. */
export const DASHBOARD_PAGE_BODY =
  "luxury-page box-border w-full max-w-full min-w-0 space-y-4 pt-1 sm:space-y-4 sm:pt-2";

/** Home dashboard section rhythm (8px grid: 16px gaps, shared headers). */
export const DASHBOARD_SECTION_CARD = "!p-4 sm:!p-5";

export const DASHBOARD_SECTION_HEADER =
  "mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/10 pb-4";

export const DASHBOARD_SECTION_TITLE =
  "font-serif text-[22px] font-semibold leading-tight tracking-tight text-ink sm:text-[24px]";

export const DASHBOARD_SECTION_SUBTITLE = "mt-1 text-[13px] leading-relaxed text-slate-text";

/** Property Finder uses its own in-page hero (no shell split hero). */
export const PROPERTY_FINDER_PAGE =
  "property-finder-page box-border w-full max-w-full space-y-6 overflow-x-hidden pt-4 sm:pt-5";
