import { describe, it, expect } from "vitest";
import { fragmentPreview } from "./fragment-preview";

describe("fragmentPreview", () => {
  it("조각이 없으면 빈 문자열", () => {
    expect(fragmentPreview([])).toBe("");
  });

  it("텍스트 조각 하나면 그 내용", () => {
    expect(fragmentPreview([{ kind: "text", content: "국수 먹었어" }])).toBe(
      "국수 먹었어",
    );
  });

  it("여러 개면 첫 조각 + 나머지 개수", () => {
    expect(
      fragmentPreview([
        { kind: "text", content: "국수 먹었어" },
        { kind: "text", content: "산책 다녀옴" },
        { kind: "text", content: "일찍 잤다" },
      ]),
    ).toBe("국수 먹었어 · 조각 2개 더");
  });

  it("보여줄 텍스트가 없으면 빈 문자열", () => {
    // 공백뿐인 조각은 카드에 아무것도 쓰지 않는다.
    expect(fragmentPreview([{ kind: "text", content: "   " }])).toBe("");
    expect(fragmentPreview([{ kind: "text", content: null }])).toBe("");
  });

  it("내용이 길면 잘라낸다", () => {
    const long = "가".repeat(80);
    const out = fragmentPreview([{ kind: "text", content: long }]);
    expect(out.length).toBeLessThanOrEqual(51); // 50자 + 말줄임표
    expect(out.endsWith("…")).toBe(true);
  });
});
