import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { staffRole } from "@/lib/concierge/access";
import { ConciergeStaff } from "@/components/concierge/staff";
export default async function ConciergeStaffPage() {
  if (!staffRole(await requireUserId())) notFound();
  return <ConciergeStaff />;
}
