import { SettingsWorkspacePage } from "@/components/pages/stitch/SettingsWorkspacePage";
import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { managedSetupAllowed } from "@/lib/messaging/setup-access";
export default async function SettingsPage() {
  const {userId}=await auth();
  return <>
    {userId&&managedSetupAllowed(userId)?<div className="px-6 pt-4"><Link href="/dashboard/settings/messaging" className="inline-flex min-h-11 items-center rounded-full border border-outline-variant/30 bg-white px-5 text-sm text-rose-gold-deep">Messaging setup →</Link></div>:null}
    <Suspense fallback={<div className="p-8 text-center text-taupe">Loading settings…</div>}><SettingsWorkspacePage /></Suspense>
  </>;
}
