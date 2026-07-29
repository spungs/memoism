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

  const texts = fragments.filter((f) => f.kind === "text" && f.content?.trim());
  // 종류를 직접 센다. `fragments.length - texts.length`로 빼면 공백만 있는
  // 텍스트 조각이 사진으로 집계돼 "사진 1장"이라고 거짓말한다.
  const photos = fragments.filter((f) => f.kind === "photo").length;

  if (texts.length === 0) {
    return photos > 0 ? `사진 ${photos}장` : "";
  }

  const head = texts[0].content!.replace(/\s+/g, " ").trim();
  const clipped = head.length > MAX ? `${head.slice(0, MAX)}…` : head;
  const rest = fragments.length - 1;
  return rest > 0 ? `${clipped} · 조각 ${rest}개 더` : clipped;
}
