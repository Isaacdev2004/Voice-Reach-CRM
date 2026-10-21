const HEADER_OFFSET_PX = 88;

/** Smooth scroll with fixed-header offset; flashes the target so jumps are obvious on wide layouts. */
export function scrollToMortgageSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;

  const top =
    el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });

  el.classList.remove("mortgage-section-highlight");
  // Reflow so repeat clicks re-trigger the flash
  void el.offsetWidth;
  el.classList.add("mortgage-section-highlight");

  window.setTimeout(() => {
    el.classList.remove("mortgage-section-highlight");
  }, 2400);

  if (typeof window.history?.replaceState === "function") {
    window.history.replaceState(null, "", `#${id}`);
  }

  if (id === "mortgage-loan-details") {
    window.setTimeout(() => {
      document
        .getElementById("mortgage-down-payment-input")
        ?.focus({ preventScroll: true });
    }, 450);
  }

  return true;
}
