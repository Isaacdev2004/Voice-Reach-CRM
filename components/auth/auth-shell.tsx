"use client";
import "@/components/marketing/public-auth-refinement.css";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthExplore } from "@/components/auth/auth-explore";
import { AuthModeSwitch } from "@/components/auth/auth-mode-switch";
import { AriLogo } from "@/components/brand/ari-logo";

export function AuthShell({
  children,
  mode = "sign-in",
}: {
  children: ReactNode;
  mode?: "sign-in" | "sign-up";
}) {
  const path = usePathname();
  const entry = /^\/sign-(in|up)\/?$/.test(path ?? "");
  return (
    <div className="public-auth-surface" data-auth-entry={entry}>
      <AuthBrandPanel mode={mode} />
      <main className="auth-content">
        <header className="auth-content-header">
          <Link href="/" className="auth-back-link">
            <span aria-hidden="true">‹</span> Back to MyARI
          </Link>
        </header>
        <div className="auth-form-stage">
          <div className="auth-form-panel">
            <Link href="/" className="auth-form-logo" aria-label="MyARI home">
              <AriLogo height={80} />
              <span>
                REAL ESTATE FOLLOW-UP
                <br />
                BUILT FOR WHAT’S NEXT
              </span>
            </Link>
            <Suspense
              fallback={
                <div className="auth-switch-placeholder" aria-hidden="true" />
              }
            >
              <AuthModeSwitch mode={mode} />
            </Suspense>
            {children}
          </div>
        </div>
        <div className="auth-secondary-actions">
          <AuthExplore />
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
