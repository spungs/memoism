import "server-only";
import { prisma } from "@/lib/db";
import { embedText } from "@/lib/ai/gemini";

export type RagSearchHit = {
  id: string;
  title: string;
  content: string;
  mood: string | null;
  source: string;
  createdAt: Date;
  similarity: number; // 1 - cosine distance (1=완전 동일, 0=무관)
};

/**
 * 자연어 → 임베딩 → 본인 일기 cosine 유사도 top-K.
 *   - pgvector 연산자 <=> 는 cosine distance (작을수록 유사)
 *   - similarity = 1 - distance (직관적 표현)
 *   - 본인 일기로만 scope (user_id WHERE 필터)
 *   - top-K 기본 5
 */
export async function searchDiaries(
  userId: string,
  query: string,
  opts: { topK?: number } = {},
): Promise<RagSearchHit[]> {
  const topK = opts.topK ?? 5;
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queryVector = await embedText(trimmed);
  const literal = `[${queryVector.join(",")}]`;

  // Prisma $queryRaw + tagged template. user_id·literal·topK 모두 parameterized.
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      content: string;
      mood: string | null;
      source: string;
      created_at: Date;
      similarity: number;
    }>
  >`
    SELECT
      d.id, d.title, d.content, d.mood, d.source, d.created_at,
      1 - (e.vector <=> ${literal}::vector) AS similarity
    FROM app.diary_embeddings e
    JOIN app.diaries d ON d.id = e.diary_id
    WHERE d.user_id = ${userId}
    ORDER BY e.vector <=> ${literal}::vector ASC
    LIMIT ${topK}
  `;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    mood: r.mood,
    source: r.source,
    createdAt: r.created_at,
    similarity: Number(r.similarity),
  }));
}
