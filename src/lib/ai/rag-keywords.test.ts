import { describe, expect, it } from "vitest";
import { composeRecallContent, extractKeywords } from "./rag";

/**
 * 키워드 추출 회귀 방지.
 *
 * "가장 처음 쓴 일기는?"에서 ["가장","처음","일기"]가 뽑혀, 본문에 그 단어가 있는
 * 무관한 일기가 관련 칩으로 붙었다(2026-09-23: 7월 19일 삼척 ← "처음",
 * 9월 21일 영어학원 ← "일기"). 키워드 경로는 matchedByKeyword라서 모델이 근거를
 * 표시하지 않아도 fallback으로 칩이 뜬다 — 즉 이 단계에서 걸러야 한다.
 *
 * 빈도 문제가 아니다("일기"는 51건 중 1건뿐이었다). 질문에서 **무엇을 묻는지**를
 * 가리키는 말이지 일기의 주제가 아니라서 걸러야 한다.
 */
describe("extractKeywords", () => {
  it("메타 질문에서는 검색 키워드를 뽑지 않는다", () => {
    expect(extractKeywords("가장 처음 쓴 일기는?")).toEqual([]);
    expect(extractKeywords("일기 몇 개 썼어?")).toEqual([]);
    expect(extractKeywords("가장 최근 기록이 뭐야?")).toEqual([]);
    expect(extractKeywords("제일 마지막에 쓴 내용")).toEqual([]);
  });

  it("고유명사는 그대로 남긴다 — 이게 키워드 경로의 존재 이유다", () => {
    expect(extractKeywords("물무산 갔던 날")).toContain("물무산");
    expect(extractKeywords("성수동에서 뭐 했지?")).toContain("성수동");
    expect(extractKeywords("동묘 피자 얘기")).toContain("동묘");
  });

  it("조사를 떼어 어간으로 맞춘다", () => {
    expect(extractKeywords("물무산은 어땠어")).toContain("물무산");
    expect(extractKeywords("서울숲에서 놀았어")).toContain("서울숲");
  });

  it("일반 명사는 남긴다 — 불용어는 메타어에 한정한다", () => {
    // 과잉 차단 방지: 일상 명사까지 막으면 키워드 검색이 죽는다.
    expect(extractKeywords("요가 수련")).toContain("요가");
    expect(extractKeywords("피자 먹은 날")).toContain("피자");
  });
});

describe("composeRecallContent — 정리 안 한 조각을 회상 본문에 붙인다 (점검 M1)", () => {
  it("본문이 빈 날은 조각만으로 본문을 만든다", () => {
    expect(composeRecallContent("", ["성수동 카페 갔어"])).toBe("[아직 일기로 정리 안 한 메모] 성수동 카페 갔어");
  });
  it("본문이 있으면 뒤에 붙인다", () => {
    expect(composeRecallContent("아침 산책", ["점심은 국수", " "])).toBe(
      "아침 산책\n[아직 일기로 정리 안 한 메모] 점심은 국수",
    );
  });
  it("조각이 없으면 본문 그대로", () => {
    expect(composeRecallContent("아침 산책", [])).toBe("아침 산책");
  });
});

describe("composeRecallContent — 길이로 자르지 않는다", () => {
  it("메모가 길어도 마지막(가장 최근) 조각까지 남긴다", () => {
    const out = composeRecallContent("", ["가".repeat(3000), "방금 남긴 말"]);
    expect(out.endsWith("방금 남긴 말")).toBe(true);
    expect(out).not.toContain("…");
  });
});
