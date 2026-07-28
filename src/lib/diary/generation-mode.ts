import type { DiaryGenerationMode } from "@/lib/ai/gemini";

/**
 * AI 정리 mode 도출 — 최초 생성·재정리 공통 규칙.
 *
 * 재정리 경로가 자기만의 규칙을 갖던 것이 "사용자가 고친 본문이 무시되는" 버그의
 * 원인이었다:
 *   - regenerate.ts는 source 라벨("auto_a")로 mode를 정해 나중에 손으로 고친
 *     본문까지 버렸다.
 *   - preview-generate.ts는 클라이언트가 보낸 최초 mode를 믿고 mode A면 text를
 *     통째로 폐기했다.
 * mode는 *지금 실제로 가진 입력*으로만 판정한다. provenance(source)나 클라이언트가
 * 보낸 값으로 판정하지 마라.
 *
 * @returns 입력이 아무것도 없으면 null (호출자가 400으로 변환, AI 호출·차감 없음)
 */
export function deriveGenerationMode(
  hasText: boolean,
  hasPhotos: boolean,
): DiaryGenerationMode | null {
  if (hasText) return hasPhotos ? "C" : "B";
  return hasPhotos ? "A" : null;
}
