"use client";

import { UtmCapture } from "@/components/marketing/utm-capture";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";
import type { ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
  /** Passed from the server layout so client and server use the same key. */
  publishableKey?: string;
};

export function Providers({ children, publishableKey }: ProvidersProps) {
  if (!publishableKey) {
    return (
      <>
        <UtmCapture />
        {children}
      </>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
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
