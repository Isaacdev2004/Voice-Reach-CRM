"use client";

import { DashboardPageHero } from "@/components/layout/dashboard-page-hero";
import { cn } from "@/lib/cn";
import {
  CALENDAR_HERO_STORAGE_KEY,
  CALENDAR_HERO_VARIANTS,
  type CalendarHeroVariant,
} from "@/lib/dashboard/page-heroes";
import { useEffect, useState } from "react";

function readVariant(): CalendarHeroVariant {
  if (typeof window === "undefined") return "schedule";
  const raw = localStorage.getItem(CALENDAR_HERO_STORAGE_KEY);
  return raw === "faith" ? "faith" : "schedule";
}

export function CalendarPageHero() {
  const [variant, setVariant] = useState<CalendarHeroVariant>("schedule");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setVariant(readVariant());
    setReady(true);
  }, []);

  const setAndPersist = (next: CalendarHeroVariant) => {
    setVariant(next);
    localStorage.setItem(CALENDAR_HERO_STORAGE_KEY, next);
  };

  const config = CALENDAR_HERO_VARIANTS[variant];

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap items-center justify-end gap-2"
        role="group"
        aria-label="Calendar hero style"
      >
        <span className="mr-auto text-[12px] text-taupe sm:mr-0">Hero view</span>
        {(
          [
            { id: "schedule" as const, label: "Schedule" },
            { id: "faith" as const, label: "Inspiration" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={!ready}
            onClick={() => setAndPersist(opt.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
              variant === opt.id
                ? "bg-rose-gold-deep text-ivory shadow-sm"
                : "border border-outline-variant/25 bg-ivory text-taupe hover:bg-champagne",
            )}
            aria-pressed={variant === opt.id}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {ready ? (
        <DashboardPageHero config={config} pathname="/dashboard/calendar" />
      ) : (
        <div className="min-h-[240px] animate-pulse rounded-[28px] bg-champagne/60 lg:min-h-[300px]" />
      )}
    </div>
  );
}
