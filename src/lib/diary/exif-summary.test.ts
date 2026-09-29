import { describe, expect, it } from "vitest";
import { buildExifSummary } from "./exif-summary";

describe("buildExifSummary — 촬영 시각은 현지 시간대(2026-09-29)", () => {
  // 뉴욕 7/23 21:05 == 서울 7/24 10:05
  const item = { takenAt: "2026-07-24T01:05:00Z", lat: 40.7128, lng: -74.006 };

  it("뉴욕에서 찍은 저녁 사진은 뉴욕 저녁으로 알려준다", () => {
    // 한국 시각으로 넘기면 모델이 "오전 10시"로 읽어 저녁 일을 아침으로 쓴다.
    expect(buildExifSummary([item], "America/New_York")).toBe(
      "사진1 — 시간 2026-07-23 21:05, 위치 40.7128,-74.0060",
    );
  });

  it("서울이면 서울 시각", () => {
    expect(buildExifSummary([item], "Asia/Seoul")).toBe(
      "사진1 — 시간 2026-07-24 10:05, 위치 40.7128,-74.0060",
    );
  });

  it("시각·위치가 하나도 없으면 undefined", () => {
    expect(buildExifSummary([{ takenAt: null, lat: null, lng: null }], "Asia/Seoul")).toBeUndefined();
  });
});
