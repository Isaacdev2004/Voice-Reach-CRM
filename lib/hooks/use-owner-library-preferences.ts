"use client";
import { useEffect, useState } from "react";

type Preferences = { pins: string[]; categories: string[] };
const empty = (): Preferences => ({ pins: [], categories: [] });
/** Browser-only organization preferences. Never stores conversations or credentials. */
export function useOwnerLibraryPreferences(owner: string, library: string) {
  const key = `myari:library:v1:${encodeURIComponent(owner)}:${library}`;
  const [stored, setStored] = useState<{ key: string; value: Preferences } | null>(null);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    let value = empty();
    try {
      const data = JSON.parse(localStorage.getItem(key) || "null");
      if (data && typeof data === "object") {
        value = {
          pins: Array.isArray(data.pins) ? data.pins.filter((s: unknown) => typeof s === "string" && /^[\da-f-]{36}$/i.test(s)).slice(0, 500) : [],
          categories: Array.isArray(data.categories) ? data.categories.filter((s: unknown) => typeof s === "string" && s.trim().length > 0 && s.length <= 80).slice(0, 100) : [],
        };
      }
    } catch { /* Optional browser storage. */ }
    setStored({ key, value });
    setStorageError("");
  }, [key]);
  const value = stored?.key === key ? stored.value : empty();
  function update(next: Preferences) {
    if (!owner || stored?.key !== key) return;
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(""); }
    catch { setStorageError("Browser storage is unavailable. Organization changes last only until this page is closed."); }
    setStored({ key, value: next });
  }
  return { ...value, update, ready: !!owner && stored?.key === key, storageError };
}
