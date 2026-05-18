"use client";

import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="auth-card-shadow rounded-[24px] border border-outline-variant/20 bg-surface-container-lowest p-lg md:p-xl">
      <div className="mb-lg">
        <h2 className="font-headline-md text-headline-md text-ink">{title}</h2>
        <p className="font-body-md text-body-md mt-xs text-on-surface-variant">{subtitle}</p>
      </div>
      {children}
      {footer}
    </div>
  );
}
