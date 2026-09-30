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

describe("parseDateRefs — 점 형식과 소수 구분 (점검 M2)", () => {
  const NOW = new Date("2026-09-29T03:00:00Z"); // 서울 9/29 12:00
  const k = (m: string) => keys(m, NOW, "Asia/Seoul");

  it("소수·단위는 날짜로 보지 않는다", () => {
    expect(k("2.5시간 걸었어")).toEqual([]);
    expect(k("1.5배 빨랐어")).toEqual([]);
    expect(k("2.5일 걸렸어")).toEqual([]);
    expect(k("3.5(km) 뛰었어")).toEqual([]);
    expect(k("2.5 시간 걸었어")).toEqual([]);
    expect(k("버전 1.2.3 올렸어")).toEqual([]);
    expect(k("112.5 나왔어")).toEqual([]);
  });

  it('"오늘 2.5시간"은 오늘 하나만 — 두 개로 잡혀 되묻지 않는다', () => {
    expect(k("오늘 2.5시간 걸었어")).toEqual(["2026-09-29"]);
  });

  it("점 형식 날짜는 계속 알아본다", () => {
    expect(k("6.8")).toEqual(["2026-06-08"]);
    expect(k("6.8에 뭐 했지")).toEqual(["2026-06-08"]);
    expect(k("9.20 성수동 갔던 날")).toEqual(["2026-09-20"]);
    expect(k("6.8. 한강")).toEqual(["2026-06-08"]);
    expect(k("6.8(토) 한강")).toEqual(["2026-06-08"]);
  });

  it("슬래시 형식은 그대로", () => {
    expect(k("6/8에 뭐 했지")).toEqual(["2026-06-08"]);
  });
});
