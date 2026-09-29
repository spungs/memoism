import { describe, expect, it } from "vitest";
import { clientExifSchema, dateKeySchema } from "./schemas";

describe("clientExifSchema (점검 L2)", () => {
  it("ISO 촬영 시각·null은 받는다", () => {
    expect(clientExifSchema.safeParse({ takenAt: "2026-09-20T03:12:00.000Z", lat: 37.5, lng: 127 }).success).toBe(true);
    expect(clientExifSchema.safeParse({ takenAt: null, lat: null, lng: null }).success).toBe(true);
  });
  it("날짜로 파싱되지 않는 촬영 시각은 거절한다", () => {
    const r = clientExifSchema.safeParse({ takenAt: "hello", lat: null, lng: null });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("사진 촬영 시각 형식이 잘못됐어요");
  });
});

describe("dateKeySchema (점검 L6)", () => {
  it("없는 날짜는 거절한다", () => {
    expect(dateKeySchema.safeParse("2026-09-29").success).toBe(true);
    expect(dateKeySchema.safeParse("2026-02-31").success).toBe(false);
  });
});
