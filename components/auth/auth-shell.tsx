"use client";

import "@/components/marketing/public-auth-refinement.css";
import Link from "next/link";
import { AuthExplore } from "@/components/auth/auth-explore";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AriLogo } from "@/components/brand/ari-logo";
import type { ReactNode } from "react";

type AuthShellProps = { children: ReactNode; mode?: "sign-in" | "sign-up" };

export function AuthShell({ children, mode = "sign-in" }: AuthShellProps) {
  return (
    <div className="public-auth-surface">
      <AuthBrandPanel mode={mode} />
      <main className="auth-content">
        <header className="auth-content-header">
          <Link href="/" className="auth-mobile-logo" aria-label="MyARI home">
            <AriLogo height={46} />
            <span className="auth-header-tagline">
              THE ART OF STAYING CONNECTED
            </span>
          </Link>
          <Link href="/" className="auth-back-link">
            <span aria-hidden="true">←</span> Back to MyARI
          </Link>
        </header>
        <div className="auth-form-stage">
          <div className="auth-form-panel">
            <p className="auth-form-eyebrow">
              YOUR BUSINESS. BEAUTIFULLY CONNECTED.
            </p>
            {children}
            <AuthExplore />
            <p className="auth-reassurance">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                <rect
                  x="5"
                  y="8.5"
                  width="10"
                  height="8"
                  rx="2"
                  stroke="currentColor"
                />
                <path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" stroke="currentColor" />
              </svg>{" "}
              A little more clarity. A lot more possibility.
            </p>
            <p className="auth-mobile-inspiration">
              “Your next chapter starts with the relationships you build today.”
            </p>
          </div>
        </div>
        <footer className="auth-legal">
          <span>© {new Date().getFullYear()} MyARI</span>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
