"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
export function ConciergeEntry() {
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
  return access.enabled || access.staff ? (
    <div className="px-4 py-2 text-[13px] text-rose-gold-deep">
      {access.enabled && (
        <Link href="/dashboard/concierge">✧ MyARI Concierge</Link>
      )}
      {access.staff && (
        <Link className="block mt-2" href="/dashboard/admin/concierge">
          Concierge Command Center
        </Link>
      )}
    </div>
  ) : null;
}
