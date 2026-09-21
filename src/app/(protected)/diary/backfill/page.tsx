import { redirect } from "next/navigation";
import { BackfillClient } from "@/components/diary/backfill-client";
import { PageHeader } from "@/components/layout/page-header";
import { BackButton } from "@/components/nav/back-button";
import { getSession } from "@/lib/auth/session";
import { getBackfillLimits } from "@/lib/diary/backfill";

export const metadata = { title: "밀린 날 채우기" };

export default async function DiaryBackfillPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // 한도는 요금제에서 나온다 — 화면이 안내하는 숫자와 서버가 막는 숫자를 하나로 맞춘다.
  const limits = await getBackfillLimits(session.userId);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        padding: "0 var(--space-4) var(--space-12)",
      }}
    >
      <PageHeader title="밀린 날 채우기" leading={<BackButton />} />
      <BackfillClient limits={limits} />
    </div>
  );
}
