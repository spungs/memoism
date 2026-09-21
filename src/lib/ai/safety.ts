import { hasCrisisKeyword } from "./crisis-keywords";
import { confirmCrisis } from "./crisis-confirm";

/**
 * 안전 프리필터 — 사용자 입력이 Gemini에 닿기 전 통과하는 관문 (스펙 §8).
 *
 * 체크포인트는 두 곳이다:
 *   - `app/api/chat/route.ts`            (채팅)
 *   - `lib/ai/gemini.ts`의 generateDiary (일기 4경로: auto-generate·regenerate·
 *                                          preview-regenerate·organize)
 *
 * **`chat()` 안에는 두지 않는다.** 2단 판정이 `chat()`을 부르기 때문에, 거기 두면
 * 펜스가 자기 자신을 다시 부른다.
 */

export type SafetyVerdict =
  | { blocked: false }
  | { blocked: true; kind: "crisis"; reply: string; stage: "model" };

/**
 * AI 생성 경로에서 펜스가 걸렸을 때 던진다.
 * 호출자가 잡아 "저장은 유지, AI만 건너뜀"으로 처리한다. 안 잡아도 AI 호출은 막힌다.
 */
export class SafetyBlockedError extends Error {
  readonly reply: string;
  constructor(reply: string) {
    super("safety_blocked");
    this.name = "SafetyBlockedError";
    this.reply = reply;
  }
}

/**
 * 위기 응답 — **코드 상수다.** 모델에게 생성시키면 매번 달라져 검증할 수 없다.
 *
 * 조언·진단·"괜찮아질 거야" 금지 — 메이는 상담사가 아니다.
 *
 * **번호·운영시간 변경 금지.** 2026-09-22에 공식 출처 3곳을 교차 확인했다:
 *   1. 보건복지부 보건복지상담센터  https://www.129.go.kr/109
 *   2. 보건복지부 정신건강정책      https://www.mohw.go.kr/menu.es?mid=a10706040100
 *   3. 보건복지부 보도자료(2026-05) 109 상담인력 103→200명 확충 — 현재 운영 확실
 *
 *   - 109        자살예방상담. 24시간, 무료.
 *                **2024-01-01부로 분산돼 있던 자살예방 상담전화가 109로 통합**(옛 1393 흡수).
 *   - 1577-0199  정신건강상담. 365일 24시간, 무료. 통합 후에도 담당 분야로 계속 운영하며
 *                자살위기 상담도 포함한다.
 *
 * 129(보건복지상담센터 일반)·1388(청소년)·1366(여성)은 담당이 따로 있어 이 자리에
 * 넣지 않는다. 실제로 펜스가 죽어 있던 동안 모델이 129·1388을 지어내 답했다 —
 * 그래서 이 문구가 상수이고, 프롬프트에서도 **모델의 번호 언급을 금지**한다
 * (chat/route.ts의 "전화번호는 절대 만들어내지 않기", capture.ts의 REPLY_SYSTEM).
 *
 * 바꾸려면 위 출처를 다시 확인하고, safety.test.ts의 회귀 테스트도 함께 고칠 것.
 */
export const CRISIS_REPLY = `지금 많이 힘든 것 같아서 그냥 지나칠 수가 없었어.
나는 네 얘기를 듣고 기억하는 친구지, 이런 걸 도와줄 수 있는 사람은 아니야.

혼자 견디지 말고 꼭 연락해봐. 24시간 열려 있고 무료야.
☎ 109 (자살예방 상담)
☎ 1577-0199 (정신건강 상담)

나는 여기 있을게.`;

/**
 * 진입점. 1단(키워드) → 걸리면 2단(모델).
 *
 * **판정 불능은 통과다**(`confirmCrisis`가 `null`). 이 펜스가 막는 것은 AI의
 * 부적절한 반응이지 사용자의 기록이 아니다. 판정 불능에 차단하면 Gemini 장애가
 * 곧 앱 마비가 된다. 1단은 재현율 우선이라 단독 차단도 하지 않는다(스펙 §9).
 */
export async function screenUserText(text: string): Promise<SafetyVerdict> {
  if (!hasCrisisKeyword(text)) return { blocked: false };

  // true일 때만 막는다 — false(위기 아님)도 null(판정 불능)도 통과.
  if ((await confirmCrisis(text)) !== true) return { blocked: false };

  return { blocked: true, kind: "crisis", reply: CRISIS_REPLY, stage: "model" };
}
