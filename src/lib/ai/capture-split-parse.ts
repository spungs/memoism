// 메시지를 날짜별로 나눈 모델 응답을 검증한다. 순수 함수 — 테스트가 서버 모듈 없이 부른다.

export type DateCandidate = { dateKey: string; label: string };
export type DateSegment = { dateKey: string; text: string };

/** 나눈 조각이 덮어야 하는 원문 비율. 이보다 적으면 사용자 글이 조용히 사라진다. */
const MIN_COVERAGE = 0.7;

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * 모델이 돌려준 `[{date, text}]`를 받아들일지 정한다. 하나라도 못 믿으면 null —
 * 호출부는 되묻기로 넘어간다.
 *
 *   - date는 메시지가 가리킨 후보 날짜여야 한다.
 *   - text는 원문을 **그대로 잘라낸** 부분이어야 한다. 일기에 남는 글은 사용자의 말뿐이라,
 *     모델이 바꿔 쓰거나 덧붙인 문장은 받지 않는다.
 *   - 조각들이 원문의 대부분을 덮어야 한다. 일부만 돌려주면 나머지 글이 사라진다.
 *   - 한 날짜를 여러 토막으로 주면 원문에서 처음~끝까지 **이어진 구간 하나**로 합친다.
 *     모델이 "어제랑 오늘 둘 다 비가 왔어"를 "어제"·"비가 왔어"로 쪼개 날짜 단어만 남은
 *     조각이 생겼다(2026-10-01 로컬 확인).
 */
export function parseDateSplit(
  message: string,
  candidates: DateCandidate[],
  raw: string,
): DateSegment[] | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const allowed = new Set(candidates.map((c) => c.dateKey));
  const source = squash(message);
  const covered = new Array<boolean>(source.length).fill(false);
  const spans = new Map<string, { start: number; end: number }>();

  for (const item of parsed) {
    const date = (item as { date?: unknown })?.date;
    const text = (item as { text?: unknown })?.text;
    if (typeof date !== "string" || typeof text !== "string") return null;
    if (!allowed.has(date)) return null;
    // 앞뒤 공백과 이어 붙이던 쉼표는 떼고 본다("화요일에 토마토파스타,").
    const piece = squash(text).replace(/[\s,，、;]+$/u, "");
    if (!piece) return null;
    const at = source.indexOf(piece);
    if (at < 0) return null;
    for (let i = at; i < at + piece.length; i++) covered[i] = true;

    const span = spans.get(date);
    spans.set(date, {
      start: Math.min(span?.start ?? at, at),
      end: Math.max(span?.end ?? at + piece.length, at + piece.length),
    });
  }

  const meaningful = [...source].filter((ch) => !/[\s,.!?~]/.test(ch)).length;
  const coveredMeaningful = [...source].filter(
    (ch, i) => covered[i] && !/[\s,.!?~]/.test(ch),
  ).length;
  if (meaningful === 0 || coveredMeaningful / meaningful < MIN_COVERAGE) return null;

  return [...spans.entries()]
    .map(([dateKey, { start, end }]) => ({
      dateKey,
      text: source.slice(start, end).replace(/[\s,，、;]+$/u, ""),
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}
