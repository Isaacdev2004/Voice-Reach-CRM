import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import type { ReactNode } from "react";

type FocusHeroBannerProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  align?: "left" | "center";
};

export function FocusHeroBanner({
  eyebrow,
  title,
  description,
  actions,
  align = "center",
}: FocusHeroBannerProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] bg-gradient-to-br from-sage via-emerald-muted to-sage text-ivory shadow-nav",
        centered ? "px-6 py-12 text-center sm:px-12 sm:py-16" : "px-6 py-8 sm:px-10 sm:py-10",
      )}
    >
      <div
        className={cn(
          "relative z-10 flex flex-col gap-8",
          centered ? "items-center" : "gap-6 lg:flex-row lg:items-end lg:justify-between",
        )}
      >
        <div className={cn(centered ? "mx-auto max-w-2xl" : "max-w-xl")}>
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.28em] text-ivory/80",
              centered && "mx-auto",
            )}
          >
            {eyebrow}
          </p>
          <h2
            className={cn(
              "mt-3 font-serif font-semibold leading-[1.15] text-ivory",
              centered ? "text-[32px] sm:text-[40px] md:text-[44px]" : "text-[28px] sm:text-[36px]",
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              "mt-4 text-[15px] leading-relaxed text-ivory/90 sm:text-[16px]",
              centered ? "mx-auto max-w-xl" : "mt-3",
            )}
          >
            {description}
          </p>
        </div>
        {actions ? (
          <div className={cn("flex flex-wrap gap-3", centered && "justify-center")}>
            {actions}
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute -left-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-ivory/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ivory/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-[70%] -translate-x-1/2 rounded-full bg-ivory/5 blur-2xl" />
    </div>
  );
}

type HeroActionLinkProps = {
  href: string;
  icon: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  external?: boolean;
};

export function HeroActionLink({
  href,
  icon,
  children,
  variant = "primary",
  external,
}: HeroActionLinkProps) {
  const className =
    variant === "primary"
      ? "inline-flex items-center gap-2 rounded-full bg-ivory px-5 py-2.5 text-[14px] font-medium text-sage hover:bg-cream"
      : "inline-flex items-center gap-2 rounded-full border border-ivory/40 px-5 py-2.5 text-[14px] font-medium text-ivory hover:bg-ivory/10";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        <Icon name={icon} className="text-[18px]" />
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <Icon name={icon} className="text-[18px]" />
      {children}
    </Link>
  );
}

type HeroActionButtonProps = {
  icon: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
};

export function HeroActionButton({
  icon,
  children,
  onClick,
  disabled,
  variant = "ghost",
}: HeroActionButtonProps) {
  const className =
    variant === "primary"
      ? "inline-flex items-center gap-2 rounded-full bg-ivory px-5 py-2.5 text-[14px] font-medium text-sage hover:bg-cream disabled:opacity-50"
      : "inline-flex items-center gap-2 rounded-full border border-ivory/40 px-5 py-2.5 text-[14px] font-medium text-ivory hover:bg-ivory/10 disabled:opacity-50";

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      <Icon name={icon} className="text-[18px]" />
      {children}
    </button>
  );
}
