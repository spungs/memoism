import { describe, expect, it } from "vitest";
import {
  formatFragmentAt,
  selectFragmentsForFold,
  toPromptFragments,
  type FoldCandidate,
} from "./fragment-fold";

function frag(id: string, content: string, iso: string): FoldCandidate {
  return { id, content, createdAt: new Date(iso) };
}

describe("formatFragmentAt", () => {
  it("UTC 시각을 KST 시:분으로 바꾼다", () => {
    // 2026-08-03T05:30:00Z = KST 14:30
    expect(formatFragmentAt(new Date("2026-08-03T05:30:00Z"))).toBe("14:30");
  });

  it("자정을 넘긴 KST 시각도 두 자리로 채운다", () => {
    // 2026-08-02T15:05:00Z = KST 다음날 00:05
    expect(formatFragmentAt(new Date("2026-08-02T15:05:00Z"))).toBe("00:05");
  });
});

describe("selectFragmentsForFold — 예산이 넉넉할 때", () => {
  it("전부 고르고 skipped는 0", () => {
    const list = [
      frag("a", "국수 먹음", "2026-08-03T03:00:00Z"),
      frag("b", "산책 다녀옴", "2026-08-03T09:00:00Z"),
    ];
    const r = selectFragmentsForFold(list, 100, 2000);
    expect(r.selected.map((f) => f.id)).toEqual(["a", "b"]);
    expect(r.skippedCount).toBe(0);
  });

  it("시간순(오름차순)으로 돌려준다", () => {
    const list = [
      frag("late", "저녁", "2026-08-03T11:00:00Z"),
      frag("early", "아침", "2026-08-03T00:00:00Z"),
    ];
    const r = selectFragmentsForFold(list, 0, 2000);
    expect(r.selected.map((f) => f.id)).toEqual(["early", "late"]);
  });
});

describe("selectFragmentsForFold — 예산이 모자랄 때", () => {
  it("가장 오래된 조각부터 제외한다", () => {
    // 각 조각 비용 = 7(시각+구분자) + content.length = 7 + 7 = 14
    // 예산 = 2000 - 1970 = 30 -> 두 개(28)는 들어가고 세 개(42)는 못 들어간다
    const list = [
      frag("oldest", "1234567", "2026-08-03T00:00:00Z"),
      frag("middle", "1234567", "2026-08-03T01:00:00Z"),
      frag("newest", "1234567", "2026-08-03T02:00:00Z"),
    ];
    const r = selectFragmentsForFold(list, 1970, 2000);
    expect(r.selected.map((f) => f.id)).toEqual(["middle", "newest"]);
    expect(r.skippedCount).toBe(1);
  });

  it("예산이 0 이하면 아무것도 못 고른다", () => {
    const list = [frag("a", "메모", "2026-08-03T00:00:00Z")];
    const r = selectFragmentsForFold(list, 2000, 2000);
    expect(r.selected).toEqual([]);
    expect(r.skippedCount).toBe(1);
  });

  it("조각이 없으면 빈 결과", () => {
    const r = selectFragmentsForFold([], 0, 2000);
    expect(r.selected).toEqual([]);
    expect(r.skippedCount).toBe(0);
  });
});

describe("toPromptFragments", () => {
  it("시각과 본문만 남긴다 — 날짜는 일기 단위라 중복", () => {
    const r = toPromptFragments([frag("a", "국수 먹음", "2026-08-03T05:30:00Z")]);
    expect(r).toEqual([{ at: "14:30", text: "국수 먹음" }]);
  });

  it("앞뒤 공백을 떼고 넘긴다", () => {
    const r = toPromptFragments([
      frag("a", "  띄어쓰기  ", "2026-08-03T05:30:00Z"),
    ]);
    expect(r[0].text).toBe("띄어쓰기");
  });
});
