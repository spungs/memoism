import "server-only";
import { prisma } from "@/lib/db";
import { embedText } from "@/lib/ai/gemini";
import { kstDayRangeUtc } from "@/lib/diary/kst";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

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
      1 - (e.vector OPERATOR(public.<=>) ${literal}::public.vector) AS similarity
    FROM app.diary_embeddings e
    JOIN app.diaries d ON d.id = e.diary_id
    WHERE d.user_id = ${userId}
    ORDER BY e.vector OPERATOR(public.<=>) ${literal}::public.vector ASC
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

// =============================================================================
// 하이브리드 검색 — 의미(벡터) + 날짜 + 키워드.
//   의미 임베딩만으로는 "6월 3일에 뭐했지"(날짜는 본문에 없음)나 드문 고유명사
//   ("물무산")가 누락된다. 날짜·키워드 직접 조회를 합쳐 recall을 끌어올린다.
// =============================================================================

export type RelevantDiary = {
  id: string;
  title: string;
  content: string;
  mood: string | null;
  createdAt: Date;
  similarity: number; // 벡터 유사도 (벡터로 안 잡혔으면 0)
  matchedByDate: string | null; // 매칭된 날짜 라벨 (예: "6월 3일")
  matchedByKeyword: string | null; // 매칭된 키워드 (예: "물무산")
};

const diarySelect = {
  id: true,
  title: true,
  content: true,
  mood: true,
  createdAt: true,
} as const;

type DateRange = { startUtc: Date; endUtc: Date; label: string };

function kstYmd(d: Date): { y: number; m: number; day: number } {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, day: k.getUTCDate() };
}

function kstShiftDays(now: Date, deltaDays: number): { y: number; m: number; day: number } {
  return kstYmd(new Date(now.getTime() + deltaDays * 24 * 60 * 60 * 1000));
}

/** 사용자 메시지에서 날짜 표현을 뽑아 KST 하루 범위로 변환. ('6월 3일','어제','3일 전' 등) */
export function parseDateRefs(message: string, now: Date): DateRange[] {
  const ranges: DateRange[] = [];
  const seen = new Set<string>();
  const add = (y: number, m: number, day: number, label: string) => {
    if (m < 1 || m > 12 || day < 1 || day > 31) return;
    const key = `${y}-${m}-${day}`;
    if (seen.has(key)) return;
    seen.add(key);
    const { startUtc, endUtc } = kstDayRangeUtc(y, m, day);
    ranges.push({ startUtc, endUtc, label });
  };

  // YYYY년 M월 D일 (먼저 처리하고 매칭부를 비워, M월D일 재매칭 방지)
  let rest = message;
  for (const mt of message.matchAll(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)) {
    add(+mt[1], +mt[2], +mt[3], `${mt[1]}년 ${mt[2]}월 ${mt[3]}일`);
    rest = rest.replace(mt[0], " ");
  }
  // M월 D일 (연도 없음 → KST 올해)
  const thisYear = kstYmd(now).y;
  for (const mt of rest.matchAll(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)) {
    add(thisYear, +mt[1], +mt[2], `${mt[1]}월 ${mt[2]}일`);
    rest = rest.replace(mt[0], " ");
  }
  // M/D 또는 M.D 슬래시·점 형식 (예: 6/8, 6.8) → KST 올해.
  // 앞에서 연도 포함·한국어 형식이 이미 처리된 rest 기준으로 파싱해 중복을 방지한다.
  for (const mt of rest.matchAll(/\b(\d{1,2})[\/.](\d{1,2})\b/g)) {
    add(thisYear, +mt[1], +mt[2], `${mt[1]}월 ${mt[2]}일`);
  }
  // 상대 표현
  if (/오늘/.test(message)) { const t = kstShiftDays(now, 0); add(t.y, t.m, t.day, "오늘"); }
  if (/어제/.test(message)) { const t = kstShiftDays(now, -1); add(t.y, t.m, t.day, "어제"); }
  if (/그제|그저께/.test(message)) { const t = kstShiftDays(now, -2); add(t.y, t.m, t.day, "그제"); }
  const nDaysAgo = message.match(/(\d+)\s*일\s*전/);
  if (nDaysAgo) { const t = kstShiftDays(now, -Number(nDaysAgo[1])); add(t.y, t.m, t.day, `${nDaysAgo[1]}일 전`); }

  return ranges;
}

