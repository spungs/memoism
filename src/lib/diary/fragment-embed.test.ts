import { describe, it, expect } from "vitest";
import { composeDiaryEmbedText } from "./fragment-embed";

describe("composeDiaryEmbedText", () => {
  it("prose와 조각 텍스트를 줄바꿈으로 합친다", () => {
    expect(composeDiaryEmbedText("오늘 하루", ["국수 먹음", "산책"])).toBe(
      "오늘 하루\n국수 먹음\n산책",
    );
  });

  it("prose가 비면 조각만 합친다", () => {
    expect(composeDiaryEmbedText("", ["국수 먹음", "산책"])).toBe(
      "국수 먹음\n산책",
    );
  });

  it("빈 조각·공백은 제외한다", () => {
    expect(composeDiaryEmbedText("prose", ["", "  ", "산책"])).toBe(
      "prose\n산책",
    );
  });
});
