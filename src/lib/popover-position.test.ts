import { describe, expect, it } from "vitest";
import { popoverShiftX } from "./popover-position";

describe("popoverShiftX — 팝오버를 화면 좌우 여백 안으로 당긴다", () => {
  // 실측: 폭 430 화면에서 조각의 날짜 버튼(오른쪽 정렬) 왼쪽 끝이 x=232 → 288px 팝오버가 520까지 나갔다.
  it("오른쪽으로 넘치면 넘친 만큼 왼쪽으로 옮긴다", () => {
    expect(popoverShiftX(232, 288, 430)).toBe(-106); // 232-106=126, 126+288=414=430-16
  });

  it("들어오면 그대로 둔다", () => {
    expect(popoverShiftX(24, 288, 430)).toBe(0);
  });

  it("왼쪽 여백보다 왼쪽에서 시작하면 오른쪽으로 옮긴다", () => {
    expect(popoverShiftX(4, 288, 430)).toBe(12);
  });

  it("화면이 팝오버보다 좁으면 왼쪽 여백에 맞춘다", () => {
    expect(popoverShiftX(100, 288, 300)).toBe(-84);
  });
});
