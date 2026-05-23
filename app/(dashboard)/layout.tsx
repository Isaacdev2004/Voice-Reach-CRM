import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Suspense } from "react";

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
