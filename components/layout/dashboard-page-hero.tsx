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
    eyebrow = firstName ? `${greeting}, ${firstName}` : greeting;
    title = config.title;
  }

  const showInlineQuote = config.quote && !config.editorialQuote;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[28px] border border-outline-variant/10 bg-ivory shadow-card",
        className,
      )}
    >
      <div className="grid min-h-0 lg:min-h-[280px] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="relative z-10 flex flex-col justify-center gap-3 bg-cream px-6 py-8 sm:gap-4 sm:px-10 sm:py-10 lg:py-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-gold-deep sm:text-[11px]">
            {eyebrow}
          </p>
          <h1 className="max-w-lg font-serif text-[26px] font-semibold leading-[1.12] text-ink sm:text-[34px] lg:text-[38px]">
            {title}
          </h1>
          {config.subtitle ? (
            <p className="max-w-md text-[15px] leading-relaxed text-slate-text sm:text-[16px]">
              {config.subtitle}
            </p>
          ) : null}
          {config.scriptAccent ? (
            <p className="max-w-md font-hand text-[20px] leading-snug text-rose-gold-deep sm:text-[22px]">
              {config.scriptAccent}
            </p>
          ) : null}
          {showInlineQuote ? (
            <blockquote className="max-w-md border-l-2 border-rose-gold/40 pl-4 text-[14px] italic leading-relaxed text-slate-text">
              &ldquo;{config.quote}&rdquo;
              {config.attribution ? (
                <footer className="mt-2 text-[10px] not-italic font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
                  — {config.attribution}
                </footer>
              ) : null}
            </blockquote>
          ) : null}
          {config.brandQuote ? (
            <div className="mt-1 max-w-md border-t border-outline-variant/15 pt-4">
              <p className="font-serif text-[14px] italic leading-snug text-ink/85">
                &ldquo;{config.brandQuote}&rdquo;
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-gold-deep">
                MyARI
              </p>
            </div>
          ) : null}

          {config.actions?.length ? (
            <div className="mt-1 flex flex-wrap gap-3">
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
            <ul className="mt-2 grid gap-3 sm:grid-cols-3">
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

        <div className="relative min-h-[200px] sm:min-h-[220px] lg:min-h-0">
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
            <div className="absolute inset-0 bg-gradient-to-t from-cream/40 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-cream/45" />
          </div>

          {config.editorialQuote && config.quote ? (
            <div className="absolute inset-0 z-10 flex items-end justify-center p-6 pb-8 lg:items-center lg:justify-end lg:p-10 lg:pr-12">
              <blockquote className="max-w-[min(100%,20rem)] rounded-2xl bg-ivory/90 px-5 py-4 text-center font-serif text-[18px] leading-snug text-ink shadow-sm backdrop-blur-sm sm:text-[20px] lg:bg-transparent lg:text-right lg:text-[24px] lg:shadow-none lg:backdrop-blur-none">
                &ldquo;{config.quote}&rdquo;
                {config.attribution ? (
                  <footer className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-gold-deep">
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
