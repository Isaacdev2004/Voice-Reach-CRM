import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import type { ReactNode } from "react";

type FocusHeroBannerProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function FocusHeroBanner({ eyebrow, title, description, actions }: FocusHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sage via-emerald-muted to-sage px-6 py-8 text-ivory shadow-nav sm:px-10 sm:py-10">
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ivory/80">
            {eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-[28px] font-semibold leading-tight sm:text-[36px]">
            {title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ivory/90">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-ivory/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-1/4 h-40 w-40 rounded-full bg-ivory/5 blur-2xl" />
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
