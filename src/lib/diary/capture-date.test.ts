import { describe, it, expect } from "vitest";
import { resolveCaptureDate, resolvePhotoDates } from "./capture-date";

// KST 2026-07-23 14:00 == UTC 05:00
const DAYTIME = new Date("2026-07-23T05:00:00Z");
// KST 2026-07-24 01:00 == UTC 2026-07-23T16:00 (심야)
const LATE_NIGHT = new Date("2026-07-23T16:00:00Z");

describe("resolveCaptureDate", () => {
  it("날짜 표현이 없으면 오늘(KST)", () => {
    const r = resolveCaptureDate("점심에 국수 먹었어", DAYTIME);
    expect(r).toEqual({
      kind: "resolved",
      dateKey: "2026-07-23",
      label: "오늘",
      fromExplicit: false,
    });
  });

  it("명시적 표현이 있으면 그 날짜", () => {
    const r = resolveCaptureDate("어제 국수 먹었어", DAYTIME);
    expect(r.kind).toBe("resolved");
    if (r.kind === "resolved") expect(r.dateKey).toBe("2026-07-22");
  });

  it("심야(KST 01시)엔 표현 없는 기록을 직전 하루로 보낸다", () => {
    // KST로는 이미 7/24이지만, 자기 전 몰아 기록이므로 7/23로 간다.
    const r = resolveCaptureDate("국수 먹었어", LATE_NIGHT);
    expect(r).toEqual({
      kind: "resolved",
      dateKey: "2026-07-23",
      label: "어제",
      fromExplicit: false,
    });
  });

  it('심야라도 "오늘"이라고 쓰면 명시 표현이 이긴다(스펙 §4 규칙①>④)', () => {
    // 심야 보정은 "날짜 표현 없는" 기록에만 적용된다. "오늘"은 명시 표현이므로
    // KST 기준 오늘(7/24)로 간다. 이 동작이 바뀌면 사용자 기대와 어긋날 수 있어
    // 의도적으로 테스트로 고정해둔다.
    const r = resolveCaptureDate("오늘 힘들었다", LATE_NIGHT);
    expect(r.kind).toBe("resolved");
    if (r.kind === "resolved") expect(r.dateKey).toBe("2026-07-24");
  });

  it("심야여도 명시적 표현이 있으면 그 표현을 따른다", () => {
    const r = resolveCaptureDate("7월 20일에 산책했어", LATE_NIGHT);
    expect(r.kind).toBe("resolved");
    if (r.kind === "resolved") expect(r.dateKey).toBe("2026-07-20");
  });

  it("날짜 표현이 여러 개면 되묻는다", () => {
    const r = resolveCaptureDate("어제랑 그저께 뭐 했더라 국수 먹었지", DAYTIME);
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") expect(r.question.length).toBeGreaterThan(0);
  });

  it("명시적 표현이 있으면 fromExplicit=true", () => {
    const r = resolveCaptureDate("어제 갔던 데야", DAYTIME);
    expect(r.kind).toBe("resolved");
    if (r.kind === "resolved") {
      expect(r.dateKey).toBe("2026-07-22");
      expect(r.fromExplicit).toBe(true);
    }
  });

  it("표현이 없으면 fromExplicit=false", () => {
    const r = resolveCaptureDate("여기 좋더라", DAYTIME);
    expect(r.kind).toBe("resolved");
    if (r.kind === "resolved") expect(r.fromExplicit).toBe(false);
  });
});

describe("resolvePhotoDates", () => {
  const TODAY = "2026-07-23";

  it("사진마다 자기 EXIF 날짜로 간다 — 묶지 않는다", () => {
    expect(
      resolvePhotoDates(TODAY, false, ["2026-07-20", "2026-07-21"], TODAY),
    ).toEqual(["2026-07-20", "2026-07-21"]);
  });

  it("EXIF가 없는 사진은 메시지 날짜로", () => {
    expect(resolvePhotoDates(TODAY, false, ["2026-07-20", null], TODAY)).toEqual(
      ["2026-07-20", TODAY],
    );
  });

  it("미래 EXIF는 무시하고 메시지 날짜로", () => {
    expect(resolvePhotoDates(TODAY, false, ["2099-01-01"], TODAY)).toEqual([
      TODAY,
    ]);
  });

  it("명시적 표현이 있으면 EXIF를 무시하고 전부 그 날짜로", () => {
    // "어제 찍은 것들"이라고 말했으면 사용자 말이 이긴다.
    expect(
      resolvePhotoDates("2026-07-22", true, ["2026-07-20", "2026-07-21"], TODAY),
    ).toEqual(["2026-07-22", "2026-07-22"]);
  });
});
