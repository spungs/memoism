import { parseDateRefs } from "@/lib/ai/rag";
import { hourInZone, shiftDateKey, todayKeyInZone } from "@/lib/tz";
import { kstDateKey } from "./kst";

/** 캡처 대상 날짜 판정 결과. ambiguous면 저장하지 않고 사용자에게 되묻는다. */
export type CaptureDate =
  | {
      kind: "resolved";
      dateKey: string;
      label: string;
      /** 메시지에 명시적 날짜 표현이 있었나. true면 사진 EXIF보다 우선한다. */
      fromExplicit: boolean;
    }
  | { kind: "ambiguous"; question: string };

/**
 * record 메시지가 어느 날 일기로 갈지 결정한다 (스펙 §4).
 *   1. 명시적 시간표현이 정확히 하나 → 그 날짜
 *   2. 여러 개 → 되묻기 (범위가 넓어 잘못 넣으면 교정 비용이 크다)
 *   3. 표현 없음 + 자정 넘은 새벽(0~4시) → **직전 하루** (자기 전 몰아 기록이 자정을 넘겨도 "오늘")
 *      스펙 원문은 "심야 21~4시"지만 21~23시는 이미 오늘이라 따로 옮길 필요가 없다.
 *   4. 표현 없음 + 그 외 → 오늘
 *
 * `tz`는 기록한 기기의 시간대다. 오늘·새벽 규칙·"어제" 모두 현지 날짜로 정한다
 * (해외여행, 2026-09-29). 결과 dateKey는 현지 날짜이고, 저장은 kst.ts 앵커가 맡는다.
 *
 * 되묻기는 아껴 쓴다 — 명확하면 묻지 않고 바로 라우팅한다(스펙 §4 "남발 금지").
 */
export function resolveCaptureDate(
  message: string,
  now: Date,
  tz: string,
): CaptureDate {
  const today = todayKeyInZone(tz, now);
  // 미래 날짜는 명시 표현으로 치지 않는다 — "8월 3일에 등산 가기로 했어"는 오늘 한
  // 약속이다. 미래 칸으로 보내면 그 칸을 못 찾아 매번 오늘 칸에 일기가 새로 생겼다(점검 H2).
  const refs = parseDateRefs(message, now, tz).filter(
    (r) => kstDateKey(r.startUtc) <= today,
  );

  if (refs.length === 1) {
    return {
      kind: "resolved",
      dateKey: kstDateKey(refs[0].startUtc),
      label: refs[0].label,
      fromExplicit: true,
    };
  }

  if (refs.length > 1) {
    const labels = refs.map((r) => r.label).join(", ");
    return {
      kind: "ambiguous",
      question: `${labels} 중에 언제 얘기예요? 🙂`,
    };
  }

  // 직전 하루로 보내는 건 자정 **이후** 새벽뿐이다. 21~23시는 아직 같은 날이라
  // 24시간을 빼면 전날이 된다(2026-09-29 점검 H1: 22시 기록이 어제로 갔다).
  const hour = hourInZone(now, tz);
  const isAfterMidnight = hour < 4;
  if (isAfterMidnight) {
    return {
      kind: "resolved",
      dateKey: shiftDateKey(today, -1),
      label: "어제",
      fromExplicit: false,
    };
  }

  return {
    kind: "resolved",
    dateKey: today,
    label: "오늘",
    fromExplicit: false,
  };
}

/**
 * **사진별** 날짜. 묶지 않는다 — 여러 날 사진을 한 날에 몰면 데이터가 틀린 날에 남는다.
 *
 *   - 메시지에 명시적 표현이 있으면(`fromExplicit`) 사용자 말이 이긴다 → 전부 base
 *   - 아니면 각 사진의 EXIF 촬영일. 없거나 형식이 틀리거나 **미래**면 base
 */
export function resolvePhotoDates(
  base: string,
  fromExplicit: boolean,
  exifDateKeys: (string | null)[],
  todayKey: string,
): string[] {
  return exifDateKeys.map((k) => {
    if (fromExplicit) return base;
    if (!k || !/^\d{4}-\d{2}-\d{2}$/.test(k) || k > todayKey) return base;
    return k;
  });
}
