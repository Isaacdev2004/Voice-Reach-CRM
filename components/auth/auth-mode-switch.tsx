"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authModeHref } from "@/lib/auth-presentation";

export function AuthModeSwitch({ mode }: { mode: "sign-in" | "sign-up" }) {
  const search = useSearchParams().toString();
  return (
    <nav className="auth-mode-switch" aria-label="Account access">
      <Link
        href={authModeHref("/sign-in", search)}
        aria-current={mode === "sign-in" ? "page" : undefined}
      >
        Sign In
      </Link>
      <Link
        href={authModeHref("/sign-up", search)}
        aria-current={mode === "sign-up" ? "page" : undefined}
      >
        Create Account
      </Link>
    </nav>
  );
}
