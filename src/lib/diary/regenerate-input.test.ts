import { describe, expect, it } from "vitest";
import {
  pickRegenerateText,
  pickRegeneratedTitle,
} from "./regenerate-input";

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

describe("pickRegeneratedTitle", () => {
  it("제목을 고쳤으면 그 제목을 지킨다 (AI가 덮어쓰지 않는다)", () => {
    expect(pickRegeneratedTitle("병원 다녀온 날", "공원 산책", "AI가 지은 제목")).toBe(
      "병원 다녀온 날",
    );
  });

  it("제목을 안 고쳤으면 AI가 새로 지은 제목을 쓴다 (기존 동작)", () => {
    expect(pickRegeneratedTitle("공원 산책", "공원 산책", "AI가 지은 제목")).toBe(
      "AI가 지은 제목",
    );
  });

  it("앞뒤 공백 차이는 '고쳤다'로 보지 않는다", () => {
    expect(pickRegeneratedTitle("  공원 산책  ", "공원 산책", "AI가 지은 제목")).toBe(
      "AI가 지은 제목",
    );
  });

  it("클라이언트가 제목을 안 보내면(구 클라이언트) AI 제목", () => {
    expect(pickRegeneratedTitle(undefined, "공원 산책", "AI가 지은 제목")).toBe(
      "AI가 지은 제목",
    );
  });

  it("제목을 비웠으면 AI 제목 (title은 not null이라 빈 값을 쓸 수 없다)", () => {
    expect(pickRegeneratedTitle("   ", "공원 산책", "AI가 지은 제목")).toBe(
      "AI가 지은 제목",
    );
  });
});
