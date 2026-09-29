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

  it("밤 21~23시엔 아직 같은 날이라 오늘로 보낸다", () => {
    // 22:00·23:59 KST(7/23)에 24시간을 빼면 7/22가 된다 — 자정 전 기록이 전날로
    // 가던 버그(2026-09-29 점검 H1). "자정을 넘겨도 오늘"은 자정 **이후**에만 뜻이 있다.
    for (const utc of ["2026-07-23T13:00:00Z", "2026-07-23T14:59:00Z"]) {
      expect(resolveCaptureDate("국수 먹었어", new Date(utc))).toEqual({
        kind: "resolved",
        dateKey: "2026-07-23",
        label: "오늘",
        fromExplicit: false,
      });
    }
  });

  it("새벽 3:59까지는 직전 하루, 4:00부터는 오늘", () => {
    // KST 7/24 03:59 == UTC 7/23 18:59, KST 7/24 04:00 == UTC 7/23 19:00
    const r1 = resolveCaptureDate("국수 먹었어", new Date("2026-07-23T18:59:00Z"));
    const r2 = resolveCaptureDate("국수 먹었어", new Date("2026-07-23T19:00:00Z"));
    expect(r1.kind === "resolved" && [r1.dateKey, r1.label]).toEqual(["2026-07-23", "어제"]);
    expect(r2.kind === "resolved" && [r2.dateKey, r2.label]).toEqual(["2026-07-24", "오늘"]);
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
