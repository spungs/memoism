// 오타 교정 모델 응답을 검증한다. 순수 함수 — 테스트가 서버 모듈 없이 부른다.

/** 공백을 뺀 글자 기준으로 바꿀 수 있는 비율. 넘으면 교정이 아니라 고쳐 쓴 것으로 본다. */
const MAX_CHANGE_RATIO = 0.2;
/** 짧은 글("됬어")은 비율로는 한 글자도 못 고친다 — 이만큼은 늘 허용한다. */
const MIN_ALLOWED_CHANGES = 2;

const chars = (s: string) => Array.from(s.replace(/\s+/g, ""));
const digits = (s: string) => (s.match(/\d+/g) ?? []).join(",");

function editDistance(a: string[], b: string[]): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * 교정 결과를 받을지 정한다. 못 믿으면 원문을 돌려준다 — 저장은 막지 않는다.
 *
 *   - 공백을 뺀 글자가 많이 바뀌면 받지 않는다. 띄어쓰기는 마음껏 고쳐도 되지만 단어를
 *     바꿔 쓰거나 덧붙이면 일기에 사용자가 하지 않은 말이 남는다.
 *   - 숫자가 하나라도 달라지면 받지 않는다. 날짜·시각·금액이 바뀌는 사고는 티가 안 난다.
 */
export function acceptTypoFix(original: string, raw: string): string {
  const fixed = raw.trim().replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "").trim();
  if (!fixed) return original;
  if (digits(fixed) !== digits(original)) return original;

  const before = chars(original);
  const allowed = Math.max(MIN_ALLOWED_CHANGES, Math.ceil(before.length * MAX_CHANGE_RATIO));
  if (editDistance(before, chars(fixed)) > allowed) return original;
  return fixed;
}
