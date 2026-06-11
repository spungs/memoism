import { AuthForm } from "@/components/auth/auth-form";
import { loginAction } from "@/lib/auth/actions";

export const metadata = { title: "로그인" };

const NOTICES: Record<string, string> = {
  email_exists:
    "이미 가입된 이메일이에요. 비밀번호로 로그인한 뒤 설정에서 구글 계정을 연결할 수 있어요.",
  google: "구글 로그인에 실패했어요. 다시 시도해주세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const notice = error ? NOTICES[error] : undefined;
  return <AuthForm mode="login" action={loginAction} notice={notice} />;
}
