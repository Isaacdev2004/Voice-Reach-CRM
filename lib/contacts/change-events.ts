export const CONTACTS_CHANGED = "myari:contacts-changed";
export function notifyContactsChanged() {
  window.dispatchEvent(new Event(CONTACTS_CHANGED));
  // A signal only, never contact data. Other tabs re-read their own authenticated endpoint.
  try { localStorage.setItem(CONTACTS_CHANGED, `${Date.now()}-${Math.random()}`); } catch { /* Storage can be unavailable. */ }
}
