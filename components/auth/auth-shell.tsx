"use client";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { Icon } from "@/components/ui/icon";
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
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-gold shadow-card">
              <Icon name="voice_chat" className="text-[24px] text-ivory" />
            </div>
            <p className="font-serif text-[24px] font-semibold text-ink">Voice Reach</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-taupe">
              Relationship CRM
            </p>
          </div>

          <div className="auth-form-panel mx-auto w-full max-w-[420px]">{children}</div>
        </div>

        <footer className="flex justify-center gap-6 px-6 pb-8 text-center">
          <a
            className="text-[12px] text-taupe transition-colors hover:text-rose-gold-deep"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="text-[12px] text-taupe transition-colors hover:text-rose-gold-deep"
            href="#"
          >
            Terms of Service
          </a>
        </footer>
      </div>
    </div>
  );
}
