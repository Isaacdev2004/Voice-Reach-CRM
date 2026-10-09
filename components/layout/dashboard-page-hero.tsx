"use client";

import { AriLogo } from "@/components/brand/ari-logo";
import type { DashboardPageHeroConfig } from "@/lib/dashboard/page-heroes";
import { cn } from "@/lib/cn";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

type DashboardPageHeroProps = {
  config: DashboardPageHeroConfig;
  pathname: string;
  className?: string;
};

export function DashboardPageHero({ config, pathname, className }: DashboardPageHeroProps) {
  const { user } = useUser();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName =
    user?.firstName?.trim() || user?.fullName?.trim()?.split(/\s+/)[0] || "";

  let title = config.title;
  if (pathname === "/dashboard") {
    title = firstName ? `${greeting}, ${firstName}` : greeting;
  }

  return (
    <section
      className={cn(
        "relative min-h-[200px] overflow-hidden rounded-[24px] border border-outline-variant/10 shadow-card sm:min-h-[240px] md:min-h-[280px] md:rounded-[28px]",
        className,
      )}
    >
      <Image
        src={config.image}
        alt={config.imageAlt}
        fill
        priority
        className="object-cover object-center"
        sizes="(max-width: 1280px) 100vw, 1200px"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-cream/95 via-cream/80 to-cream/25 md:from-cream/92 md:via-cream/65 md:to-transparent" />
      <div className="relative z-10 flex min-h-[inherit] flex-col justify-between gap-4 p-5 sm:p-8 md:p-10 lg:flex-row lg:items-end">
        <div className="max-w-xl">
          <AriLogo height={44} className="mb-3 sm:mb-4" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-gold-deep sm:text-[11px]">
            {config.eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[34px] md:text-[40px]">
            {title}
          </h1>
          {config.subtitle ? (
            <p className="mt-2 text-[14px] leading-relaxed text-slate-text sm:mt-3 sm:text-[16px]">
              {config.subtitle}
            </p>
          ) : null}
          {config.quote ? (
            <p className="mt-3 text-[14px] italic leading-relaxed text-slate-text sm:text-[15px]">
              &ldquo;{config.quote}&rdquo;
            </p>
          ) : null}
          {config.attribution ? (
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
              — {config.attribution}
            </p>
          ) : null}
        </div>
        {config.scriptAccent ? (
          <p className="max-w-[220px] self-end font-hand text-[22px] leading-snug text-rose-gold-deep/90 sm:text-[26px] lg:text-right">
            {config.scriptAccent}
          </p>
        ) : null}
      </div>
    </section>
  );
}
