import { redirect } from "next/navigation";
import { DiaryMonthView } from "@/components/diary/diary-month-view";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth/session";
import { getDiariesForMonth, getDiaryCounts } from "@/lib/diary/queries";
import { kstTodayKey } from "@/lib/diary/kst";

export const metadata = { title: "일기" };

export default async function DiaryListPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // 통합 뷰: 검색창 + 접히는 월 달력 + 그 달 목록. 초기 월(이번 달)은 서버 prefetch.
  const [ty, tm] = kstTodayKey().split("-").map(Number);
  const [monthData, counts] = await Promise.all([
    getDiariesForMonth(session.userId, ty, tm),
    getDiaryCounts(session.userId),
  ]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        padding: "0 var(--space-4) var(--space-12)",
      }}
    >
      <PageHeader title="일기" subtitle={`총 ${counts.total}개`} />

      <DiaryMonthView initialYear={ty} initialMonth={tm} initialDays={monthData.days} />
    </div>
  );
}
