"use client";
import "./concierge.css";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
export function ConciergeEntry({ staffOnly = false, onNavigate }: {staffOnly?: boolean; onNavigate?: () => void}) {
  const pathname = usePathname();
  const { user } = useUser(),
    [access, setAccess] = useState({ enabled: false, staff: false });
  useEffect(() => {
    let live = true;
    setAccess({ enabled: false, staff: false });
    if (user?.id)
      void fetch("/api/concierge/access", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (live && d?.success) setAccess(d);
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [user?.id]);
  return (staffOnly ? access.staff : access.enabled) ? (
    <div className="px-4 py-2 text-[13px] text-rose-gold-deep">
      {!staffOnly && access.enabled && (
        <Link aria-current={pathname?.startsWith("/dashboard/concierge") ? "page" : undefined} className="concierge-nav-entry" href="/dashboard/concierge" onClick={onNavigate}><span aria-hidden="true">✧</span><span>White-Glove Setup<small>Your personalized onboarding.</small></span></Link>
      )}
      {staffOnly && access.staff && (
        <Link className="block mt-2" onClick={onNavigate} href="/dashboard/admin/concierge">
          Concierge Command Center
        </Link>
      )}
    </div>
  ) : null;
}
