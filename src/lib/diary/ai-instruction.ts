/**
 * 재정리 방향 지시문 — 프리셋 칩 + 자유 입력을 한 문자열로 합친다.
 *
 * 베타 피드백: 재정리는 "결과가 맘에 안 들어서" 누르는 것인데 방향을 제시할
 * 수단이 없어 다시 굴려도 비슷한 결과가 나왔다.
 *
 * "use client" 컴포넌트와 서버 라우트 양쪽에서 import하므로 지시어를 붙이지 않는다.
 */

/**
 * 프리셋 칩. label은 화면에 보이는 짧은 말, directive는 모델에게 실제로 보내는 문장.
 *
 * 둘을 나눈 이유: "더 짧게"만 보내면 모델이 문장을 살짝 다듬는 정도로 해석해
 * 분량이 그대로였다 (실측 206자 -> 208자). 원하는 결과를 구체적인 지시로 적어야 먹는다.
 */
export const AI_INSTRUCTION_PRESET_ITEMS = [
  { label: "더 짧게", directive: "전체 분량을 지금의 절반 정도로 줄여라" },
  {
    label: "더 자세히",
    directive: "각 장면을 조금 더 풀어 써서 분량을 늘려라 (없는 사실은 추가하지 마라)",
  },
  {
    label: "사실 위주로",
    directive: "감상·평가하는 문장을 덜어내고 일어난 일 위주로 적어라",
  },
  {
    label: "감정을 더 담아",
    directive: "이미 적힌 감정을 조금 더 드러내 표현하라 (없던 감정은 지어내지 마라)",
  },
  { label: "시간 순서대로", directive: "일어난 순서대로 시간 흐름에 맞춰 재배열하라" },
] as const;

/** 칩 라벨. 순서가 곧 화면 표시 순서다. */
export const AI_INSTRUCTION_PRESETS = AI_INSTRUCTION_PRESET_ITEMS.map(
  (p) => p.label,
);

/** 라벨 -> 모델에게 보낼 지시문. 라벨이 아니면 그대로 통과(자유 입력). */
function toDirective(label: string): string {
  return (
    AI_INSTRUCTION_PRESET_ITEMS.find((p) => p.label === label)?.directive ??
    label
  );
}

/**
 * 지시문 상한 (칩 directive 5개 + 자유 입력 합산). 서버도 같은 값으로 검증한다.
 * 칩 전체 선택 시 directive 합이 약 160자라 자유 입력 100자를 더해도 넉넉하다.
 */
export const MAX_AI_INSTRUCTION_LENGTH = 400;

/** 자유 입력 칸의 maxLength. 칩까지 합쳐도 상한에 걸리지 않는 여유값. */
export const MAX_AI_INSTRUCTION_FREE_TEXT_LENGTH = 100;

/**
 * 선택한 칩(라벨)을 모델용 지시문으로 바꾸고 자유 입력과 합친다.
 *
 * @returns 합쳐진 지시문. 아무 입력도 없으면 "" (호출자는 지시 없이 재정리).
 */
export function buildInstruction(chips: string[], freeText: string): string {
  return [...chips.map(toDirective), freeText.trim()]
    .filter(Boolean)
    .join(". ")
    .slice(0, MAX_AI_INSTRUCTION_LENGTH);
}