// 질문 자체의 의문사·조사 등 — 키워드 검색에서 제외 (본문에 안 들어가거나 너무 흔함).
const QUESTION_STOPWORDS = new Set([
  "뭐", "뭐야", "무슨", "무엇", "언제", "어디", "어디서", "누구", "누구랑", "왜",
  "어떻게", "어땠어", "어땠지", "했어", "했지", "갔어", "갔지", "있었어", "있었지",
  "그때", "그날", "그거", "이거", "저거", "오늘", "어제", "그제", "내일",
  "기억", "기억나", "알려줘", "말해줘", "해줘", "대해", "대한", "그리고", "근데",
  "나는", "내가", "우리", "이번", "지난", "다음", "정도", "그냥",
]);
// 흔한 종결 조사 — 키워드 토큰에서 떼어내 어간 매칭 ('물무산은' → '물무산').
const PARTICLE_RE = /(은|는|이|가|을|를|에서|에게|한테|에|도|만|의|로|으로|와|과|랑|이랑|까지|부터|마다|보다|처럼)$/;

/** 메시지에서 본문 검색에 쓸 키워드(고유명사·명사) 추출. 조사 제거·의문사 제외. */
export function extractKeywords(message: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of message.trim().split(/\s+/)) {
    const cleaned = token.replace(/[?!.,~"'()[\]…]/g, "");
    if (!cleaned) continue;
    const stem = cleaned.replace(PARTICLE_RE, "");
    const w = stem.length >= 2 ? stem : cleaned;
    if (w.length < 2) continue;
    if (/^\d+$/.test(w)) continue; // 순수 숫자는 날짜 파서가 담당
    if (QUESTION_STOPWORDS.has(w) || QUESTION_STOPWORDS.has(cleaned)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out.slice(0, 6);
}

/**
 * 하이브리드 검색: 의미(벡터) + 날짜 + 키워드를 합쳐 dedup.
 *   - 본인 일기로만 scope.
 *   - 정렬: 날짜 매칭 > 키워드 매칭 > 벡터 유사도. 최대 8건.
 */
export async function findRelevantDiaries(
  userId: string,
  message: string,
  opts: { now: Date; topK?: number },
): Promise<RelevantDiary[]> {
  const topK = opts.topK ?? 5;
  const dateRanges = parseDateRefs(message, opts.now);
  const keywords = extractKeywords(message);

  const [vectorHits, dateRows, keywordRows] = await Promise.all([
    searchDiaries(userId, message, { topK }).catch(() => [] as RagSearchHit[]),
    dateRanges.length > 0
      ? prisma.diary.findMany({
          where: {
            userId,
            OR: dateRanges.map((r) => ({
              createdAt: { gte: r.startUtc, lt: r.endUtc },
            })),
          },
          select: diarySelect,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    keywords.length > 0
      ? prisma.diary.findMany({
          where: {
            userId,
            OR: keywords.flatMap((k) => [
              { title: { contains: k, mode: "insensitive" as const } },
              { content: { contains: k, mode: "insensitive" as const } },
            ]),
          },
          select: diarySelect,
          orderBy: { createdAt: "desc" },
          take: 4,
        })
      : Promise.resolve([]),
  ]);

  const byId = new Map<string, RelevantDiary>();
  const base = (d: {
    id: string;
    title: string;
    content: string;
    mood: string | null;
    createdAt: Date;
  }): RelevantDiary => {
    let r = byId.get(d.id);
    if (!r) {
      r = { ...d, similarity: 0, matchedByDate: null, matchedByKeyword: null };
      byId.set(d.id, r);
    }
    return r;
  };

  for (const h of vectorHits) {
    const r = base(h);
    r.similarity = Math.max(r.similarity, h.similarity);
  }
  for (const d of dateRows) {
    const r = base(d);
    r.matchedByDate =
      dateRanges.find((rg) => d.createdAt >= rg.startUtc && d.createdAt < rg.endUtc)?.label ??
      r.matchedByDate ??
      "날짜";
  }
  for (const d of keywordRows) {
    const r = base(d);
    r.matchedByKeyword =
      keywords.find((k) => d.title.includes(k) || d.content.includes(k)) ??
      r.matchedByKeyword ??
      keywords[0] ??
      null;
  }

  return [...byId.values()]
    .sort((a, b) => {
      const ad = a.matchedByDate ? 1 : 0;
      const bd = b.matchedByDate ? 1 : 0;
      if (ad !== bd) return bd - ad;
      const ak = a.matchedByKeyword ? 1 : 0;
      const bk = b.matchedByKeyword ? 1 : 0;
      if (ak !== bk) return bk - ak;
      return b.similarity - a.similarity;
    })
    .slice(0, 8);
}
