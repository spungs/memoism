/**
 * 조각을 AI 정리 입력으로 고르는 순수 규약.
 *
 * DB·AI를 모르는 순수 함수로 떼어낸 이유: 길이 예산 경계와 "오래된 것부터 제외"는
 * 실측으로 확인하기 비싼데, 조용히 틀리면 조각이 누락된다(사용자는 알아채지 못한다).
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 조각 하나가 프롬프트에서 차지하는 고정 비용.
 * "14:30 "(6자) + 줄바꿈(1자) = 7. 본문 길이에 이걸 더해 예산을 계산한다.
 */
const FRAGMENT_OVERHEAD = 7;

export type FoldCandidate = {
  id: string;
  content: string;
  createdAt: Date;
};

export type PromptFragment = {
  /** KST "HH:mm". 날짜는 일기 단위로 이미 정해져 있어 넣지 않는다. */
  at: string;
  text: string;
};

/** UTC Date -> KST "HH:mm". */
export function formatFragmentAt(d: Date): string {
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * 길이 예산 안에서 조각을 고른다.
 *   - 예산 = maxTotalLength - currentContentLength (본문은 항상 보존되므로 먼저 뺀다)
 *   - 넘치면 **가장 오래된 조각부터** 제외한다. 최근 것이 사용자 기억에 가깝고,
 *     제외된 조각은 foldedAt을 안 찍어 다음 정리에 다시 후보가 된다.
 *   - 반환은 항상 시간 오름차순 (프롬프트가 하루의 흐름을 읽어야 한다).
 */
export function selectFragmentsForFold(
  candidates: FoldCandidate[],
  currentContentLength: number,
  maxTotalLength: number,
): { selected: FoldCandidate[]; skippedCount: number } {
  const sorted = [...candidates].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  let budget = maxTotalLength - currentContentLength;
  const keptReversed: FoldCandidate[] = [];

  // 최신 것부터 담아 예산을 채운다 -> 남는 건 자연히 가장 오래된 것들.
  for (let i = sorted.length - 1; i >= 0; i--) {
    const f = sorted[i];
    const cost = FRAGMENT_OVERHEAD + f.content.trim().length;
    if (cost > budget) break;
    budget -= cost;
    keptReversed.push(f);
  }

  const selected = keptReversed.reverse();
  return { selected, skippedCount: sorted.length - selected.length };
}

/** 선택된 조각을 프롬프트 입력 형태로 변환. */
export function toPromptFragments(selected: FoldCandidate[]): PromptFragment[] {
  return selected.map((f) => ({
    at: formatFragmentAt(f.createdAt),
    text: f.content.trim(),
  }));
}
