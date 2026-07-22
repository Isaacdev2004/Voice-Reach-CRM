"use client";

import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  mode?: "sign-in" | "sign-up";
};

const HIGHLIGHTS = [
  { icon: "groups", text: "Manage contacts, tasks, and calendar in one place" },
  { icon: "campaign", text: "Launch AI voice campaigns with compliance built in" },
  { icon: "calendar_month", text: "Sync appointments and follow-ups automatically" },
];

export function AuthShell({ children, mode = "sign-in" }: AuthShellProps) {
  const isSignUp = mode === "sign-up";

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.05fr_0.95fr]">
      {/* Left — brand story */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-sage via-emerald-muted to-sage px-10 py-12 text-ivory lg:flex lg:flex-col lg:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ivory/15 backdrop-blur-sm">
              <Icon name="voice_chat" className="text-[24px] text-ivory" />
            </div>
            <div>
              <p className="font-serif text-[22px] font-semibold leading-tight">Voice Reach</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ivory/75">
                Relationship CRM
              </p>
            </div>
          </Link>

          <div className="mt-16 max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ivory/70">
              {isSignUp ? "Get started" : "Welcome back"}
            </p>
            <h1 className="mt-4 font-serif text-[40px] font-semibold leading-[1.12]">
              Relationships that open doors
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-ivory/90">
              {isSignUp
                ? "Create your account to manage contacts, automate outreach, and stay on top of every follow-up."
                : "Sign in to your dashboard — contacts, campaigns, calendar, and AI voice tools in one workspace."}
            </p>
          </div>

          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-[15px] text-ivory/90">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ivory/15">
                  <Icon name={item.icon} className="text-[18px]" />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13px] text-ivory/60">
          Trusted by teams who lead with relationships, not just transactions.
        </p>

        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-ivory/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 top-1/3 h-56 w-56 rounded-full bg-ivory/5 blur-2xl" />
      </aside>

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
