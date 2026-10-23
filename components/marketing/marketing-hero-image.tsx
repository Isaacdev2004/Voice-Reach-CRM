import Image from "next/image";

import { cn } from "@/lib/cn";
import type { HeroImage } from "@/lib/marketing/hero-images";

type MarketingHeroImageProps = {
  image: HeroImage;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

/** Real application captures for public product showcases; synthetic demonstration records. */
export function MarketingHeroImage({
  image,
  priority,
  className,
  imageClassName,
}: MarketingHeroImageProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_24px_70px_rgba(26,20,16,0.16)] transition-shadow duration-500 hover:shadow-[0_28px_80px_rgba(26,20,16,0.2)] lg:rounded-[1.25rem]",
        className,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 52vw, 760px"
        className={cn(
          "h-auto max-h-[460px] w-full object-cover object-top",
          imageClassName,
        )}
        style={
          image.objectPosition
            ? { objectPosition: image.objectPosition }
            : undefined
        }
      />
      <p className="border-t border-outline-variant/15 bg-ivory px-4 py-2 text-[11px] text-slate-text">
        Actual MyARI application capture · Synthetic demonstration data
      </p>
    </div>
  );
}
