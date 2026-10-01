import { describe, expect, it } from "vitest";
import { organizeAllReply } from "./organize-all";

describe("organizeAllReply — 한번에 정리한 결과 말풍선", () => {
  it("다 정리했으면 날 수만 말한다", () => {
    expect(organizeAllReply(3, 0, 0)).toBe("3일 일기로 정리했어.");
  });

  it("사용 횟수를 다 써서 멈췄으면 남은 날을 알린다", () => {
    expect(organizeAllReply(2, 0, 1)).toBe(
      "2일 일기로 정리했어. 남은 1일은 오늘 사용 횟수를 다 써서 못 했어. 내일 다시 정리해줘.",
    );
  });

  it("문제가 생겨 못 한 날을 알린다", () => {
    expect(organizeAllReply(2, 1, 0)).toBe(
      "2일 일기로 정리했어. 1일은 정리하다가 문제가 생겨서 못 했어. 조금 뒤에 다시 해볼래?",
    );
  });

  it("둘 다 있으면 둘 다 알린다", () => {
    expect(organizeAllReply(1, 1, 2)).toBe(
      "1일 일기로 정리했어. 1일은 정리하다가 문제가 생겨서 못 했어. 남은 2일은 오늘 사용 횟수를 다 써서 못 했어. 내일 다시 정리해줘.",
    );
  });
});
