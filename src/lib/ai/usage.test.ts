import { describe, it, expect } from "vitest";
import { limitFor } from "./usage";

describe("limitFor", () => {
  it("capture 경로는 티어와 무관하게 무제한(null)", () => {
    expect(limitFor("FREE", "capture")).toBeNull();
    expect(limitFor("BASIC", "capture")).toBeNull();
    expect(limitFor("PRO", "capture")).toBeNull();
  });

  it("insight 경로는 티어별 일일 한도", () => {
    expect(limitFor("FREE", "insight")).toBe(3);
    expect(limitFor("BASIC", "insight")).toBe(10);
    expect(limitFor("PRO", "insight")).toBe(100);
  });
});
