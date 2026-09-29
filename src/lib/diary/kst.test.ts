import { describe, it, expect } from "vitest";
import {
  kstDateKey,
  kstDayRangeFromKey,
  diaryCreatedAtForDateKey,
  latestPossibleTodayKey,
} from "./kst";

describe("kstDateKey", () => {
  it("UTC 인스턴트를 KST 달력 날짜로 매핑한다", () => {
    // 2026-07-22T15:00:00Z == 2026-07-23T00:00:00+09:00
    expect(kstDateKey(new Date("2026-07-22T15:00:00Z"))).toBe("2026-07-23");
  });
});

describe("kstDayRangeFromKey", () => {
  it("KST 날짜키를 [startUtc, endUtc) 하루 경계로 변환한다", () => {
    // KST 2026-07-23 00:00 == UTC 2026-07-22T15:00, +24h == 2026-07-23T15:00
    const { startUtc, endUtc } = kstDayRangeFromKey("2026-07-23");
    expect(startUtc.toISOString()).toBe("2026-07-22T15:00:00.000Z");
    expect(endUtc.toISOString()).toBe("2026-07-23T15:00:00.000Z");
  });

  it("자정 직후(KST) 인스턴트가 그날 범위 안에 든다", () => {
    // 2026-07-23T00:30+09:00 == 2026-07-22T15:30Z
    const { startUtc, endUtc } = kstDayRangeFromKey("2026-07-23");
    const instant = new Date("2026-07-22T15:30:00Z");
    expect(instant >= startUtc && instant < endUtc).toBe(true);
  });
});

describe("diaryCreatedAtForDateKey", () => {
  const now = new Date("2026-07-23T05:00:00Z"); // KST 14:00, 2026-07-23
  it("오늘(KST) → now 그대로", () => {
    expect(diaryCreatedAtForDateKey("2026-07-23", now)).toBe(now);
  });
  it("미래 → now 그대로", () => {
    expect(diaryCreatedAtForDateKey("2099-01-01", now)).toBe(now);
  });
  it("과거 → 그 날 KST 정오 (UTC 03:00)", () => {
    expect(diaryCreatedAtForDateKey("2026-07-20", now).toISOString()).toBe(
      "2026-07-20T03:00:00.000Z",
    );
  });
  it("형식 오류 → now", () => {
    expect(diaryCreatedAtForDateKey("bad", now)).toBe(now);
  });
  it("KST보다 하루 앞선 날짜(동쪽 여행지의 현지 오늘) → 그 날 KST 정오", () => {
    // 오클랜드(UTC+13)는 KST 20:00 이후 이미 다음 날이다. now를 쓰면 KST 오늘 칸에
    // 들어가 현지 날짜와 어긋나므로, 그 날 칸의 정오로 둔다(미래 시각이지만 하루 이내).
    expect(diaryCreatedAtForDateKey("2026-07-24", now).toISOString()).toBe(
      "2026-07-24T03:00:00.000Z",
    );
  });
});

describe("latestPossibleTodayKey", () => {
  it("어느 시간대에서든 오늘일 수 있는 가장 늦은 날짜 = KST 오늘 + 1일", () => {
    expect(latestPossibleTodayKey(new Date("2026-07-23T05:00:00Z"))).toBe("2026-07-24");
  });
});
