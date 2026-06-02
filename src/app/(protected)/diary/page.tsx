import { redirect } from "next/navigation";
import { DiaryMonthView } from "@/components/diary/diary-month-view";
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
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        padding: "var(--space-5) var(--space-4) var(--space-12)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
          padding: "0 var(--space-1)",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-2xl)",
              color: "var(--fg)",
              fontWeight: 600,
              letterSpacing: "var(--tracking-tight)",
              lineHeight: 1.1,
            }}
          >
            일기
          </h1>
          <p
            style={{
              margin: "var(--space-1) 0 0 0",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-subtle)",
              letterSpacing: "var(--tracking-wide)",
            }}
          >
            총 {counts.total}개
          </p>
        </div>
      </header>

      <DiaryMonthView initialYear={ty} initialMonth={tm} initialDays={monthData.days} />
    </main>
  );
}
