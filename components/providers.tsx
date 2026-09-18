"use client";

import { UtmCapture } from "@/components/marketing/utm-capture";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";

type ProvidersProps = {
  children: React.ReactNode;
  clerkEnabled: boolean;
};

export function Providers({ children, clerkEnabled }: ProvidersProps) {
  if (!clerkEnabled) {
    return (
      <>
        <UtmCapture />
        {children}
      </>
    );
  }

  return (
    <ClerkProvider
      ui={ui}
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl={AUTH_AFTER_URL}
      signUpFallbackRedirectUrl={AUTH_AFTER_URL}
    >
      <UtmCapture />
      {children}
    </ClerkProvider>
  );
}
