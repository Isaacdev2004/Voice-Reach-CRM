import { AuthSignUpPage } from "@/components/pages/stitch/AuthSignUpPage";
import { hasClerkEnv } from "@/lib/clerk-env";

export default function SignUpPage() {
  return <AuthSignUpPage clerkEnabled={hasClerkEnv()} />;
}
