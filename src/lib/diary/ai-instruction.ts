/**
 * 재정리 방향 지시문 — 프리셋 칩 + 자유 입력을 한 문자열로 합친다.
 *
 * 베타 피드백: 재정리는 "결과가 맘에 안 들어서" 누르는 것인데 방향을 제시할
 * 수단이 없어 다시 굴려도 비슷한 결과가 나왔다.
 *
 * "use client" 컴포넌트와 서버 라우트 양쪽에서 import하므로 지시어를 붙이지 않는다.
 */

/** 칩 라벨. 순서가 곧 화면 표시 순서다. */
export const AI_INSTRUCTION_PRESETS = [
  "더 짧게",
  "더 자세히",
  "사실 위주로",
  "감정을 더 담아",
  "시간 순서대로",
] as const;

/** 지시문 상한 (칩 + 자유 입력 합산). 서버도 같은 값으로 검증한다. */
export const MAX_AI_INSTRUCTION_LENGTH = 200;

/** 자유 입력 칸의 maxLength. 칩까지 합쳐도 상한에 걸리지 않는 여유값. */
export const MAX_AI_INSTRUCTION_FREE_TEXT_LENGTH = 100;

/**
 * @returns 합쳐진 지시문. 아무 입력도 없으면 "" (호출자는 지시 없이 재정리).
 */
export function buildInstruction(chips: string[], freeText: string): string {
  return [...chips, freeText.trim()]
    .filter(Boolean)
    .join(", ")
    .slice(0, MAX_AI_INSTRUCTION_LENGTH);
}
