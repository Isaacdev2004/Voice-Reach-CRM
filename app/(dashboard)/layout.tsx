import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
