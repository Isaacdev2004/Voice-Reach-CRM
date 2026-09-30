import { AuthSignUpPage } from "@/components/pages/stitch/AuthSignUpPage";
import { hasClerkPublishableKey } from "@/lib/clerk-env";

export default function SignUpPage() {
  return <AuthSignUpPage clerkEnabled={hasClerkPublishableKey()} />;
}
