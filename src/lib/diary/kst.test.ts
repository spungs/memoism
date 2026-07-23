import { describe, it, expect } from "vitest";
import {
  kstDateKey,
  kstDayRangeFromKey,
  diaryCreatedAtForDateKey,
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
});
