import { describe, it, expect } from "vitest";
import {
  composeDiaryEmbedText,
  composeEmbedTextFromFragments,
} from "./fragment-embed";

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

describe("composeEmbedTextFromFragments", () => {
  const d = (s: string) => new Date(s);
  it("text 조각만, 시간순, content 합성 (photo·null·blank 제외)", () => {
    const frags = [
      { kind: "text", content: "산책", createdAt: d("2026-07-23T02:00:00Z") },
      { kind: "photo", content: null, createdAt: d("2026-07-23T01:00:00Z") },
      { kind: "text", content: "국수", createdAt: d("2026-07-23T00:00:00Z") },
      { kind: "text", content: "  ", createdAt: d("2026-07-23T03:00:00Z") },
    ];
    expect(composeEmbedTextFromFragments("오늘", frags)).toBe("오늘\n국수\n산책");
  });
  it("prose·조각 모두 없으면 빈 문자열", () => {
    expect(composeEmbedTextFromFragments("", [])).toBe("");
  });
});
