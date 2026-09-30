import { AuthSignInPage } from "@/components/pages/stitch/AuthSignInPage";
import { hasClerkPublishableKey } from "@/lib/clerk-env";

export default function SignInPage() {
  return <AuthSignInPage clerkEnabled={hasClerkPublishableKey()} />;
}
