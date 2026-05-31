// src/lib/diary/kst.ts
// KST(UTC+9) 날짜 유틸 — 캘린더/월 집계 공용. 순수 함수(클라·서버 양쪽 import 가능).
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Date → KST 기준 "YYYY-MM-DD". */
export function kstDateKey(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 오늘(KST) "YYYY-MM-DD". */
export function kstTodayKey(): string {
  return kstDateKey(new Date());
}

/** KST 연·월(month: 1~12)의 [startUtc, endUtc) UTC 경계. getDiaryCounts와 동일 방식. */
export function kstMonthRangeUtc(
  year: number,
  month: number,
): { startUtc: Date; endUtc: Date } {
  const startUtc = new Date(Date.UTC(year, month - 1, 1) - KST_OFFSET_MS);
  const endUtc = new Date(Date.UTC(year, month, 1) - KST_OFFSET_MS);
  return { startUtc, endUtc };
}
