import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIME_ZONE,
  dateKeyInZone,
  formatHmInZone,
  hourInZone,
  normalizeTimeZone,
  shiftDateKey,
  todayKeyInZone,
  weekdayOfDateKey,
} from "./tz";

const NY = "America/New_York";
const AKL = "Pacific/Auckland";

describe("dateKeyInZone / hourInZone", () => {
  it("서울: UTC 15:30은 다음 날 00:30", () => {
    const d = new Date("2026-07-23T15:30:00Z");
    expect(dateKeyInZone(d, DEFAULT_TIME_ZONE)).toBe("2026-07-24");
    expect(hourInZone(d, DEFAULT_TIME_ZONE)).toBe(0);
  });

  it("뉴욕(여름, UTC−4): 한국은 이미 다음 날이어도 현지는 전날 밤", () => {
    // KST 7/24 10:00 == 뉴욕 7/23 21:00
    const d = new Date("2026-07-24T01:00:00Z");
    expect(dateKeyInZone(d, NY)).toBe("2026-07-23");
    expect(hourInZone(d, NY)).toBe(21);
  });

  it("뉴욕 서머타임 시작 경계(2026-03-08 02:00 → 03:00)", () => {
    expect(hourInZone(new Date("2026-03-08T06:59:00Z"), NY)).toBe(1);
    expect(hourInZone(new Date("2026-03-08T07:00:00Z"), NY)).toBe(3);
  });

  it("오클랜드(여름, UTC+13): 현지 날짜가 한국보다 하루 앞선다", () => {
    // 오클랜드 1/11 00:30 == KST 1/10 20:30
    const d = new Date("2026-01-10T11:30:00Z");
    expect(dateKeyInZone(d, AKL)).toBe("2026-01-11");
    expect(dateKeyInZone(d, DEFAULT_TIME_ZONE)).toBe("2026-01-10");
  });

  it("todayKeyInZone은 주어진 시각의 현지 날짜", () => {
    expect(todayKeyInZone(NY, new Date("2026-07-24T01:00:00Z"))).toBe("2026-07-23");
  });
});

describe("formatHmInZone", () => {
  it("현지 시:분", () => {
    expect(formatHmInZone(new Date("2026-07-24T01:05:00Z"), NY)).toBe("21:05");
    expect(formatHmInZone(new Date("2026-07-23T15:00:00Z"), DEFAULT_TIME_ZONE)).toBe("00:00");
  });
});

describe("shiftDateKey / weekdayOfDateKey", () => {
  it("달·윤년·연도 경계를 넘는다", () => {
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDateKey("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDateKey("2026-09-29", -7)).toBe("2026-09-22");
  });

  it("요일(0=일)", () => {
    expect(weekdayOfDateKey("2026-09-29")).toBe(2); // 화
    expect(weekdayOfDateKey("2026-09-27")).toBe(0); // 일
  });
});

describe("normalizeTimeZone", () => {
  it("유효한 IANA 이름은 그대로", () => {
    expect(normalizeTimeZone(NY)).toBe(NY);
  });

  it("없거나 잘못된 값은 서울", () => {
    expect(normalizeTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE);
    expect(normalizeTimeZone("")).toBe(DEFAULT_TIME_ZONE);
    expect(normalizeTimeZone("Not/AZone")).toBe(DEFAULT_TIME_ZONE);
    expect(normalizeTimeZone("x".repeat(200))).toBe(DEFAULT_TIME_ZONE);
  });
});
