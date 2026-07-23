import "server-only";
import { prisma } from "@/lib/db";
import { upsertDiaryEmbedding } from "./embedding";

/** 일기 본문(prose) + 텍스트 조각들을 임베딩 입력 텍스트로 합성. 순수 함수. */
export function composeDiaryEmbedText(
  content: string,
  fragmentTexts: string[],
): string {
  const parts = [content, ...fragmentTexts]
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.join("\n");
}

/** text 조각만 시간순으로 골라 prose와 합성 (임베딩 입력). 순수 함수 — reembed의 조각 선택 규약. */
export function composeEmbedTextFromFragments(
  diaryContent: string,
  fragments: { kind: string; content: string | null; createdAt: Date }[],
): string {
  const texts = fragments
    .filter((f) => f.kind === "text")
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((f) => f.content ?? "")
    .filter((s) => s.trim().length > 0);
  return composeDiaryEmbedText(diaryContent, texts);
}

/**
 * 그날 일기를 [prose + 텍스트 조각] 합성 텍스트로 재임베딩.
 *   - best-effort: 실패해도 throw 안 함 (전체를 try/catch로 감싸 흡수).
 *   - 조각이 회상 검색(findRelevantDiaries, Diary만 검색)에 잡히게 하는 핵심.
 */
export async function reembedDiaryWithFragments(
  diaryId: string,
): Promise<void> {
  try {
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      select: {
        title: true,
        content: true,
        fragments: { select: { kind: true, content: true, createdAt: true } },
      },
    });
    if (!diary) return;
    const embedText = composeEmbedTextFromFragments(
      diary.content,
      diary.fragments,
    );
    if (!embedText.trim()) return;
    await upsertDiaryEmbedding(diaryId, diary.title, embedText);
  } catch (e) {
    console.warn(
      `[reembed] failed for diary ${diaryId}:`,
      e instanceof Error ? e.message : String(e),
    );
  }
}
