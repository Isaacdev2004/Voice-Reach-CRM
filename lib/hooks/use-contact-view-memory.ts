"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CONTACT_VIEW_KEYS, restoreContactView, saveContactView } from "@/lib/contacts/view-memory";

/** Session-local, owner-scoped restoration when returning through the bare Contacts tab. */
export function useContactViewMemory(ownerId: string | undefined) {
  const params = useSearchParams();
  const query = params.toString();
  const initialized = useRef(false);
  useEffect(() => {
    if (!ownerId) return;
    try {
      if (!initialized.current) {
        initialized.current = true;
        const restored = restoreContactView(window.sessionStorage, ownerId, query, window.history.state?.myariContactsViewOwner);
        saveContactView(window.sessionStorage, ownerId, restored);
        // Preserve unrelated routing parameters, but never save them in the remembered view.
        const next = new URLSearchParams(query);
        for (const key of ["market", ...CONTACT_VIEW_KEYS]) next.delete(key);
        for (const [key, value] of new URLSearchParams(restored)) next.set(key, value);
        if (next.toString() !== query) {
          window.history.replaceState({ ...window.history.state, myariContactsViewOwner: ownerId }, "", `/dashboard/contacts${next.size ? `?${next}` : ""}`);
        } else {
          window.history.replaceState({ ...window.history.state, myariContactsViewOwner: ownerId }, "", window.location.href);
        }
      } else {
        saveContactView(window.sessionStorage, ownerId, query);
        window.history.replaceState({ ...window.history.state, myariContactsViewOwner: ownerId }, "", window.location.href);
      }
    } catch {
      // Blocked/full browser storage must not break normal URL-backed filtering.
    }
  }, [ownerId, query]);
}
