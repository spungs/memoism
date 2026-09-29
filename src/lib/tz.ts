// 사용자 현지 시간대 도구 — 서버·클라이언트 공용(순수 함수, Node/브라우저 Intl만 씀).
//
// 두 좌표계를 구분한다(docs/superpowers/plans/2026-09-29-local-timezone-dates.md):
//   - 현지 날짜: 사용자가 겪은 날. "오늘이 며칠인지", 새벽 규칙, 사진 촬영일 → 이 파일.
//   - 저장 기준점: 일기가 어느 칸에 속하는지. KST 고정 → src/lib/diary/kst.ts.
// 현지 날짜로 정한 dateKey를 kst.ts의 앵커·범위 함수에 그대로 넘기면, 한국에 돌아와도
// 여행 중 일기의 날짜가 바뀌지 않는다.

/** 쿠키가 없거나 잘못됐을 때의 기준. 앱이 원래 전제하던 시간대다. */
export const DEFAULT_TIME_ZONE = "Asia/Seoul";

/** 쿠키로 들어오는 값이라 길이부터 막는다. 실제 IANA 이름은 30자 남짓이다. */
const MAX_TZ_LENGTH = 64;

/** 유효한 IANA 시간대면 그대로, 아니면 서울. */
export function normalizeTimeZone(tz: string | null | undefined): string {
  if (!tz || tz.length > MAX_TZ_LENGTH) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(tz, f);
  }
  return f;
}

function zonedParts(date: Date, tz: string) {
  const parts: Record<string, string> = {};
  for (const p of formatterFor(tz).formatToParts(date)) parts[p.type] = p.value;
  // 일부 엔진은 hourCycle h23에서도 자정을 "24"로 준다.
  const hour = Number(parts.hour) % 24;
  return { y: parts.year, m: parts.month, d: parts.day, hour, minute: parts.minute };
}

/** 그 시각의 현지 날짜 "YYYY-MM-DD". */
export function dateKeyInZone(date: Date, tz: string): string {
  const { y, m, d } = zonedParts(date, tz);
  return `${y}-${m}-${d}`;
}

/** 현지 기준 오늘 "YYYY-MM-DD". */
export function todayKeyInZone(tz: string, now: Date = new Date()): string {
  return dateKeyInZone(now, tz);
}

/** 현지 기준 시(0~23). */
export function hourInZone(date: Date, tz: string): number {
  return zonedParts(date, tz).hour;
}

/** 현지 기준 "HH:mm". */
export function formatHmInZone(date: Date, tz: string): string {
  const { hour, minute } = zonedParts(date, tz);
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

/**
 * "YYYY-MM-DD" 모양이면서 달력에 실제로 있는 날짜인지. 모양만 보면 "2026-02-31"이
 * 통과해 3월 3일 범위를 조회했다(점검 L6). 날짜 키를 받는 곳은 모두 이걸 쓴다.
 */
export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** 달력 날짜 산술 — 시간대와 무관하다(UTC 자정 기준으로 계산). */
export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 달력 날짜의 요일(0=일). 시간대와 무관하다. */
export function weekdayOfDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 브라우저(기기)의 시간대. 서버에서 부르면 서버 시간대가 나오니 클라이언트에서만 쓴다. */
export function deviceTimeZone(): string {
  return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** 쿠키 이름. 클라이언트가 심고(time-zone-cookie.tsx) 서버가 읽는다(tz-server.ts). */
export const TZ_COOKIE = "tz";
