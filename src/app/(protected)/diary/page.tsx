import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ImagePlus } from "lucide-react";
import { DiaryMonthView } from "@/components/diary/diary-month-view";
import { DiarySummaryStats } from "@/components/diary/diary-summary-stats";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsLink } from "@/components/nav/settings-link";
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
      <PageHeader title="일기" action={<SettingsLink />} />

      <DiarySummaryStats thisMonth={counts.thisMonth} total={counts.total} />

      {/* 밀린 날 채우기 진입 — 구조 요청이라 눈에 띄되 달력보다 앞서지 않게 둔다. */}
      <Link
        href="/diary/backfill"
        className="pressable"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-5)",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--surface)",
          color: "var(--fg)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-md)",
          textDecoration: "none",
        }}
      >
        <ImagePlus size={16} color="var(--tint)" aria-hidden />
        사진으로 밀린 날 채우기
        <ChevronRight
          size={16}
          color="var(--fg-muted)"
          aria-hidden
          style={{ marginLeft: "auto" }}
        />
      </Link>

      <DiaryMonthView initialYear={ty} initialMonth={tm} initialDays={monthData.days} />
    </div>
  );
}
