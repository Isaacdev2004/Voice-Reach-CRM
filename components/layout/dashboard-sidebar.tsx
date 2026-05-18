"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { dashboardNav, isActiveNav } from "@/lib/navigation";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-primary-container py-6 shadow-xl">
      <div className="px-6 mb-10">
        <h1 className="text-headline-md font-semibold text-on-primary-container">
          Voice Reach CRM
        </h1>
        <p className="text-label-md text-on-primary-container/60">
          Enterprise Automation
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {dashboardNav.map((item) => {
          const active = isActiveNav(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mx-2 my-1 flex items-center gap-3 rounded-full px-4 py-3 transition-all",
                active
                  ? "bg-secondary text-on-secondary scale-[0.98]"
                  : "text-on-primary-container hover:bg-surface-variant/10",
              )}
            >
              <Icon name={item.icon} />
              <span className="text-label-md font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 mt-auto">
        <button
          type="button"
          className="w-full rounded-full bg-secondary py-4 text-label-md font-bold text-on-secondary transition-all hover:opacity-90 active:scale-95"
        >
          Upgrade Plan
        </button>
      </div>
    </aside>
  );
}
