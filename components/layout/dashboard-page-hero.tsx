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

function HeroImagePanel({
  config,
  isPhoto,
  className,
}: {
  config: DashboardPageHeroConfig;
  isPhoto: boolean;
  className?: string;
}) {
  const scriptOnImage = config.scriptAccentOnImage && config.scriptAccent;
  const brandOnImage = config.brandQuoteOnImage && config.brandQuote;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-champagne",
        isPhoto
          ? "aspect-[16/10] sm:aspect-video lg:aspect-auto lg:h-full lg:min-h-[280px]"
          : "aspect-[2172/724] lg:aspect-auto lg:h-full lg:min-h-[280px]",
        className,
      )}
    >
      <Image
        src={config.image}
        alt={config.imageAlt}
        fill
        priority
        unoptimized={!isPhoto}
        quality={isPhoto ? 92 : undefined}
        sizes="(max-width: 1024px) 100vw, 700px"
        className="object-cover"
        style={{
          objectPosition: config.imageObjectPosition ?? "center center",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[38%] max-w-[320px] bg-gradient-to-r from-cream via-cream/55 to-transparent lg:from-cream lg:via-cream/40"
        aria-hidden
      />

      {brandOnImage ? (
        <div className="pointer-events-none absolute right-4 top-4 z-[2] max-w-[240px] text-right sm:right-6 sm:top-6">
          <p className="font-serif text-[13px] italic leading-snug text-ink/90 sm:text-[14px]">
            &ldquo;{config.brandQuote}&rdquo;
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
            MyARI
          </p>
        </div>
      ) : null}

      {scriptOnImage ? (
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center px-6 sm:justify-start sm:px-8 lg:px-10">
          <p className="max-w-md text-center font-hand text-[22px] leading-snug text-rose-gold-deep drop-shadow-sm sm:max-w-[55%] sm:text-left sm:text-[24px] lg:text-[28px]">
            {config.scriptAccent}
          </p>
        </div>
      ) : null}

      {config.editorialQuote && config.quote && !config.editorialQuoteOnCopy ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[2] sm:inset-x-6 sm:bottom-6">
          <blockquote className="break-normal rounded-xl bg-ivory/95 px-4 py-3 text-center font-serif text-[15px] leading-snug text-ink shadow-sm backdrop-blur-sm sm:text-[16px]">
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
    eyebrow = greeting.toUpperCase();
    title = firstName ? `${firstName}, ${config.title}` : config.title;
  } else if (config.titleMode === "calendarGreeting") {
    eyebrow = firstName ? `${greeting}, ${firstName}` : greeting;
    title = config.title;
  }

  const showInlineQuote =
    config.quote && !config.editorialQuote && !config.editorialQuoteOnCopy;
  const showScriptInCopy = config.scriptAccent && !config.scriptAccentOnImage;
  const isPhoto = config.imageLayout === "photo";
  const isBanner = config.heroLayout === "banner";
  const faithCopy = config.editorialQuoteOnCopy && config.quote;

  if (isBanner) {
    return (
      <section
        className={cn(
          "block w-full overflow-hidden rounded-[28px] border border-outline-variant/10 bg-ivory shadow-card",
          className,
        )}
      >
        <HeroImagePanel config={config} isPhoto={isPhoto} className="lg:min-h-[220px]" />
      </section>
    );
  }

  return (
    <section
      className={cn(
        "block w-full overflow-hidden rounded-[28px] border border-outline-variant/10 bg-ivory shadow-card",
        className,
      )}
    >
      <div className="grid w-full grid-cols-1 lg:grid-cols-2 lg:items-stretch">
        <div className="relative z-[2] flex flex-col justify-center bg-cream px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-10">
          {!faithCopy ? (
            <>
              <p className="break-normal text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-gold-deep sm:text-[11px]">
                {eyebrow}
              </p>
              <h1 className="mt-2 break-normal font-serif text-[26px] font-semibold leading-[1.15] text-ink sm:text-[34px] lg:text-[36px]">
                {title}
              </h1>
            </>
          ) : (
            <>
              <blockquote className="break-normal font-serif text-[22px] font-medium leading-[1.35] text-ink sm:text-[26px] lg:text-[28px]">
                &ldquo;{config.quote}&rdquo;
              </blockquote>
              {config.attribution ? (
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-gold-deep">
                  {config.attribution}
                </p>
              ) : null}
              <span
                className="mt-5 inline-flex text-rose-gold-deep"
                aria-hidden
              >
                <Icon name="auto_awesome" className="text-[20px]" />
              </span>
            </>
          )}

          {config.subtitle ? (
            <p className="mt-3 break-normal text-[15px] leading-relaxed text-slate-text sm:text-[16px]">
              {config.subtitle}
            </p>
          ) : null}
          {showScriptInCopy ? (
            <p className="mt-3 break-normal font-hand text-[20px] leading-snug text-rose-gold-deep sm:text-[22px]">
              {config.scriptAccent}
            </p>
          ) : null}
          {showInlineQuote ? (
            <blockquote className="mt-3 break-normal border-l-2 border-rose-gold/40 pl-4 text-[14px] italic leading-relaxed text-slate-text">
              &ldquo;{config.quote}&rdquo;
              {config.attribution ? (
                <footer className="mt-2 text-[10px] not-italic font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
                  — {config.attribution}
                </footer>
              ) : null}
            </blockquote>
          ) : null}
          {config.brandQuote && !config.brandQuoteOnImage ? (
            <div className="mt-4 break-normal border-t border-outline-variant/15 pt-4">
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
                  <div className="min-w-0 break-normal">
                    <p className="text-[13px] font-semibold text-ink">{f.title}</p>
                    <p className="text-[11px] text-taupe">{f.subtitle}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <HeroImagePanel config={config} isPhoto={isPhoto} />
      </div>
    </section>
  );
}
