import { cn } from "@/lib/cn";

type AriLogoProps = {
  className?: string;
  /** Overall height in px; width scales with the wordmark */
  height?: number;
};

/**
 * Client ARI wordmark: gradient A with house silhouette + navy R/I.
 */
export function AriLogo({ className, height = 44 }: AriLogoProps) {
  const width = Math.round(height * (148 / 56));
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 148 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="ARI"
    >
      <defs>
        <linearGradient id="ariMarkGrad" x1="4" y1="52" x2="52" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#071428" />
          <stop offset="0.45" stopColor="#163A78" />
          <stop offset="1" stopColor="#2BB8E0" />
        </linearGradient>
      </defs>

      {/* A */}
      <path
        d="M30 2 L54 54 H43.2 L38.6 41 H21.4 L16.8 54 H6 L30 2 Z"
        fill="url(#ariMarkGrad)"
      />
      <path d="M24.2 33 H35.8 L30 16.5 L24.2 33 Z" fill="#FAF7F2" />
      {/* House in A */}
      <path d="M24.5 36.5 L30 31.5 L35.5 36.5 V44 H24.5 V36.5 Z" fill="#071428" />
      <rect x="26.4" y="37.8" width="7.2" height="5.2" fill="#E8F7FC" />
      <path d="M30 37.8 V43 M26.4 40.4 H33.6" stroke="#071428" strokeWidth="0.85" />

      {/* R */}
      <path
        d="M64 8 H86.5 C96.8 8 103.5 14.2 103.5 24 C103.5 31.6 99.2 36.8 92.2 38.6 L105 54 H92.5 L81.2 40 H74 V54 H64 V8 Z M74 18 V30.5 H85.2 C89.6 30.5 92.5 27.8 92.5 24 C92.5 20.2 89.6 18 85.2 18 H74 Z"
        fill="#071428"
      />

      {/* I — connected feel via tight tracking */}
      <rect x="112" y="8" width="10" height="46" rx="1" fill="#071428" />
      <rect x="108" y="8" width="18" height="8" rx="1" fill="#071428" />
      <rect x="108" y="46" width="18" height="8" rx="1" fill="#071428" />
    </svg>
  );
}
