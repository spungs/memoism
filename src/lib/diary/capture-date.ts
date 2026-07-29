import { parseDateRefs } from "@/lib/ai/rag";
import { kstDateKey } from "./kst";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 캡처 대상 날짜 판정 결과. ambiguous면 저장하지 않고 사용자에게 되묻는다. */
export type CaptureDate =
  | { kind: "resolved"; dateKey: string; label: string }
  | { kind: "ambiguous"; question: string };

/** KST 기준 시(0~23). */
function kstHour(now: Date): number {
  return new Date(now.getTime() + KST_OFFSET_MS).getUTCHours();
}

/**
 * record 메시지가 어느 날 일기로 갈지 결정한다 (스펙 §4).
 *   1. 명시적 시간표현이 정확히 하나 → 그 날짜
 *   2. 여러 개 → 되묻기 (범위가 넓어 잘못 넣으면 교정 비용이 크다)
 *   3. 표현 없음 + 심야(21~4시) → **직전 하루** (자기 전 몰아 기록이 자정을 넘겨도 "오늘")
 *   4. 표현 없음 + 그 외 → 오늘(KST)
 *
 * 되묻기는 아껴 쓴다 — 명확하면 묻지 않고 바로 라우팅한다(스펙 §4 "남발 금지").
 */
export function resolveCaptureDate(message: string, now: Date): CaptureDate {
  const refs = parseDateRefs(message, now);

  if (refs.length === 1) {
    return {
      kind: "resolved",
      dateKey: kstDateKey(refs[0].startUtc),
      label: refs[0].label,
    };
  }

  if (refs.length > 1) {
    const labels = refs.map((r) => r.label).join(", ");
    return {
      kind: "ambiguous",
      question: `${labels} 중에 언제 얘기예요? 🙂`,
    };
  }

  const hour = kstHour(now);
  const isNight = hour >= 21 || hour < 4;
  if (isNight) {
    return {
      kind: "resolved",
      dateKey: kstDateKey(new Date(now.getTime() - DAY_MS)),
      label: "어제",
    };
  }

  return { kind: "resolved", dateKey: kstDateKey(now), label: "오늘" };
}
