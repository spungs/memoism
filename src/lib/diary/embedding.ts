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
): Promise<{ ok: boolean; error?: string }> {
  try {
    const input = buildEmbeddingInput(title, content);
    if (!input.trim()) return { ok: false, error: "빈 텍스트" };

    const vector = await embedText(input);
    const literal = toVectorLiteral(vector);

    // pgvector 확장이 public schema에 설치돼 있고 connection search_path=app이라
    // ::vector 캐스트가 안 보임 → public.vector로 명시.
    await prisma.$executeRaw`
      INSERT INTO app.diary_embeddings (diary_id, vector, updated_at)
      VALUES (${diaryId}, ${literal}::public.vector, NOW())
      ON CONFLICT (diary_id) DO UPDATE
        SET vector = EXCLUDED.vector,
            updated_at = NOW();
    `;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[embedding] upsert failed for diary ${diaryId}:`, msg);
    return { ok: false, error: msg };
  }
}

/**
 * 일기 임베딩 삭제.
 *
 * 내용이 다 빠져나가 **빈 일기**가 됐을 때 부른다. 안 지우면 옛 벡터가 그대로
 * 남아 회상 검색(findRelevantDiaries)에 계속 걸리고, 모델에는 제목·본문이 빈
 * 껍데기가 전달된다 — topK 슬롯을 먹으면서 정작 옮겨간 진짜 기억을 밀어낸다.
 *
 * best-effort: 실패해도 호출자를 막지 않는다(임베딩은 항상 부가 기능).
 */
export async function deleteDiaryEmbedding(diaryId: string): Promise<void> {
  try {
    await prisma.diaryEmbedding.deleteMany({ where: { diaryId } });
  } catch (e) {
    console.warn(
      `[embedding] delete failed for diary ${diaryId}:`,
      e instanceof Error ? e.message : String(e),
    );
  }
}

/**
 * 본인 일기 중 임베딩 누락분 채우기 (backfill).
 *   - dev/staging에서 일회성. V2에선 background queue로 자동.
 *   - 반환: 성공/실패 카운트.
 */
export async function backfillUserEmbeddings(userId: string): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ diaryId: string; error: string }>;
}> {
  const missing = await prisma.diary.findMany({
    where: {
      userId,
      embedding: null,
    },
    select: { id: true, title: true, content: true },
  });

  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ diaryId: string; error: string }> = [];
  for (const d of missing) {
    const r = await upsertDiaryEmbedding(d.id, d.title, d.content);
    if (r.ok) {
      succeeded++;
    } else {
      failed++;
      errors.push({ diaryId: d.id, error: r.error ?? "unknown" });
    }
  }
  return { total: missing.length, succeeded, failed, errors };
}
