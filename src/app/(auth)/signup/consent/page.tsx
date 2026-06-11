import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OAUTH_COOKIE, verifyGooglePending } from "@/lib/auth/google";
import { GoogleConsentForm } from "@/components/auth/google-consent-form";

export const metadata = { title: "시작하기" };

export default async function GoogleConsentPage() {
  const jar = await cookies();
  const pendingToken = jar.get(OAUTH_COOKIE.pending)?.value;
  const pending = pendingToken ? await verifyGooglePending(pendingToken) : null;
  // pending이 없으면(직접 진입/만료) 로그인으로.
  if (!pending) redirect("/login");

  return <GoogleConsentForm email={pending.email} />;
}
