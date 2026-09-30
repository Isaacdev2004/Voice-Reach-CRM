"use client";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AriLogo } from "@/components/brand/ari-logo";
import { BRAND_TAGLINE } from "@/lib/brand";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  mode?: "sign-in" | "sign-up";
};

export function AuthShell({ children, mode = "sign-in" }: AuthShellProps) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1fr_1fr]">
      <AuthBrandPanel mode={mode} />

      {/* Right — form */}
      <div className="flex min-h-screen flex-col bg-cream">
        <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
          {/* Mobile brand strip */}
          <div className="mb-8 flex flex-col items-center rounded-2xl border border-outline-variant/15 bg-ivory/80 px-6 py-5 text-center lg:hidden">
            <AriLogo height={44} />
            <p className="mt-2 max-w-[260px] text-[12px] leading-snug text-taupe">{BRAND_TAGLINE}</p>
          </div>

          <div className="auth-form-panel mx-auto w-full max-w-[420px]">{children}</div>
        </div>

        <footer className="flex justify-center gap-6 px-6 pb-8 text-center">
          <a
            className="text-[12px] text-taupe transition-colors hover:text-rose-gold-deep"
            href="/privacy"
          >
            Privacy Policy
          </a>
          <a
            className="text-[12px] text-taupe transition-colors hover:text-rose-gold-deep"
            href="/terms"
          >
            Terms of Service
          </a>
        </footer>
      </div>
    </div>
  );
}
