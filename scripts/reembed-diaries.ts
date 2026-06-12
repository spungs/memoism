/**
 * 일기 임베딩 일괄 재생성 CLI (베타 운영용).
 *
 * 메이(RAG) 검색은 app.diary_embeddings에 행이 있어야만 그 일기를 찾는다. 임베딩은
 * best-effort(실패 시 로그만)라, 일시적 장애(예: 2026-06-10 Gemini 크레딧 소진 창)나
 * 기능 도입 전 일기는 임베딩이 없어 메이가 "기억 못 함" → 빈약한 컨텍스트로 환각까지
 * 이어졌다. 이 스크립트로 누락분을 채우거나 전체를 다시 임베딩한다.
 *
 * 실행 (Node 23.6+ 네이티브 TS — 별도 tsx 불필요):
 *   pnpm reembed-diaries                 # dry-run: 전체/임베딩됨/누락 카운트만 (변경 없음)
 *   pnpm reembed-diaries --missing-only  # 누락분만 임베딩
 *   pnpm reembed-diaries --write         # 전체 재임베딩 (덮어쓰기, idempotent)
 *
 * 안전:
 *   - 임베딩은 일기 본문에서 파생된 캐시라 비파괴적이다 (diary 본문은 건드리지 않는다).
 *   - gemini-embedding-001은 2048토큰 초과 입력을 조용히 잘라내고 벡터를 정상 반환하므로
 *     (autoTruncate 기본 true) 장문 일기도 길이 때문에 실패하지 않는다.
 *   - server-only 체인(@/lib/ai/gemini)을 피하려 임베딩 호출·upsert를 인라인한다
 *     (reset-password.ts가 bcrypt를 인라인한 것과 동일한 방침).
 *   - DATABASE_URL은 .env.local 값을 사용 (pgbouncer=true 확인됨).
 */
import { config as loadEnv } from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";

// Next 스타일 env 로드 (.env → .env.local 우선). prisma.config.ts 와 동일한 순서.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

// src/lib/ai/gemini.ts 와 동기화 — 변경 시 함께 맞출 것.
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
const EMBEDDING_DIM = 768;

function buildEmbeddingInput(title: string, content: string): string {
  const t = title.trim();
  const c = content.trim();
  if (!t) return c;
  if (!c) return t;
  return `${t}\n\n${c}`;
}

async function embed(genai: GoogleGenAI, text: string): Promise<number[]> {
  const res = await genai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIM },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIM) {
    throw new Error(`임베딩 응답 형식 오류 (dim: ${values?.length ?? "undefined"})`);
  }
  return values;
}

async function upsert(
  prisma: PrismaClient,
  diaryId: string,
  vector: number[],
): Promise<void> {
  // pgvector 확장은 public schema, connection search_path=app → ::public.vector 명시.
  const literal = `[${vector.join(",")}]`;
  await prisma.$executeRaw`
    INSERT INTO app.diary_embeddings (diary_id, vector, updated_at)
    VALUES (${diaryId}, ${literal}::public.vector, NOW())
    ON CONFLICT (diary_id) DO UPDATE
      SET vector = EXCLUDED.vector,
          updated_at = NOW();
  `;
}

async function run(): Promise<number> {
  const args = process.argv.slice(2);
  const missingOnly = args.includes("--missing-only");
  // --missing-only 는 쓰기를 함의한다. --write 단독은 전체 덮어쓰기.
  const doWrite = args.includes("--write") || missingOnly;

  const prisma = new PrismaClient();
  try {
    const total = await prisma.diary.count();
    const embedded = await prisma.diaryEmbedding.count();
    const missingCount = total - embedded;

    console.log("── 일기 임베딩 현황 ──────────────────────────");
    console.log(`  전체 일기:    ${total}`);
    console.log(`  임베딩 있음:  ${embedded}`);
    console.log(`  임베딩 누락:  ${missingCount}`);
    console.log("");

    // 누락분 상세 — "장문 일기가 누락됐다"는 가설 확인용으로 길이를 함께 출력.
    const missing = await prisma.diary.findMany({
      where: { embedding: null },
      select: { id: true, userId: true, title: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    if (missing.length > 0) {
      console.log("── 임베딩 누락 일기 (최신순) ────────────────");
      for (const d of missing) {
        const date = d.createdAt.toLocaleDateString("ko-KR", {
          timeZone: "Asia/Seoul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const user = d.userId.slice(0, 8);
        const len = String(d.content.length).padStart(4);
        const title = d.title.trim() || "(제목 없음)";
        console.log(`  ${date}  user ${user}  ${len}자  ${title}`);
      }
      console.log("");
    }

    if (!doWrite) {
      console.log("ℹ️  dry-run (변경 없음).");
      console.log("    누락분만 채우기:  pnpm reembed-diaries --missing-only");
      console.log("    전체 재임베딩:    pnpm reembed-diaries --write");
      return 0;
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY 가 설정되지 않았습니다.");
      return 1;
    }

    const targets = await prisma.diary.findMany({
      where: missingOnly ? { embedding: null } : {},
      select: { id: true, title: true, content: true },
      orderBy: { createdAt: "asc" },
    });

    const mode = missingOnly ? "누락분만" : "전체 덮어쓰기";
    console.log(`▶ 재임베딩 시작 (${mode}) — 대상 ${targets.length}건`);

    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let ok = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < targets.length; i++) {
      const d = targets[i];
      const input = buildEmbeddingInput(d.title, d.content);
      if (!input.trim()) {
        failed++;
        errors.push({ id: d.id, error: "빈 텍스트" });
        continue;
      }
      try {
        const vector = await embed(genai, input);
        await upsert(prisma, d.id, vector);
        ok++;
      } catch (e) {
        failed++;
        errors.push({ id: d.id, error: e instanceof Error ? e.message : String(e) });
      }
      // 진행률 (10건마다, 그리고 마지막)
      if ((i + 1) % 10 === 0 || i === targets.length - 1) {
        console.log(`  …${i + 1}/${targets.length} (성공 ${ok}, 실패 ${failed})`);
      }
    }

    console.log("");
    console.log(`✅ 완료 — 성공 ${ok}, 실패 ${failed}`);
    if (errors.length > 0) {
      console.log("── 실패 상세 ──");
      for (const e of errors) console.log(`  ${e.id}: ${e.error}`);
      return 1;
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("❌ 실패:", err);
    process.exit(1);
  });
