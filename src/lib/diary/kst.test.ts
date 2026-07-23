import { describe, it, expect } from "vitest";
import { kstDateKey } from "./kst";

describe("kstDateKey", () => {
  it("UTC 인스턴트를 KST 달력 날짜로 매핑한다", () => {
    // 2026-07-22T15:00:00Z == 2026-07-23T00:00:00+09:00
    expect(kstDateKey(new Date("2026-07-22T15:00:00Z"))).toBe("2026-07-23");
  });
});
