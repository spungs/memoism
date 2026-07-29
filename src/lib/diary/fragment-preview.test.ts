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

  it("사진 조각만 있으면 사진 표시", () => {
    expect(fragmentPreview([{ kind: "photo", content: null }])).toBe("사진 1장");
  });

  it("공백뿐인 텍스트 조각을 사진으로 세지 않는다", () => {
    // 뺄셈으로 사진 수를 구하면 여기서 "사진 1장"이라고 거짓말한다.
    expect(fragmentPreview([{ kind: "text", content: "   " }])).toBe("");
  });

  it("텍스트와 사진이 섞이면 텍스트를 앞세우고 나머지를 센다", () => {
    expect(
      fragmentPreview([
        { kind: "text", content: "국수 먹었어" },
        { kind: "photo", content: null },
      ]),
    ).toBe("국수 먹었어 · 조각 1개 더");
  });

  it("내용이 길면 잘라낸다", () => {
    const long = "가".repeat(80);
    const out = fragmentPreview([{ kind: "text", content: long }]);
    expect(out.length).toBeLessThanOrEqual(51); // 50자 + 말줄임표
    expect(out.endsWith("…")).toBe(true);
  });
});
