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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
              <span className="material-symbols-outlined text-[28px] text-white">voice_chat</span>
            </div>
          </div>
          <h1 className="font-headline-md text-headline-md tracking-tight text-primary">Voice Reach</h1>
          <p className="font-label-md text-label-md mt-base uppercase tracking-widest text-on-primary-container">
            CRM Enterprise
          </p>
        </div>
        {children}
        <div className="mt-xl space-x-md text-center">
          <a
            className="font-caption text-caption text-on-primary-container transition-colors hover:text-primary"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="font-caption text-caption text-on-primary-container transition-colors hover:text-primary"
            href="#"
          >
            Terms of Service
          </a>
        </div>
      </main>
      <div className="pointer-events-none fixed -bottom-24 -right-24 hidden opacity-20 lg:block">
        <div className="relative h-[600px] w-[600px] rounded-full border border-secondary/30">
          <div className="absolute inset-24 rounded-full border border-primary/20" />
          <div className="absolute inset-48 rounded-full border border-secondary/10" />
        </div>
      </div>
    </>
  );
}
