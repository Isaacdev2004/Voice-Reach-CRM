"use client";

import { useSearchParams } from "next/navigation";

/** Global header search query synced via `?q=` on the current route */
export function useDashboardSearch(): string {
  const searchParams = useSearchParams();
  return searchParams.get("q")?.trim() ?? "";
}
