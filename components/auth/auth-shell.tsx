"use client";

import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <>
      <main className="w-full max-w-[480px]">
        <div className="mb-xl flex flex-col items-center">
          <div className="mb-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-gold shadow-card">
              <span className="material-symbols-outlined text-[28px] text-ivory">voice_chat</span>
            </div>
          </div>
          <h1 className="font-serif text-[28px] font-semibold tracking-tight text-ink">
            Voice Reach
          </h1>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-taupe">
            Relationship CRM
          </p>
        </div>
        <div className="luxury-card p-8">{children}</div>
        <div className="mt-xl space-x-md text-center">
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
        </div>
      </main>
      <div className="pointer-events-none fixed -bottom-24 -right-24 hidden opacity-20 lg:block">
        <div className="relative h-[600px] w-[600px] rounded-full border border-rose-gold/30">
          <div className="absolute inset-24 rounded-full border border-rose-gold/20" />
          <div className="absolute inset-48 rounded-full border border-sage/20" />
        </div>
      </div>
    </>
  );
}
