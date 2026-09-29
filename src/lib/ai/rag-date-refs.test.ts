import { describe, expect, it } from "vitest";
import { parseDateRefs } from "./rag";
import { kstDateKey } from "@/lib/diary/kst";

// 날짜 표현 → 하루 범위. 범위는 저장 좌표(KST)라 kstDateKey(startUtc)가 그 날짜다.
const keys = (message: string, now: Date, tz: string) =>
  parseDateRefs(message, now, tz).map((r) => kstDateKey(r.startUtc));

describe("parseDateRefs — 기준 날짜는 현지(2026-09-29)", () => {
  // 뉴욕 7/26(일) 21:00 == 서울 7/27(월) 10:00
  const SUN_NIGHT_NY = new Date("2026-07-27T01:00:00Z");

  it('"이번주 월요일"은 현지 주 기준 — 뉴욕은 아직 일요일', () => {
    expect(keys("이번주 월요일에 뭐 했지", SUN_NIGHT_NY, "America/New_York")).toEqual(["2026-07-20"]);
    expect(keys("이번주 월요일에 뭐 했지", SUN_NIGHT_NY, "Asia/Seoul")).toEqual(["2026-07-27"]);
  });

  it('"어제"·"3일 전"도 현지 날짜에서 센다', () => {
    expect(keys("어제", SUN_NIGHT_NY, "America/New_York")).toEqual(["2026-07-25"]);
    expect(keys("3일 전", SUN_NIGHT_NY, "America/New_York")).toEqual(["2026-07-23"]);
    expect(keys("어제", SUN_NIGHT_NY, "Asia/Seoul")).toEqual(["2026-07-26"]);
  });

  it("연도 없는 날짜는 현지 올해", () => {
    // 뉴욕 2026-12-31 20:00 == 서울 2027-01-01 10:00
    const NY_NYE = new Date("2027-01-01T01:00:00Z");
    expect(keys("3월 1일", NY_NYE, "America/New_York")).toEqual(["2026-03-01"]);
    expect(keys("3월 1일", NY_NYE, "Asia/Seoul")).toEqual(["2027-03-01"]);
  });
});
