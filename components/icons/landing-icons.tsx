import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type IconSvgProps = {
  className?: string;
};

export function VoicemailIcon({ className }: IconSvgProps) {
  return (
    <svg
      className={cn("h-7 w-7", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="8" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <path d="M8 16h8" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconSvgProps) {
  return (
    <svg
      className={cn("h-7 w-7", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3 4 6.5v5.5c0 4.4 3.2 8.5 8 9 4.8-.5 8-4.6 8-9V6.5L12 3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function HubIcon({ className }: IconSvgProps) {
  return (
    <svg
      className={cn("h-7 w-7", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M10.5 10.2 6.8 7.5M13.5 10.2l3.7-2.7M10.5 13.8l-3.7 2.7M13.5 13.8l3.7 2.7" />
    </svg>
  );
}

export function AutomationIcon({ className }: IconSvgProps) {
  return (
    <svg
      className={cn("h-7 w-7", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M12 7v5l3 2" />
      <path d="M17 3h4v4" />
      <path d="M17 3 12 8" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconSvgProps) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function VerifiedBadgeIcon({ className }: IconSvgProps) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3 4 6.5v5.5c0 4.4 3.2 8.5 8 9 4.8-.5 8-4.6 8-9V6.5L12 3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

type FeatureIconProps = {
  variant?: "light" | "dark";
  children: ReactNode;
};

export function FeatureIconBadge({ variant = "light", children }: FeatureIconProps) {
  return (
    <div
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
        variant === "dark"
          ? "bg-tertiary-fixed/20 text-tertiary-fixed"
          : "bg-secondary/10 text-secondary",
      )}
    >
      {children}
    </div>
  );
}
