import { AuthForm } from "@/components/auth/auth-form";
import { signupAction } from "@/lib/auth/actions";

export const metadata = { title: "회원가입" };

export default function SignupPage() {
  return <AuthForm mode="signup" action={signupAction} />;
}
