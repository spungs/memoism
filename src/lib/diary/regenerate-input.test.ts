import { describe, expect, it } from "vitest";
import { pickRegenerateText } from "./regenerate-input";

const AI = "AI가 쓴 첫 결과. 공원을 걸었다.";

describe("pickRegenerateText", () => {
  it("본문을 고쳤으면 고친 본문을 쓴다 (원래 버그)", () => {
    expect(
      pickRegenerateText({
        edited: "오늘은 병원에 갔다.",
        lastAiContent: AI,
        originalText: "산책 감",
        hasInstruction: false,
        hasPhotos: true,
      }),
    ).toBe("오늘은 병원에 갔다.");
  });

  it("안 고쳤고 지시도 없으면 최초 입력으로 되돌린다 (진짜 새 시도)", () => {
    expect(
      pickRegenerateText({
        edited: AI,
        lastAiContent: AI,
        originalText: "산책 감",
        hasInstruction: false,
        hasPhotos: true,
      }),
    ).toBe("산책 감");
  });

  it("사진만 올렸으면(최초 입력 없음) 빈 문자열 -> 서버가 mode A로 새로 생성", () => {
    expect(
      pickRegenerateText({
        edited: AI,
        lastAiContent: AI,
        originalText: undefined,
        hasInstruction: false,
        hasPhotos: true,
      }),
    ).toBe("");
  });

  it("안 고쳤어도 지시가 있으면 화면의 본문에 적용한다", () => {
    // "더 짧게"는 지금 보고 있는 이 결과를 줄여달라는 뜻이다.
    expect(
      pickRegenerateText({
        edited: AI,
        lastAiContent: AI,
        originalText: "산책 감",
        hasInstruction: true,
        hasPhotos: true,
      }),
    ).toBe(AI);
  });

  it("사진만 올렸다가 그 사진을 다 지웠으면 화면의 글을 쓴다 (400 회피)", () => {
    // 최초 입력으로 되돌리면 텍스트도 사진도 없어 서버가 400을 준다.
    // 화면에는 글이 보이는데 "정리할 내용이 없어요"는 혼란스럽다.
    expect(
      pickRegenerateText({
        edited: AI,
        lastAiContent: AI,
        originalText: undefined,
        hasInstruction: false,
        hasPhotos: false,
      }),
    ).toBe(AI);
  });

  it("앞뒤 공백 차이는 '고쳤다'로 보지 않는다", () => {
    expect(
      pickRegenerateText({
        edited: `  ${AI}  `,
        lastAiContent: AI,
        originalText: "산책 감",
        hasInstruction: false,
        hasPhotos: true,
      }),
    ).toBe("산책 감");
  });
});
