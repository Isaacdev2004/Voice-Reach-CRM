"use client";

import { Icon } from "@/components/ui/icon";
import {
  isPropertyFinderDashboardPath,
  type DashboardPageHeroConfig,
} from "@/lib/dashboard/page-heroes";
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
  const compact = config.heroDensity === "compact" || config.heroDensity === "dense";
  const dense = config.heroDensity === "dense";
  const blend = config.imageBlend ?? "default";
  const vividBlend = blend === "vivid";
  const subtleBlend = blend === "subtle";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-champagne",
        isPhoto
          ? cn(
              dense ? "aspect-[2/1] sm:aspect-[16/9]" : "aspect-[16/10] sm:aspect-[16/9]",
              compact
                ? cn(
                    "lg:aspect-auto lg:h-full",
                    dense ? "lg:min-h-[128px]" : "lg:min-h-[190px]",
                  )
                : "lg:aspect-auto lg:h-full lg:min-h-[280px]",
            )
          : cn(
              dense ? "aspect-[3/1] sm:aspect-[2172/724]" : "aspect-[2172/724]",
              compact
                ? cn(
                    "lg:aspect-auto lg:h-full",
                    dense ? "lg:min-h-[128px]" : "lg:min-h-[190px]",
                  )
                : "lg:aspect-auto lg:h-full lg:min-h-[280px]",
            ),
        className,
      )}
    >
      <Image
        src={config.image}
        alt={config.imageAlt}
        fill
        priority
        unoptimized
        sizes="(max-width: 1024px) 100vw, 700px"
        className={cn(
          "object-cover",
          vividBlend && "saturate-[1.1] contrast-[1.06] brightness-[1.02]",
          subtleBlend && !vividBlend && "saturate-[1.05] contrast-[1.03]",
        )}
        style={{
          objectPosition: config.imageObjectPosition ?? "center center",
        }}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[1] bg-gradient-to-r to-transparent",
          vividBlend
            ? "w-[12%] max-w-[120px] from-cream/90 via-cream/15 to-transparent"
            : subtleBlend
              ? "w-[18%] max-w-[168px] from-cream via-cream/15 lg:via-cream/10"
              : "w-[38%] max-w-[320px] from-cream via-cream/55 lg:from-cream lg:via-cream/40",
        )}
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

