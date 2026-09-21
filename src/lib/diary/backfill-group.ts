import type { SubscriptionPlan } from "@prisma/client";
import { kstDateKey } from "./kst";

export type BackfillLimits = {
  /** 한 번의 업로드 요청에 담을 수 있는 사진 수. */
  maxPhotos: number;
  /** 한 번에 순회할 수 있는 날짜 수. */
  maxDays: number;
};

/**
 * 한 번에 채울 수 있는 양은 요금제를 따른다 (스펙 §7).
 *
 * 날짜 수를 실제로 제약하는 건 **하루 AI 캡**이다. BASIC 은 10회/일이라 14일을
 * 골라도 뒤쪽 날은 어차피 "사진만 저장했어요"로 남는다. PRO 는 100회/일이라
 * 한 달치를 한 번에 소화할 수 있어 31일까지 연다.
 *
 * FREE 는 BASIC 과 같게 둔다 — 구독 만료로 강등된 사용자의 기능을 좁히는 건
 * 이번 요구사항이 아니다.
 */
const LIMITS: Record<SubscriptionPlan, BackfillLimits> = {
  FREE: { maxPhotos: 30, maxDays: 14 },
  BASIC: { maxPhotos: 30, maxDays: 14 },
  PRO: { maxPhotos: 60, maxDays: 31 },
};

export function backfillLimitsFor(plan: SubscriptionPlan): BackfillLimits {
  return LIMITS[plan] ?? LIMITS.FREE;
}

/**
 * 밀린 날 채우기 — 사진을 EXIF 촬영일별로 묶는다. **순수 함수.**
 *
 * 업로드 **전에** 미리보기를 보여줘야 해서 클라이언트에서 돈다. 서버의
 * `resolvePhotoDates`와 규칙이 다른 점이 하나 있다: 거기선 EXIF가 없으면 오늘로
 * 보내지만, 여기선 `null` 묶음으로 뺀다. 밀린 날을 채우러 온 사용자의 오늘 일기에
 * 날짜 미상 사진이 섞이면 안 된다(스펙 §4.1).
 *
 * 상한 테이블도 여기 둔다 — `backfill.ts`는 `server-only`라 클라이언트가 임포트하면
 * 빌드가 깨진다.
 */
export type PhotoGroup = {
  /** null = EXIF 촬영일을 믿을 수 없음 (없거나·형식 오류·미래) */
  dateKey: string | null;
  /** 입력 exifs 배열에서의 인덱스 */
  photoIndexes: number[];
};

function toDateKey(takenAt: string | null, todayKey: string): string | null {
  if (!takenAt) return null;
  const d = new Date(takenAt);
  if (Number.isNaN(d.getTime())) return null;
  const key = kstDateKey(d);
  // 미래는 EXIF 손상으로 본다 (Diary.createdAt 미래 금지 불변식과 같은 취급).
  if (key > todayKey) return null;
  return key;
}

export function groupPhotosByExifDate(
  exifs: { takenAt: string | null }[],
  todayKey: string,
): PhotoGroup[] {
  const byDate = new Map<string, number[]>();
  const unknown: number[] = [];

  exifs.forEach((e, i) => {
    const key = toDateKey(e.takenAt, todayKey);
    if (key === null) {
      unknown.push(i);
      return;
    }
    const arr = byDate.get(key);
    if (arr) arr.push(i);
    else byDate.set(key, [i]);
  });

  // 최근 날짜 먼저. null 묶음은 맨 뒤 — 기본 선택 해제라 눈에 덜 띄어야 한다.
  const groups: PhotoGroup[] = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dateKey, photoIndexes]) => ({ dateKey, photoIndexes }));

  if (unknown.length > 0) groups.push({ dateKey: null, photoIndexes: unknown });
  return groups;
}
