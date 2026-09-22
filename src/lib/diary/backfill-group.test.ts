import { describe, expect, it } from "vitest";
import {
  backfillLimitsFor,
  chunkBySize,
  groupPhotosByExifDate,
  selectGroupsWithinCap,
  UPLOAD_CHUNK_BYTES,
} from "./backfill-group";

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

  it("묶음 안에서 촬영시각 순으로 정렬한다", () => {
    // 파일 선택 순서는 시간순이 아니다(파일명 규칙·여러 앨범). 이 순서가 그대로
    // orderIndex가 되고 AI 입력 순서가 되므로, 섞이면 일기의 하루 흐름이 뒤집힌다.
    const r = groupPhotosByExifDate(
      [
        at("2026-09-20T09:00:00Z"), // 저녁
        at("2026-09-20T01:00:00Z"), // 아침
        at("2026-09-20T05:00:00Z"), // 낮
      ],
      TODAY,
    );
    expect(r[0].photoIndexes).toEqual([1, 2, 0]);
  });

  it("날짜 미상 묶음은 고른 순서를 유지한다 — 정렬할 시각이 없다", () => {
    const r = groupPhotosByExifDate([at(null), at("어제쯤?"), at(null)], TODAY);
    expect(r[0].photoIndexes).toEqual([0, 1, 2]);
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

describe("chunkBySize", () => {
  const MB = 1024 * 1024;

  it("한도 안이면 한 요청으로 보낸다", () => {
    expect(chunkBySize([MB, MB, MB], [0, 1, 2], 4 * MB)).toEqual([[0, 1, 2]]);
  });

  it("한도를 넘기 직전에 자른다", () => {
    // 2MB씩 3장, 한도 5MB → [0,1] 4MB, [2] 2MB
    expect(chunkBySize([2 * MB, 2 * MB, 2 * MB], [0, 1, 2], 5 * MB)).toEqual([
      [0, 1],
      [2],
    ]);
  });

  it("혼자서도 한도를 넘는 사진은 버리지 않고 제 몫의 요청으로 보낸다", () => {
    // 조용히 누락되면 사용자는 사진이 사라진 걸 나중에야 안다.
    const r = chunkBySize([10 * MB, MB], [0, 1], 4 * MB);
    expect(r).toEqual([[0], [1]]);
  });

  it("건너뛴 인덱스(선택 해제된 날)는 포함하지 않는다", () => {
    expect(chunkBySize([MB, MB, MB], [0, 2], 4 * MB)).toEqual([[0, 2]]);
  });

  it("빈 선택은 빈 배열", () => {
    expect(chunkBySize([MB], [], 4 * MB)).toEqual([]);
  });

  it("기본 한도는 Vercel 본문 상한(4.5MB) 아래다", () => {
    // 이 값을 넘기면 함수가 돌기도 전에 413으로 끊긴다.
    expect(UPLOAD_CHUNK_BYTES).toBeLessThan(4.5 * MB);
  });

  it("PRO 최대치(60장 × 1MB)도 전부 한도 안의 묶음으로 나뉜다", () => {
    const sizes = Array.from({ length: 60 }, () => MB);
    const chunks = chunkBySize(sizes, [...sizes.keys()]);
    expect(chunks.flat()).toHaveLength(60);
    for (const c of chunks) {
      const bytes = c.reduce((sum, i) => sum + sizes[i], 0);
      expect(bytes).toBeLessThanOrEqual(UPLOAD_CHUNK_BYTES);
    }
  });
});

describe("selectGroupsWithinCap", () => {
  const L = { maxPhotos: 10, maxDays: 3 };
  /** 최신순 묶음 만들기 — 인덱스 값 자체는 이 규칙과 무관하다. */
  const g = (dateKey: string, n: number) => ({
    dateKey,
    photoIndexes: Array.from({ length: n }, (_, i) => i),
  });

  it("한도 안이면 전부 담는다", () => {
    const r = selectGroupsWithinCap([g("2026-09-20", 4), g("2026-09-19", 3)], L);
    expect(r.kept).toHaveLength(2);
    expect(r.droppedPhotos).toBe(0);
    expect(r.reason).toBeNull();
  });

  it("사진 한도를 넘는 날짜는 반쪽으로 담지 않고 통째로 미룬다", () => {
    // 6 + 5 = 11 > 10 → 9/19 는 통째로 빠진다 (5장 중 4장만 담지 않는다)
    const r = selectGroupsWithinCap([g("2026-09-20", 6), g("2026-09-19", 5)], L);
    expect(r.kept.map((k) => k.dateKey)).toEqual(["2026-09-20"]);
    expect(r.droppedPhotos).toBe(5);
    expect(r.firstDroppedDate).toBe("2026-09-19");
    expect(r.reason).toBe("photos");
  });

  it("한 번 멈추면 뒤의 작은 날짜도 줍지 않는다", () => {
    // 9/18 은 1장이라 들어갈 수 있지만, 건너뛰면 "9/19는 빠지고 9/18은 들어감"이 된다.
    const r = selectGroupsWithinCap(
      [g("2026-09-20", 6), g("2026-09-19", 5), g("2026-09-18", 1)],
      L,
    );
    expect(r.kept.map((k) => k.dateKey)).toEqual(["2026-09-20"]);
    expect(r.firstDroppedDate).toBe("2026-09-19");
    expect(r.droppedPhotos).toBe(6);
  });

  it("날짜 한도에 먼저 걸리면 reason이 days", () => {
    const r = selectGroupsWithinCap(
      [g("2026-09-20", 1), g("2026-09-19", 1), g("2026-09-18", 1), g("2026-09-17", 1)],
      L,
    );
    expect(r.kept).toHaveLength(3);
    expect(r.reason).toBe("days");
    expect(r.firstDroppedDate).toBe("2026-09-17");
  });

  it("첫 날짜가 혼자 사진 한도를 넘으면 그 날만 잘라 담는다", () => {
    // 아무것도 안 담으면 사용자가 이 화면에서 할 수 있는 게 없어진다.
    const r = selectGroupsWithinCap([g("2026-09-20", 14)], L);
    expect(r.kept).toHaveLength(1);
    expect(r.kept[0].photoIndexes).toHaveLength(10);
    expect(r.truncatedDate).toBe("2026-09-20");
    expect(r.droppedPhotos).toBe(4);
  });

  it("잘라 담은 뒤의 날짜들도 전부 미뤄진다", () => {
    const r = selectGroupsWithinCap([g("2026-09-20", 14), g("2026-09-19", 2)], L);
    expect(r.truncatedDate).toBe("2026-09-20");
    expect(r.firstDroppedDate).toBe("2026-09-19");
    expect(r.droppedPhotos).toBe(6); // 4 + 2
  });

  it("빈 입력은 빈 선택", () => {
    const r = selectGroupsWithinCap([], L);
    expect(r.kept).toEqual([]);
    expect(r.droppedPhotos).toBe(0);
  });
});
