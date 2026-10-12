import Image from "next/image";

import { cn } from "@/lib/cn";
import type { HeroImage } from "@/lib/marketing/hero-images";

type MarketingHeroImageProps = {
  image: HeroImage;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

/** Sharp public-site hero frame — wide banners keep native resolution; no tall PNG crops. */
export function MarketingHeroImage({
  image,
  priority,
  className,
  imageClassName,
}: MarketingHeroImageProps) {
  const isBanner = image.variant === "banner";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_24px_70px_rgba(26,20,16,0.16)] lg:rounded-[1.25rem]",
        isBanner && "aspect-[2172/724]",
        className,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        priority={priority}
        quality={92}
        unoptimized={isBanner}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 52vw, 720px"
        className={cn(
          "h-full w-full object-cover",
          isBanner ? "object-center" : "h-auto object-top",
          imageClassName,
        )}
        style={
          image.objectPosition ? { objectPosition: image.objectPosition } : undefined
        }
      />
    </div>
  );
}
