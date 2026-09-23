/**
 * findRelevantDiaries 전체 파이프라인 실측 — **운영 DB + 실제 임베딩을 읽는다.**
 *
 *   npx vitest run --config vitest.manual.config.ts src/lib/ai/rag-pipeline.manual.test.ts
 *
 * 왜: 임계값을 0.68로 올린 뒤에도 "가장 처음 쓴 일기는?"에 7월 19일 삼척 일기가
 * 관련 칩으로 붙었다. 벡터·날짜·키워드 셋 중 **어느 경로로** 올라왔는지 갈라야
 * 고칠 곳을 안다. rag-similarity 쪽은 벡터만 보지만 여기선 합류 결과를 본다.
 *
 * 읽기만 한다.
 */
import { describe, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
for (const line of fs
  .readFileSync(path.join(ROOT, ".env.local.prod-backup"), "utf8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { findRelevantDiaries } = await import("./rag");
const { prisma } = await import("@/lib/db");

const USER_ID = "5d993734-e987-4175-b705-ad0ca755c13f";

/** 화면에서 실제로 틀렸던 문장들. 띄어쓰기까지 그대로 둔다(임베딩이 달라진다). */
const QUERIES = [
  "가장 처음 쓴 일기는?",
  "가장 처음쓴일기",
  "일기 몇 개 썼어?",
  "작년 일기 쓴게 있나",
];

/** 반대편 — 불용어를 늘린 뒤에도 이쪽은 계속 잡혀야 한다(과잉 차단 감지). */
const CONTENT_QUERIES = [
  "성수동 서울숲 갔던 날",
  "요가 한 날",
  "동묘 피자 먹은 날",
  "막둥이랑 뭐 했지?",
];

describe("findRelevantDiaries 경로 분해", () => {
  it(
    "메타 질문이 어느 경로로 일기를 물고 오는가",
    async () => {
      for (const q of [...QUERIES, ...CONTENT_QUERIES]) {
        const rows = await findRelevantDiaries(USER_ID, q, {
          now: new Date(),
          topK: 5,
        });
        console.log(`\n"${q}" → ${rows.length}건`);
        for (const r of rows) {
          const kst = new Date(r.createdAt).toISOString().slice(0, 10);
          const why = [
            r.similarity > 0 ? `벡터 ${r.similarity.toFixed(3)}` : null,
            r.matchedByDate ? `날짜 "${r.matchedByDate}"` : null,
            r.matchedByKeyword ? `키워드 "${r.matchedByKeyword}"` : null,
          ]
            .filter(Boolean)
            .join(" + ");
          // 칩 fallback은 날짜·키워드 매칭만 통과시킨다 — 그 대상인지 표시한다.
          const chipFallback =
            r.matchedByDate !== null || r.matchedByKeyword !== null ? " [칩후보]" : "";
          console.log(`   ${kst} ${r.title || "(제목없음)"} ← ${why}${chipFallback}`);
        }
      }
      await prisma.$disconnect();
    },
    10 * 60 * 1000,
  );
});
