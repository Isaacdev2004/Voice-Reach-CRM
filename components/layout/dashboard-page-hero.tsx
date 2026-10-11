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

function HeroArt({ config }: { config: DashboardPageHeroConfig }) {
  const isPhoto = config.imageLayout === "photo";

  if (isPhoto) {
    return (
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[20px] bg-champagne ring-1 ring-outline-variant/10 sm:aspect-video">
        <Image
          src={config.image}
          alt={config.imageAlt}
          fill
          priority
          quality={92}
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-cover object-center"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-[20px] bg-champagne ring-1 ring-outline-variant/10">
      <Image
        src={config.image}
        alt={config.imageAlt}
        width={config.imageWidth}
        height={config.imageHeight}
        priority
        unoptimized
        className="block h-auto w-full max-w-full"
        sizes="(max-width: 1024px) 100vw, 560px"
      />
    </div>
  );
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
        "block w-full max-w-full overflow-hidden rounded-[28px] border border-outline-variant/10 bg-ivory shadow-card",
        className,
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center">
        <div className="flex w-full flex-col justify-center bg-cream px-6 py-8 sm:px-10 sm:py-10 lg:min-w-0 lg:flex-1 lg:px-12 lg:py-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep sm:text-[11px]">
            {eyebrow}
          </p>
          <h1 className="mt-2 max-w-xl font-serif text-[26px] font-semibold leading-[1.15] text-ink sm:text-[34px] lg:text-[36px]">
            {title}
          </h1>
          {config.subtitle ? (
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-text sm:text-[16px]">
              {config.subtitle}
            </p>
          ) : null}
          {config.scriptAccent ? (
            <p className="mt-3 max-w-xl font-hand text-[20px] leading-snug text-rose-gold-deep sm:text-[22px]">
              {config.scriptAccent}
            </p>
          ) : null}
          {showInlineQuote ? (
            <blockquote className="mt-3 max-w-xl border-l-2 border-rose-gold/40 pl-4 text-[14px] italic leading-relaxed text-slate-text">
              &ldquo;{config.quote}&rdquo;
              {config.attribution ? (
                <footer className="mt-2 text-[10px] not-italic font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
                  — {config.attribution}
                </footer>
              ) : null}
            </blockquote>
          ) : null}
          {config.brandQuote ? (
            <div className="mt-4 max-w-xl border-t border-outline-variant/15 pt-4">
              <p className="font-serif text-[14px] italic leading-snug text-ink/85">
                &ldquo;{config.brandQuote}&rdquo;
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-gold-deep">
                MyARI
              </p>
            </div>
          ) : null}

          {config.actions?.length ? (
            <div className="mt-5 flex flex-wrap gap-3">
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

        <div className="w-full shrink-0 bg-champagne/20 px-4 pb-6 pt-2 sm:px-6 sm:pb-8 lg:w-[min(100%,520px)] lg:px-6 lg:py-8 lg:pl-4">
          <div className="relative">
            <HeroArt config={config} />
            {config.editorialQuote && config.quote ? (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4">
                <blockquote className="rounded-xl bg-ivory/95 px-4 py-3 text-center font-serif text-[15px] leading-snug text-ink shadow-sm backdrop-blur-sm sm:text-[16px]">
                  &ldquo;{config.quote}&rdquo;
                  {config.attribution ? (
                    <footer className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-gold-deep">
                      — {config.attribution}
                    </footer>
                  ) : null}
                </blockquote>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
