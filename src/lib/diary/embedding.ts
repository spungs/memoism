import "server-only";
import { prisma } from "@/lib/db";
import { embedText } from "@/lib/ai/gemini";

// pgvector 타입은 Prisma client가 직접 다루지 못해 raw SQL.
// vector literal 형식: '[0.1,0.2,...]' 후 ::vector 캐스팅.

function buildEmbeddingInput(title: string, content: string): string {
  // title + content 합쳐서 임베딩. 제목이 검색어와 더 가까운 경우가 많아 가중치 효과.
  const t = title.trim();
  const c = content.trim();
  if (!t) return c;
  if (!c) return t;
  return `${t}\n\n${c}`;
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/**
 * 일기 임베딩 생성/갱신.
 *   - 실패해도 일기 자체엔 영향 없음 (best-effort, log only).
 *   - 호출자는 await로 1초 정도 추가 지연 감수 OR fire-and-forget.
 */
export async function upsertDiaryEmbedding(
  diaryId: string,
  title: string,
  content: string,
): Promise<{ ok: boolean }> {
  try {
    const input = buildEmbeddingInput(title, content);
    if (!input.trim()) return { ok: false };

    const vector = await embedText(input);
    const literal = toVectorLiteral(vector);

    await prisma.$executeRaw`
      INSERT INTO app.diary_embeddings (diary_id, vector, updated_at)
      VALUES (${diaryId}, ${literal}::vector, NOW())
      ON CONFLICT (diary_id) DO UPDATE
        SET vector = EXCLUDED.vector,
            updated_at = NOW();
    `;
    return { ok: true };
  } catch (e) {
    console.warn(
      `[embedding] upsert failed for diary ${diaryId}:`,
      e instanceof Error ? e.message : e,
    );
    return { ok: false };
  }
}

/**
 * 본인 일기 중 임베딩 누락분 채우기 (backfill).
 *   - dev/staging에서 일회성. V2에선 background queue로 자동.
 *   - 반환: 성공/실패 카운트.
 */
export async function backfillUserEmbeddings(
  userId: string,
): Promise<{ total: number; succeeded: number; failed: number }> {
  const missing = await prisma.diary.findMany({
    where: {
      userId,
      embedding: null,
    },
    select: { id: true, title: true, content: true },
  });

  let succeeded = 0;
  let failed = 0;
  for (const d of missing) {
    const r = await upsertDiaryEmbedding(d.id, d.title, d.content);
    if (r.ok) succeeded++;
    else failed++;
  }
  return { total: missing.length, succeeded, failed };
}
