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

/** "2026-07-20" → "7월 20일". 칩·시트에서 날짜를 사람 말로 보여줄 때. */
export function dateKeyLabel(key: string): string {
  const [, m, d] = key.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
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

/** KST 하루(year·month 1~12·day)의 [startUtc, endUtc) UTC 경계. 날짜 질문 검색용. */
export function kstDayRangeUtc(
  year: number,
  month: number,
  day: number,
): { startUtc: Date; endUtc: Date } {
  const startUtc = new Date(Date.UTC(year, month - 1, day) - KST_OFFSET_MS);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}

/** KST 날짜키 "YYYY-MM-DD" → 그날 [startUtc, endUtc) UTC 경계. */
export function kstDayRangeFromKey(dateKey: string): {
  startUtc: Date;
  endUtc: Date;
} {
  const [y, m, d] = dateKey.split("-").map(Number);
  return kstDayRangeUtc(y, m, d);
}

/**
 * 어느 시간대에서든 "오늘"일 수 있는 가장 늦은 날짜 = KST 오늘 + 1일.
 * KST(+9)보다 앞선 곳은 최대 +14(키리바시)라 현지 날짜가 KST보다 이틀 앞설 수 없다.
 * 이보다 늦은 dateKey는 미래로 보고 거부한다(2026-09-29 점검 H2).
 */
export function latestPossibleTodayKey(now: Date): string {
  const [y, m, d] = kstDateKey(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * 일기 createdAt 앵커 — 날짜키 기준. createdAt은 "날짜 칸" + "작성 시각" 겸용.
 * dateKey는 **현지 날짜**(src/lib/tz.ts)여도 되고, 앵커는 KST 좌표에 박는다.
 *   - KST 오늘 → 실제 작성 시각(now).
 *   - 과거 → 그 날 KST 정오.
 *   - KST보다 하루 앞선 날짜(뉴질랜드 등 동쪽 여행지의 현지 오늘) → 그 날 KST 정오.
 *     now를 쓰면 KST 오늘 칸에 들어가 현지 날짜와 어긋난다. 미래 시각이지만 하루 이내다.
 *   - 그보다 먼 미래 → now(예전 동작). 호출자가 미리 걸러야 한다.
 */
export function diaryCreatedAtForDateKey(dateKey: string, now: Date): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return now;
  const today = kstDateKey(now);
  if (dateKey === today) return now;
  if (dateKey > today && dateKey > latestPossibleTodayKey(now)) return now;
  const d = new Date(`${dateKey}T12:00:00+09:00`);
  return isNaN(d.getTime()) ? now : d;
}