export function DashboardPageHero({ config, className, pathname }: DashboardPageHeroProps) {
  const { user } = useUser();
  const hour = new Date().getHours();
  const greeting = timeGreeting(hour);
  const firstName =
    user?.firstName?.trim() || user?.fullName?.trim()?.split(/\s+/)[0] || "";

  if (isPropertyFinderDashboardPath(pathname)) {
    return null;
  }

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
  const compactHero =
    config.heroDensity === "compact" || config.heroDensity === "dense";
  const denseHero = config.heroDensity === "dense";

  if (isBanner) {
    return (
      <section
        className={cn(
          "block w-full overflow-hidden rounded-[20px] border border-outline-variant/12 bg-ivory shadow-[0_8px_32px_-12px_rgba(26,22,18,0.08)]",
          className,
        )}
      >
        <HeroImagePanel
          config={config}
          isPhoto={isPhoto}
          className={compactHero ? "lg:min-h-[160px]" : "lg:min-h-[200px]"}
        />
      </section>
    );
  }

  return (
    <section
      data-dashboard-split-hero
      className={cn(
        "block w-full overflow-hidden rounded-[20px] border border-outline-variant/12 bg-ivory shadow-[0_8px_32px_-12px_rgba(26,22,18,0.08)]",
        className,
      )}
    >
      <div
        className={cn(
          "grid w-full grid-cols-1 lg:grid-cols-2 lg:items-stretch",
          config.heroGridClass,
        )}
      >
        <div
          className={cn(
            "dashboard-hero-copy relative z-[2] flex w-full min-w-0 flex-col justify-center bg-gradient-to-br from-cream via-cream to-champagne/30 px-5 sm:px-8 lg:min-w-[min(100%,320px)] lg:px-10",
            denseHero
              ? "py-3 sm:py-3.5 lg:py-4"
              : compactHero
                ? "py-4 sm:py-5 lg:py-6"
                : "py-7 sm:py-8 lg:py-9 lg:px-12",
          )}
        >
          {!faithCopy ? (
            <>
              <p className="whitespace-normal text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-gold-deep sm:text-[11px]">
                {eyebrow}
              </p>
              <h1
                className={cn(
                  "mt-1.5 whitespace-normal font-serif font-semibold leading-[1.15] text-ink sm:mt-2",
                  denseHero
                    ? "text-[21px] sm:text-[26px] lg:text-[28px]"
                    : compactHero
                      ? "text-[23px] sm:text-[28px] lg:text-[30px]"
                      : "text-[25px] sm:text-[32px] lg:text-[34px]",
                )}
              >
                {title}
              </h1>
            </>
          ) : (
            <>
              <blockquote
                className={cn(
                  "whitespace-normal font-serif font-medium leading-[1.35] text-ink",
                  compactHero
                    ? "text-[20px] sm:text-[22px] lg:text-[24px]"
                    : "text-[22px] sm:text-[26px] lg:text-[28px]",
                )}
              >
                &ldquo;{config.quote}&rdquo;
              </blockquote>
              {config.attribution ? (
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-gold-deep",
                    compactHero ? "mt-3" : "mt-4",
                  )}
                >
                  {config.attribution}
                </p>
              ) : null}
              <span
                className={cn("inline-flex text-rose-gold-deep", compactHero ? "mt-3.5" : "mt-5")}
                aria-hidden
              >
                <Icon name="auto_awesome" className="text-[20px]" />
              </span>
            </>
          )}

          {config.subtitle ? (
            <p
              className={cn(
                "whitespace-normal leading-relaxed text-slate-text",
                denseHero
                  ? "mt-1.5 text-[13px] sm:text-[14px]"
                  : compactHero
                    ? "mt-2 text-[14px] sm:text-[15px]"
                    : "mt-3 text-[15px] sm:text-[16px]",
              )}
            >
              {config.subtitle}
            </p>
          ) : null}
          {showScriptInCopy ? (
            <p
              className={cn(
                "mt-2.5 whitespace-normal font-hand leading-snug text-rose-gold-deep sm:mt-3",
                compactHero ? "text-[18px] sm:text-[20px]" : "text-[20px] sm:text-[22px]",
              )}
            >
              {config.scriptAccent}
            </p>
          ) : null}
          {showInlineQuote ? (
            <blockquote className="mt-3 whitespace-normal border-l-2 border-rose-gold/40 pl-4 text-[14px] italic leading-relaxed text-slate-text">
              &ldquo;{config.quote}&rdquo;
              {config.attribution ? (
                <footer className="mt-2 text-[10px] not-italic font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
                  — {config.attribution}
                </footer>
              ) : null}
            </blockquote>
          ) : null}
          {config.brandQuote && !config.brandQuoteOnImage && !config.brandQuoteFooter ? (
            <div className="mt-4 whitespace-normal border-t border-outline-variant/15 pt-4">
              <p className="font-serif text-[14px] italic leading-snug text-ink/85">
                &ldquo;{config.brandQuote}&rdquo;
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-gold-deep">
                MyARI
              </p>
            </div>
          ) : null}

          {config.actions?.length ? (
            <div
              className={cn(
                "flex flex-wrap gap-2",
                denseHero ? "mt-2.5" : compactHero ? "mt-3.5" : "mt-5 gap-3",
              )}
            >
              {config.actions.map((action) =>
                action.primary ? (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full bg-rose-gold-deep font-medium text-ivory shadow-sm transition-all hover:opacity-95 active:scale-[0.98] motion-reduce:active:scale-100",
                      denseHero ? "px-4 py-2 text-[13px]" : "px-5 py-2.5 text-[14px]",
                    )}
                  >
                    <Icon name={action.icon} className="text-[18px]" />
                    {action.label}
                    <Icon name="arrow_forward" className="text-[16px] opacity-80" />
                  </Link>
                ) : (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-transparent font-medium text-taupe transition-colors hover:border-outline-variant/35 hover:bg-champagne/50 hover:text-ink",
                      denseHero ? "px-4 py-2 text-[13px]" : "px-5 py-2.5 text-[14px]",
                    )}
                  >
                    <Icon name={action.icon} className="text-[18px] text-rose-gold-deep" />
                    {action.label}
                  </Link>
                ),
              )}
            </div>
          ) : null}

          {config.features?.length ? (
            <ul
              className={cn(
                "grid gap-2.5 sm:grid-cols-3",
                compactHero ? "mt-3" : "mt-4 gap-3",
              )}
            >
              {config.features.map((f) => (
                <li key={f.title} className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-gold/15 text-rose-gold-deep">
                    <Icon name={f.icon} className="text-[18px]" />
                  </span>
                  <div className="min-w-0 whitespace-normal">
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

      {config.brandQuote && config.brandQuoteFooter ? (
        <div
          className={cn(
            "flex flex-col items-start justify-between gap-1.5 border-t border-outline-variant/10 bg-cream/90 sm:flex-row sm:items-center",
            compactHero ? "px-6 py-2.5 sm:px-10 lg:px-12" : "px-6 py-4 sm:px-10 lg:px-12",
          )}
        >
          <p
            className={cn(
              "font-serif italic leading-snug text-ink",
              compactHero ? "text-[15px] sm:text-[16px]" : "text-[17px] sm:text-[18px]",
            )}
          >
            &ldquo;{config.brandQuote}&rdquo;
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-gold-deep sm:text-[11px]">
            MyARI
          </p>
        </div>
      ) : null}
    </section>
  );
}
