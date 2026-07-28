import { describe, it, expect } from "vitest";
import { checkAndIncrement, limitFor } from "./usage";

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

describe("checkAndIncrement — capture 경로", () => {
  // capture는 DB를 건드리지 않고 즉시 통과해야 한다.
  // 이 테스트는 DB 연결 없이 도는 vitest 환경에서 그대로 통과해야 하며,
  // 그 자체가 "prisma에 닿지 않았다"는 증거다.
  it("capture는 DB 없이 즉시 통과하고 remaining=null", async () => {
    const r = await checkAndIncrement(
      "00000000-0000-0000-0000-000000000000",
      "NONE",
      "FREE",
      "capture",
    );
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBeNull();
    expect(r.tier).toBe("FREE");
  });

  it("만료 사용자도 capture는 통과한다(캡처는 티어 무관 무제한)", async () => {
    const r = await checkAndIncrement(
      "00000000-0000-0000-0000-000000000000",
      "EXPIRED",
      "PRO",
      "capture",
    );
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBeNull();
    // 만료라 실효 티어는 FREE로 강등되지만, capture는 어차피 무제한이다.
    expect(r.tier).toBe("FREE");
  });
});
