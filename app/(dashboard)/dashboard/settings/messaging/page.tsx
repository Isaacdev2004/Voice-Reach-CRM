import { ManagedMessagingSetup } from "@/components/messaging/managed-setup";
import { managedSetupAllowed } from "@/lib/messaging/setup-access";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
export default async function MessagingSetupPage() {
  const {userId}=await auth();
  if(!userId)redirect("/sign-in");
  if(!managedSetupAllowed(userId))notFound();
  return <ManagedMessagingSetup />;
}
