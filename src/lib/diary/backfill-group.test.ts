import { describe, expect, it } from "vitest";
import { groupPhotosByExifDate } from "./backfill-group";

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
