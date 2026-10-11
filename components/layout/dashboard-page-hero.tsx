"use client";

import { Icon } from "@/components/ui/icon";
import type { DashboardPageHeroConfig } from "@/lib/dashboard/page-heroes";
import { cn } from "@/lib/cn";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

type DashboardPageHeroProps = {
  config: DashboardPageHeroConfig;
  pathname: string;
  className?: string;
};

function timeGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardPageHero({ config, className }: DashboardPageHeroProps) {
  const { user } = useUser();
  const hour = new Date().getHours();
  const greeting = timeGreeting(hour);
  const firstName =
    user?.firstName?.trim() || user?.fullName?.trim()?.split(/\s+/)[0] || "";

  let eyebrow = config.eyebrow;
  let title = config.title;

  if (config.titleMode === "dashboardHome") {
    eyebrow = firstName
      ? `${greeting.toUpperCase()}, ${firstName.toUpperCase()}`
      : greeting.toUpperCase();
    title = config.title;
  } else if (config.titleMode === "calendarGreeting") {
    eyebrow = firstName
      ? `${greeting}, ${firstName}`
      : greeting;
    title = config.title;
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[28px] border border-outline-variant/10 bg-ivory shadow-card",
        className,
      )}
    >
      <div className="grid min-h-[240px] lg:min-h-[300px] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* Copy panel — solid cream, high contrast */}
        <div className="relative z-10 flex flex-col justify-center gap-4 bg-cream px-6 py-8 sm:px-10 sm:py-10 lg:py-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-gold-deep sm:text-[11px]">
            {eyebrow}
          </p>
          <h1 className="max-w-lg font-serif text-[28px] font-semibold leading-[1.12] text-ink sm:text-[36px] lg:text-[40px]">
            {title}
          </h1>
          {config.subtitle ? (
            <p className="max-w-md text-[15px] leading-relaxed text-slate-text sm:text-[16px]">
              {config.subtitle}
            </p>
          ) : null}
          {config.quote && !config.editorialQuote ? (
            <blockquote className="max-w-md border-l-2 border-rose-gold/40 pl-4 text-[14px] italic leading-relaxed text-slate-text">
              &ldquo;{config.quote}&rdquo;
              {config.attribution ? (
                <footer className="mt-2 text-[10px] not-italic font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
                  — {config.attribution}
                </footer>
              ) : null}
            </blockquote>
          ) : null}

          {config.actions?.length ? (
            <div className="mt-2 flex flex-wrap gap-3">
              {config.actions.map((action) =>
                action.primary ? (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="inline-flex items-center gap-2 rounded-full bg-rose-gold-deep px-5 py-2.5 text-[14px] font-medium text-ivory shadow-sm transition-opacity hover:opacity-95"
                  >
                    <Icon name={action.icon} className="text-[18px]" />
                    {action.label}
                    <Icon name="arrow_forward" className="text-[16px] opacity-80" />
                  </Link>
                ) : (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-ivory px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-champagne"
                  >
                    <Icon name={action.icon} className="text-[18px] text-rose-gold-deep" />
                    {action.label}
                  </Link>
                ),
              )}
            </div>
          ) : null}

          {config.features?.length ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {config.features.map((f) => (
                <li key={f.title} className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-gold/15 text-rose-gold-deep">
                    <Icon name={f.icon} className="text-[18px]" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{f.title}</p>
                    <p className="text-[11px] text-taupe">{f.subtitle}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Photo panel — arch blend into cream */}
        <div className="relative min-h-[180px] lg:min-h-0">
          <div
            className="absolute inset-0 overflow-hidden lg:[clip-path:ellipse(92%_100%_at_100%_50%)]"
            aria-hidden
          >
            <Image
              src={config.image}
              alt={config.imageAlt}
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 560px"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-cream/30 lg:to-cream/50" />
          </div>

          {config.scriptAccent ? (
            <p className="absolute bottom-6 left-6 z-10 max-w-[200px] font-hand text-[22px] leading-snug text-rose-gold-deep drop-shadow-sm sm:text-[26px] lg:left-auto lg:right-8 lg:text-right">
              {config.scriptAccent}
            </p>
          ) : null}

          {config.brandQuote ? (
            <div className="absolute right-6 top-6 z-10 hidden max-w-[200px] text-right lg:block">
              <p className="font-serif text-[13px] italic leading-snug text-ink/90">
                &ldquo;{config.brandQuote}&rdquo;
              </p>
              <div className="ml-auto mt-2 h-px w-12 bg-rose-gold/50" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-gold-deep">
                MyARI
              </p>
            </div>
          ) : null}

          {config.editorialQuote && config.quote ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-8 lg:justify-end lg:pr-12">
              <blockquote className="max-w-sm text-center font-serif text-[22px] leading-snug text-ink/90 lg:text-right lg:text-[26px]">
                &ldquo;{config.quote}&rdquo;
                {config.attribution ? (
                  <footer className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-gold-deep">
                    — {config.attribution}
                  </footer>
                ) : null}
              </blockquote>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
