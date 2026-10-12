import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type MarketingHeroBackdropProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Hero band with slow drifting accent orbs (public marketing pages). */
export function MarketingHeroBackdrop({ children, className, id }: MarketingHeroBackdropProps) {
  return (
    <section id={id} className={cn("hero-gradient marketing-hero-live relative overflow-hidden", className)}>
      <div className="marketing-hero-orb marketing-hero-orb-a pointer-events-none" aria-hidden />
      <div className="marketing-hero-orb marketing-hero-orb-b pointer-events-none" aria-hidden />
      <div className="relative z-[1]">{children}</div>
    </section>
  );
}
