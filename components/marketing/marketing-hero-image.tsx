import Image from "next/image";

import { cn } from "@/lib/cn";
import type { HeroImage } from "@/lib/marketing/hero-images";

type MarketingHeroImageProps = {
  image: HeroImage;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

/** Sharp UI mockups for the public site — native PNG size, no JPG banner upscaling. */
export function MarketingHeroImage({
  image,
  priority,
  className,
  imageClassName,
}: MarketingHeroImageProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_24px_70px_rgba(26,20,16,0.16)] lg:rounded-[1.25rem]",
        className,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        priority={priority}
        unoptimized
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 52vw, 760px"
        className={cn("h-auto w-full object-cover object-top", imageClassName)}
        style={
          image.objectPosition ? { objectPosition: image.objectPosition } : undefined
        }
      />
    </div>
  );
}
