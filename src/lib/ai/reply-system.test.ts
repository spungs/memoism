import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * 프롬프트 규칙 회귀 방지.
 *
 * 펜스가 안 걸리는 경로(2단 false·fail-open·기록 경로)에서는 모델이 그대로 답한다.
 * 그때 상담 번호를 지어내면 틀린 번호가 나간다 — 실제로 그런 적이 있다.
 * 프롬프트에서 번호 언급을 금지하는 문장이 사라지지 않게 잡아둔다.
 */
const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("번호 지어내기 금지 규칙", () => {
  it("채팅 시스템 프롬프트에 남아 있다", () => {
    const s = read("src/app/api/chat/route.ts");
    expect(s).toContain("전화번호는 절대 만들어내지 않기");
    expect(s).toContain("시스템이 따로 처리한다");
  });

  it("캡처 응답 프롬프트에 남아 있다", () => {
    const s = read("src/lib/ai/capture.ts");
    expect(s).toContain("상담전화·긴급전화 번호를 절대 말하지 마라");
  });
});

/**
 * 범위 질문(개수·기간·"가장 오래된 일기") 오답 회귀 방지.
 *
 * 프롬프트에 붙는 일기는 최근 5건 + 검색 5건뿐인데, 모델이 이 부분집합을 전체
 * 목록으로 읽고 "가장 오래된 일기는 X야"라고 단정했다. 사용자가 그 말을 믿고
 * 실제로 존재하던 2025년 일기를 지워 기록이 영구 손실된 사고가 있었다.
 * 집계 주입 + 범위 규칙이 프롬프트에서 사라지지 않게 잡아둔다.
 */
describe("일기 범위 질문 규칙", () => {
  it("전체 집계(개수·최초·최근)를 프롬프트에 주입한다", () => {
    const s = read("src/app/api/chat/route.ts");
    // 집계 쿼리 — 목록이 아니라 전체를 세고 온다
    expect(s).toContain("prisma.diary.aggregate");
    expect(s).toContain("_min: { createdAt: true }");
    expect(s).toContain("_max: { createdAt: true }");
    // 프롬프트에 들어가는 문구 (값은 템플릿으로 채워진다)
    expect(s).toContain("## 사용자의 일기 기록 전체 범위");
    expect(s).toContain("- 전체 일기 수: 총 ${scope.total}개");
    expect(s).toContain("- 가장 오래된(처음 쓴) 일기: ${oldestKey}");
    expect(s).toContain("- 가장 최근 일기: ${newestKey}");
    // KST 기준 날짜 표기
    expect(s).toContain("kstDateKey");
  });

  it("목록이 부분집합이라는 점과 범위 질문 규칙이 남아 있다", () => {
    const s = read("src/app/api/chat/route.ts");
    expect(s).toContain("아래 일기 목록은 **전체 일기가 아니야.**");
    expect(s).toContain("## 범위 질문은 목록이 아니라 집계로 답하기");
    // 집계로도 확정 못 하는 질문은 기록 탭으로 넘긴다
    expect(s).toContain("기록 탭에서 직접 보면");
  });

  it("사용자가 집계 범위 밖 기록을 말할 때의 규칙이 남아 있다", () => {
    const s = read("src/app/api/chat/route.ts");
    expect(s).toContain('## 사용자가 "그때 쓴 기록 있는데?"라고 할 때');
    expect(s).toContain("사용자의 기억을 부정하진 마");
    // 이번 사고의 핵심 — 확인 못 한 일기의 내용을 되묻지 않기
    expect(s).toContain("네가 확인하지 못한 기록의 내용을 되묻지 마");
  });

  it("기존 내용 환각 금지 규칙은 그대로 유지된다", () => {
    const s = read("src/app/api/chat/route.ts");
    expect(s).toContain("## 가장 중요한 규칙 — 일기에 있는 내용만 말하기");
    expect(s).toContain("단 하나도 추측하거나 지어내지 마");
    expect(s).toContain('이전에 "일기가 없다"고 했어도 위 목록에 있으면 그게 사실이야');
  });
});

describe("전문 영역 회피 규칙", () => {
  it("채팅 시스템 프롬프트에 남아 있다", () => {
    const s = read("src/app/api/chat/route.ts");
    expect(s).toContain("전문 영역은 넘기지 않기");
  });

  it("캡처 응답 프롬프트에 남아 있다", () => {
    const s = read("src/lib/ai/capture.ts");
    expect(s).toContain("의료·법률·금융 판단 금지");
  });
});
