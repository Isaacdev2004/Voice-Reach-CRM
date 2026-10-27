import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { eligible } from "@/lib/concierge/access";
import { ConciergeWorkspace } from "@/components/concierge/workspace";
export default async function ConciergePage() {
  const owner = await requireUserId();
  if (!eligible(owner)) notFound();
  return <ConciergeWorkspace />;
}
