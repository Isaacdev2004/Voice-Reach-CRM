"use client";

import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="relative z-10 mx-auto w-full max-w-[420px]">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-gold shadow-card">
          <span className="material-symbols-outlined text-[24px] text-ivory">voice_chat</span>
        </div>
        <h1 className="font-serif text-[26px] font-semibold tracking-tight text-ink">
          Voice Reach
        </h1>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-taupe">
          Relationship CRM
        </p>
      </div>

      {children}

      <div className="mt-6 flex justify-center gap-5 text-center">
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
  );
}
