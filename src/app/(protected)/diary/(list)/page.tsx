import Link from "next/link";
import { redirect } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { DiaryMonthView } from "@/components/diary/diary-month-view";
import { DiarySummaryStats } from "@/components/diary/diary-summary-stats";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsLink } from "@/components/nav/settings-link";
import { getSession } from "@/lib/auth/session";
import { getDiariesForMonth, getDiaryCounts } from "@/lib/diary/queries";
import { todayKeyInZone } from "@/lib/tz";
import { getRequestTimeZone } from "@/lib/tz-server";

export const metadata = { title: "일기" };

export default async function DiaryListPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // 통합 뷰: 검색창 + 접히는 월 달력 + 그 달 목록. 초기 월(이번 달)은 서버 prefetch.
  // 첫 화면의 이번 달은 현지 기준(해외여행). 월 조회 범위 자체는 저장 좌표(KST)다.
  const [ty, tm] = todayKeyInZone(await getRequestTimeZone()).split("-").map(Number);
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
      <PageHeader
        title="일기"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            {/* 밀린 날 채우기 진입 — 구조 요청이라 글자는 남기되, 한 줄을 통째로
                차지해 달력을 밀어내지 않도록 헤더 칩으로 둔다. */}
            <Link
              href="/diary/backfill"
              aria-label="사진으로 밀린 날 채우기"
              className="pressable"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 32,
                padding: "0 12px",
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--surface)",
                color: "var(--fg)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <ImagePlus size={15} color="var(--tint)" aria-hidden />
              밀린 날
            </Link>
            <SettingsLink />
          </div>
        }
      />

      <DiarySummaryStats thisMonth={counts.thisMonth} total={counts.total} />

      <DiaryMonthView initialYear={ty} initialMonth={tm} initialDays={monthData.days} />
    </div>
  );
}
