"use client";

import { useEffect, useState } from "react";

export type CampaignOption = { id: string; name: string; status: string };

export function useCampaignOptions() {
  const [options, setOptions] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setOptions([]);
          setError(data.error ?? "Could not load campaigns");
          return;
        }
        setOptions(
          (data.campaigns ?? []).map((c: { id: string; name: string; status: string }) => ({
            id: c.id,
            name: c.name,
            status: c.status,
          })),
        );
      } catch {
        setOptions([]);
        setError("Could not load campaigns");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { options, loading, error };
}
