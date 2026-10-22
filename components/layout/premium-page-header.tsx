import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { DashboardPageHeroConfig } from "@/lib/dashboard/page-heroes";
import type { ReactNode } from "react";

/** One headline, one description, and clear space for the work below. */
export function PremiumPageHeader({ config, compact = false, children, className }: {
  config: DashboardPageHeroConfig;
  compact?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("premium-page-header", compact ? "premium-page-header--compact" : "premium-page-header--editorial", className)}>
      <div className="premium-page-header__grid">
        <div className="premium-page-header__copy">
          <p className="premium-eyebrow">{config.eyebrow}</p>
          <h1>{config.title}</h1>
          {config.subtitle ? <p className="premium-page-header__description">{config.subtitle}</p> : null}
          {config.actions?.length ? (
            <div className="premium-page-header__actions flex flex-wrap gap-2">
              {config.actions.map((action) => (
                <Link key={action.href} href={action.href} className={action.primary ? "premium-button premium-button--primary" : "premium-button premium-button--secondary"}>
                  <Icon name={action.icon} className="text-[18px]" />
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
          {config.editorialQuoteOnCopy && config.quote ? (
            <blockquote className="mt-4 border-l-2 border-rose-gold/35 pl-4 text-[14px] italic leading-relaxed text-slate-text">
              {config.quote}
              {config.attribution ? <footer className="mt-1 text-[12px] not-italic">{config.attribution}</footer> : null}
            </blockquote>
          ) : null}
        </div>
        <div className="premium-page-header__image">
          <Image src={config.image} alt={config.imageAlt} fill priority unoptimized
            sizes={compact ? "(max-width: 767px) 100vw, 200px" : "(max-width: 767px) 100vw, (max-width: 1200px) 40vw, 560px"}
            className="object-cover" style={{ objectPosition: config.imageObjectPosition ?? "center" }} />
        </div>
      </div>
      {children ? <div className="premium-page-header__utility">{children}</div> : null}
    </section>
  );
}
