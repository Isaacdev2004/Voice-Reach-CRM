import Image from "next/image";
import { cn } from "@/lib/cn";

type AriLogoProps = {
  className?: string;
  /** Rendered height in px. */
  height?: number;
};

/** Client ARI wordmark from `/public/brand/ari-logo.png`. */
export function AriLogo({ className, height = 44 }: AriLogoProps) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center leading-none", className)}
      style={{ height }}
    >
      <Image
        src="/brand/ari-logo.png"
        alt="ARI"
        width={864}
        height={597}
        priority
        className="h-full w-auto max-w-none object-contain object-left"
      />
    </span>
  );
}
