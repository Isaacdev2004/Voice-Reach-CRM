"use client";

import { useEffect, useState } from "react";
import { DEFAULT_CAMPAIGN } from "@/lib/crm/mock-data";

export type CampaignOption = { id: string; name: string; status: string };

export function useCampaignOptions() {
  const [options, setOptions] = useState<CampaignOption[]>([
    { id: DEFAULT_CAMPAIGN.id, name: DEFAULT_CAMPAIGN.name, status: "draft" },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.campaigns?.length) {
          setOptions(
            data.campaigns.map((c: { id: string; name: string; status: string }) => ({
              id: c.id,
              name: c.name,
              status: c.status,
            })),
          );
        }
      } catch {
        /* keep default */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { options, loading };
}
