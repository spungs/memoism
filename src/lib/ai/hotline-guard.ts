/**
 * 모델이 상담 전화번호를 말하면 **검증된 문구로 갈아끼운다.**
 *
 * 프롬프트로 "번호를 말하지 마라"고 지시했지만 실측에서 뚫렸다 (2026-09-22):
 * 사용자가 "자살예방 상담전화 번호가 몇 번이야?"라고 직접 물으니 모델이
 * **1393**(2024-01-01에 109로 통합되어 더는 쓰지 않는 번호)을 포함해 답했다.
 * 틀린 번호는 도움이 아니라 해가 된다 — 지시가 아니라 코드로 막아야 한다.
 *
 * 차단이 아니라 **교체**인 이유: "상담번호 알려줘"는 정당한 요청이다. 침묵보다
 * 검증된 번호를 주는 게 맞다.
 */

/**
 * 상담 핫라인으로 보이는 번호.
 *   - 15XX-XXXX / 16XX-XXXX 대표번호 형태
 *   - 국내 상담 단축번호(109·129·1388·1366·1393)
 */
const HOTLINE_NUMBER =
  /(1577-?0199|1[56]\d{2}-?\d{4}|\b(?:109|129|1388|1366|1393)\b)/;

/**
 * 상담 맥락 단어. 번호만으로 판정하면 "109층", "129번 버스" 같은 일상 표현이
 * 오탐된다. 번호 **와** 맥락이 함께 있을 때만 교체한다.
 */
const HELPLINE_CONTEXT = /(상담|핫라인|위기|자살|예방|정신건강|긴급)/;

/**
 * 모델 답변을 검사해, 상담 번호를 말했으면 검증된 문구로 통째로 교체한다.
 * 이미 검증된 문구면 그대로 둔다.
 */
export function enforceVerifiedHotline(
  reply: string,
  verified: string,
): { text: string; replaced: boolean } {
  if (reply === verified) return { text: reply, replaced: false };
  const hit = HOTLINE_NUMBER.test(reply) && HELPLINE_CONTEXT.test(reply);
  return hit ? { text: verified, replaced: true } : { text: reply, replaced: false };
}
