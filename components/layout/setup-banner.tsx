"use client";

import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { useEffect, useState } from "react";

type HealthPayload = {
  status: "ok" | "degraded";
  supabase: boolean;
  clerk: boolean;
  message: string;
};

export function SetupBanner() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void (async () => {
      const envelope = await safeFetch<HealthPayload>("/api/health");
      if (envelope.success) setHealth(envelope.data);
    })();
  }, []);

  if (!health || health.status === "ok" || dismissed) return null;

  const missing: string[] = [];
  if (!health.supabase) missing.push("Supabase (database)");
  if (!health.clerk) missing.push("Clerk (authentication)");

  return (
    <div
      className="border-b border-rose-gold/30 bg-rose-gold/10 px-6 py-3"
      role="alert"
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Icon name="warning" className="mt-0.5 shrink-0 text-[20px] text-rose-gold-deep" />
          <div>
            <p className="text-[14px] font-medium text-ink">
              Production setup in progress
            </p>
            <p className="text-[13px] text-taupe">
              {missing.length > 0
                ? `Missing on Vercel: ${missing.join(", ")}. Data panels will show errors until these are added and the site is redeployed.`
                : health.message}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full px-3 py-1 text-[12px] font-medium text-taupe hover:bg-ivory/60"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
