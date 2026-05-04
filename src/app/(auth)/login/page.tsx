import { AuthForm } from "@/components/auth/auth-form";
import { loginAction } from "@/lib/auth/actions";

export const metadata = { title: "로그인" };

export default function LoginPage() {
  return <AuthForm mode="login" action={loginAction} />;
}
