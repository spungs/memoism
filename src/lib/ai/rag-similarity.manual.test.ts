/**
 * RAG 유사도 실측 — **실제 Gemini 임베딩 + 운영 DB를 읽는다.** 기본 실행에서 제외.
 *
 *   npx vitest run --config vitest.manual.config.ts src/lib/ai/rag-similarity.manual.test.ts
 *
 * 왜: "가장 처음 쓴 일기" 같은 **메타 질문**에 전혀 무관한 일기가 관련 칩으로
 * 붙었다(2026-09-22, 9월 21일·7월 15일). MIN_VECTOR_SIMILARITY가 적절한지,
 * 메타 질문과 내용 질문의 유사도 분포가 실제로 갈리는지 숫자로 본다.
 *
 * 읽기만 한다 — 어떤 행도 쓰지 않는다.
 */
import { describe, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
// 운영 DB를 읽어야 실제 분포가 나온다(.env.local은 로컬 PG를 가리킨다).
for (const line of fs
  .readFileSync(path.join(ROOT, ".env.local.prod-backup"), "utf8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { embedText } = await import("./gemini");
const { MIN_VECTOR_SIMILARITY } = await import("./rag");
const { prisma } = await import("@/lib/db");

const USER_ID = "5d993734-e987-4175-b705-ad0ca755c13f";

/** 메타 질문 — 내용 검색 대상이 아니다. 여기서 높은 유사도가 나오면 오검색이다. */
const META_QUERIES = [
  "가장 처음쓴일기",
  "일기 몇 개 썼어?",
  "작년 일기 쓴게 있나",
  "통화했다는 내용은 없는데?",
];

/** 내용 질문 — 특정 일기를 정확히 집어야 한다. */
const CONTENT_QUERIES = [
  "성수동 서울숲 갔던 날",
  "요가 한 날",
  "동묘 피자",
  "영어 학원 상담",
];

async function top(query: string, k = 5) {
  const vec = await embedText(query);
  const literal = `[${vec.join(",")}]`;
  const rows = await prisma.$queryRaw<
    Array<{ title: string; created_at: Date; similarity: number }>
  >`
    SELECT d.title, d.created_at,
           1 - (e.vector OPERATOR(public.<=>) ${literal}::public.vector) AS similarity
    FROM app.diary_embeddings e
    JOIN app.diaries d ON d.id = e.diary_id
    WHERE d.user_id = ${USER_ID}
    ORDER BY e.vector OPERATOR(public.<=>) ${literal}::public.vector ASC
    LIMIT ${k}
  `;
  return rows;
}

describe("RAG 유사도 분포", () => {
  it(
    "메타 질문 vs 내용 질문의 상위 유사도",
    async () => {
      // 하드코딩하지 않는다 — 상수를 조정한 뒤 다시 돌리면 그 값으로 채점된다.
      const THRESHOLD = MIN_VECTOR_SIMILARITY;
      for (const [label, queries] of [
        ["메타", META_QUERIES],
        ["내용", CONTENT_QUERIES],
      ] as const) {
        console.log(`\n===== ${label} 질문 =====`);
        for (const q of queries) {
          const rows = await top(q);
          const passing = rows.filter((r) => Number(r.similarity) >= THRESHOLD);
          console.log(
            `\n"${q}" → ${THRESHOLD} 통과 ${passing.length}/${rows.length}건`,
          );
          for (const r of rows) {
            const s = Number(r.similarity);
            const kst = new Date(r.created_at).toISOString().slice(0, 10);
            console.log(
              `   ${s.toFixed(3)} ${s >= THRESHOLD ? "✓" : " "} ${kst} ${r.title || "(제목없음)"}`,
            );
          }
        }
      }
      await prisma.$disconnect();
    },
    10 * 60 * 1000,
  );
});
