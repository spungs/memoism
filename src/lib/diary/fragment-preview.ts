const MAX = 50;

/**
 * 조각들을 목록·캘린더 카드에 쓸 한 줄로 요약한다. **순수 함수.**
 *
 * 왜 필요한가: 메이로만 기록한 날은 `Diary.content`가 비어 있어서
 * 카드가 날짜만 있는 빈 항목으로 보인다. 조각이 그 자리를 채운다.
 */
export function fragmentPreview(
  fragments: { kind: string; content: string | null }[],
): string {
  if (fragments.length === 0) return "";

  // 조각은 텍스트뿐이다 — 채팅 사진은 조각이 아니라 DiaryImage로 저장한다
  // (2026-07-29 결정: 사진 인프라를 두 벌로 만들지 않는다).
  const texts = fragments.filter((f) => f.kind === "text" && f.content?.trim());
  if (texts.length === 0) return "";

  const head = texts[0].content!.replace(/\s+/g, " ").trim();
  const clipped = head.length > MAX ? `${head.slice(0, MAX)}…` : head;
  const rest = fragments.length - 1;
  return rest > 0 ? `${clipped} · 조각 ${rest}개 더` : clipped;
}
