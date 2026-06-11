import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SettingsView } from "@/components/settings/settings-view";

const GOOGLE_NOTICES: Record<string, string> = {
  linked: "구글 계정이 연결되었어요.",
  taken: "이 구글 계정은 다른 계정에 연결되어 있어요.",
  error: "구글 연결에 실패했어요. 다시 시도해주세요.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { googleSub: true, passwordHash: true },
  });

  const { google } = await searchParams;
  const googleNotice = google ? GOOGLE_NOTICES[google] : undefined;

  return (
    <SettingsView
      email={session.email}
      googleLinked={Boolean(user?.googleSub)}
      hasPassword={Boolean(user?.passwordHash)}
      googleNotice={googleNotice}
    />
  );
}
