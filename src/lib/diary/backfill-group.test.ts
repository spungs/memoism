import { describe, expect, it } from "vitest";
import { backfillLimitsFor, groupPhotosByExifDate } from "./backfill-group";

const TODAY = "2026-09-22";
const at = (iso: string | null) => ({ takenAt: iso });

describe("groupPhotosByExifDate", () => {
  it("같은 날 사진을 한 묶음으로 모은다", () => {
    const r = groupPhotosByExifDate(
      [at("2026-09-20T01:00:00Z"), at("2026-09-20T09:00:00Z")],
      TODAY,
    );
    expect(r).toEqual([{ dateKey: "2026-09-20", photoIndexes: [0, 1] }]);
  });

  it("KST 기준으로 날짜를 정한다", () => {
    // 2026-09-19T16:00:00Z = KST 2026-09-20 01:00
    const r = groupPhotosByExifDate([at("2026-09-19T16:00:00Z")], TODAY);
    expect(r[0].dateKey).toBe("2026-09-20");
  });

  it("최근 날짜가 먼저 온다", () => {
    const r = groupPhotosByExifDate(
      [at("2026-09-18T01:00:00Z"), at("2026-09-20T01:00:00Z")],
      TODAY,
    );
    expect(r.map((g) => g.dateKey)).toEqual(["2026-09-20", "2026-09-18"]);
  });

  it("EXIF 없는 사진은 null 묶음으로, 맨 뒤에 둔다", () => {
    const r = groupPhotosByExifDate(
      [at(null), at("2026-09-20T01:00:00Z")],
      TODAY,
    );
    expect(r.map((g) => g.dateKey)).toEqual(["2026-09-20", null]);
    expect(r[1].photoIndexes).toEqual([0]);
  });

  it("미래 날짜는 EXIF 손상으로 보고 null 묶음에 넣는다", () => {
    const r = groupPhotosByExifDate([at("2027-01-01T00:00:00Z")], TODAY);
    expect(r).toEqual([{ dateKey: null, photoIndexes: [0] }]);
  });

  it("오늘 찍은 사진은 오늘 묶음으로 남긴다 — 미래가 아니다", () => {
    const r = groupPhotosByExifDate([at("2026-09-22T01:00:00Z")], TODAY);
    expect(r[0].dateKey).toBe("2026-09-22");
  });

  it("파싱 불가능한 문자열도 null 묶음", () => {
    const r = groupPhotosByExifDate([at("어제쯤?")], TODAY);
    expect(r[0].dateKey).toBeNull();
  });

  it("빈 입력은 빈 결과", () => {
    expect(groupPhotosByExifDate([], TODAY)).toEqual([]);
  });
});

describe("backfillLimitsFor", () => {
  it("PRO는 BASIC보다 많이 채울 수 있다", () => {
    const basic = backfillLimitsFor("BASIC");
    const pro = backfillLimitsFor("PRO");
    expect(pro.maxPhotos).toBeGreaterThan(basic.maxPhotos);
    expect(pro.maxDays).toBeGreaterThan(basic.maxDays);
  });

  it("BASIC 한도는 기존 값을 유지한다", () => {
    expect(backfillLimitsFor("BASIC")).toEqual({ maxPhotos: 30, maxDays: 14 });
  });

  it("PRO 날짜 한도는 하루 AI 캡(100회) 안에 들어간다", () => {
    // 날짜 하나당 insight 1회를 쓴다. 한도가 캡을 넘으면 사용자는 절대 끝낼 수 없다.
    expect(backfillLimitsFor("PRO").maxDays).toBeLessThanOrEqual(100);
  });

  it("FREE는 만료 강등 사용자라 BASIC과 같게 둔다", () => {
    expect(backfillLimitsFor("FREE")).toEqual(backfillLimitsFor("BASIC"));
  });
});
