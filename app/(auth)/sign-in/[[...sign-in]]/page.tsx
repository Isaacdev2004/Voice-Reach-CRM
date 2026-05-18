import { AuthSignInPage } from "@/components/pages/stitch/AuthSignInPage";
import { hasClerkEnv } from "@/lib/clerk-env";

export default function SignInPage() {
  return <AuthSignInPage clerkEnabled={hasClerkEnv()} />;
}
