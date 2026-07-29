/**
 * 안전 프리필터 — **모든 사용자 메시지가 여기를 먼저 통과한다** (스펙 §8, 우회구멍 없음).
 *
 * Plan 04에서는 **훅 포인트만** 만든다: 전부 통과시킨다.
 * Plan 06이 5개 펜스(위기 감지·전문영역 회피·그라운딩·캡처 응답 펜스·인젝션 저항)를
 * 이 함수 안에 채운다. 자리를 먼저 잡는 이유는, 나중에 끼워 넣으면 그 사이에 생긴
 * 분기들이 프리필터를 우회할 자리를 만들기 때문이다.
 *
 * 순수 함수로 유지한다 — 네트워크·DB 없이 호출부 어디서든 부를 수 있어야 우회가 안 생긴다.
 */
export type PrefilterResult =
  | { blocked: false }
  | { blocked: true; reply: string };

// Plan 06이 이 인자를 검사한다. 시그니처를 지금 고정해두면 06에서 호출부를 안 건드려도 된다.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function prefilterMessage(text: string): PrefilterResult {
  // Plan 06에서 채운다. 지금은 통과.
  return { blocked: false };
}
