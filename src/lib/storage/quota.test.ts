import { describe, it, expect } from "vitest";
import { exceedsQuota, TIER_STORAGE_BYTES } from "./quota";

describe("exceedsQuota", () => {
  it("used+add가 limit 이하면 false", () => {
    expect(exceedsQuota(100, 50, 200)).toBe(false);
  });
  it("정확히 limit면 통과(false)", () => {
    expect(exceedsQuota(150, 50, 200)).toBe(false);
  });
  it("limit 초과면 true", () => {
    expect(exceedsQuota(150, 51, 200)).toBe(true);
  });
});

describe("TIER_STORAGE_BYTES", () => {
  it("FREE < BASIC < PRO 순 증가", () => {
    expect(TIER_STORAGE_BYTES.FREE).toBeLessThan(TIER_STORAGE_BYTES.BASIC);
    expect(TIER_STORAGE_BYTES.BASIC).toBeLessThan(TIER_STORAGE_BYTES.PRO);
  });
});
