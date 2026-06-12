import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/ai/gemini";
import { findRelevantDiaries, type RelevantDiary } from "@/lib/ai/rag";
import { checkAndIncrement } from "@/lib/ai/usage";
import { captureServer } from "@/lib/analytics/server";
import { CHARACTER_NAME } from "@/lib/character/utils";

const messageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "메시지를 입력해주세요")
    .max(2000, "메시지는 2000자 이내여야 합니다"),
});

type Persona = {
  tone: string;
  formality: string;
  sentenceLength: string;
};

const TONE_MAP: Record<string, string> = {
  warm: "다정하고 따뜻한",
  cheerful: "밝고 활기찬",
  calm: "차분하고 안정된",
  witty: "재치있고 가벼운",
};
const FORMALITY_MAP: Record<string, string> = {
  casual: "친구처럼 편한",
  polite: "예의 바른 존댓말",
};
const LENGTH_MAP: Record<string, string> = {
  short: "1~2문장",
  medium: "1~3문장",
  long: "2~4문장",
};

function personaStyle(persona: Persona | null): string {
  const tone = TONE_MAP[persona?.tone ?? "warm"] ?? TONE_MAP.warm;
  const formality =
    FORMALITY_MAP[persona?.formality ?? "casual"] ?? FORMALITY_MAP.casual;
  const length = LENGTH_MAP[persona?.sentenceLength ?? "medium"] ?? LENGTH_MAP.medium;
  return `${tone} 말투 · ${formality} 표현 · ${length}으로 응답`;
}

// 칩(관련된 일기)으로 띄울 일기 메타. 답변이 인용한 [#번호] → 이 메타로 칩 생성.
type DiarySource = { id: string; title: string; createdAt: Date };

function kstDateLabel(d: Date): string {
  return d.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/** 답변 끝 [[refs: 1, 3]] 마커를 파싱·제거한다. 사용자에겐 마커가 안 보이게 본문에서 strip. */
function extractRefs(
  text: string,
  sources: Map<number, DiarySource>,
): { clean: string; indices: number[]; markerPresent: boolean } {
  const re = /\[\[\s*refs?\s*:\s*([^\]]*?)\]\]/gi;
  const found = new Set<number>();
  let markerPresent = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    markerPresent = true;
    for (const tok of m[1].split(/[\s,]+/)) {
      const num = Number(tok);
      // 제공한 목록에 없는(=지어낸) 번호는 버린다.
      if (Number.isInteger(num) && sources.has(num)) found.add(num);
    }
  }
  const clean = text
    .replace(/\[\[\s*refs?\s*:\s*[^\]]*?\]\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { clean, indices: [...found], markerPresent };
}

function buildSystemPrompt(args: {
  characterName: string;
  persona: Persona | null;
  recentDiaries: {
    id: string;
    title: string;
    content: string;
    mood: string | null;
    createdAt: Date;
  }[];
  relevant: RelevantDiary[];
}): { prompt: string; sources: Map<number, DiarySource> } {
  const { characterName, persona, recentDiaries, relevant } = args;

  // 최근 일기 먼저, 그다음 (중복 제외) 관련 일기 순으로 통합 번호([#n])를 매긴다.
  // 메이가 답변 끝에 이 번호로 근거를 표시하면 그 일기들만 칩으로 띄워 "칩 = 답변 근거"를 보장한다.
  const sources = new Map<number, DiarySource>();
  const idToIdx = new Map<string, number>();
  let n = 0;
  const indexDiary = (d: DiarySource): number => {
    const existing = idToIdx.get(d.id);
    if (existing) return existing;
    n += 1;
    sources.set(n, { id: d.id, title: d.title, createdAt: d.createdAt });
    idToIdx.set(d.id, n);
    return n;
  };

  const recentLines = recentDiaries.map((d) => {
    const idx = indexDiary(d);
    const mood = d.mood ? ` [기분: ${d.mood}]` : "";
    // 본문은 전체를 그대로 전달한다. 과거 200자 프리뷰는 일기 뒷부분에 적힌 사실
    // (장소·사람·물건 등)을 메이에게서 숨겨 "기억 못 함"·환각을 유발했다.
    return `[#${idx}] [${kstDateLabel(d.createdAt)}${mood}] ${d.title}: ${d.content}`;
  });
  const recentSection = recentLines.length
    ? recentLines.join("\n")
    : "아직 작성된 일기가 없어요.";

  const relevantLines = relevant
    .filter((d) => !idToIdx.has(d.id)) // 최근 일기에 이미 있으면 중복 표시 안 함
    .map((d) => {
      const idx = indexDiary(d);
      const mood = d.mood ? ` [기분: ${d.mood}]` : "";
      // 왜 뽑혔는지 메이에게 알려줘 정확한 근거로 답하게 한다 (날짜·키워드·의미).
      const reason = d.matchedByDate
        ? `날짜 ${d.matchedByDate} 일치`
        : d.matchedByKeyword
          ? `'${d.matchedByKeyword}' 언급`
          : `의미 유사도 ${d.similarity.toFixed(2)}`;
      // 검색으로 뽑힌 일기일수록 사용자가 바로 그 내용을 물을 확률이 높다 — 전체 본문 전달.
      return `[#${idx}] [${kstDateLabel(d.createdAt)}${mood} · ${reason}] ${d.title}: ${d.content}`;
    });
  const relatedSection = relevantLines.join("\n");

  const style = personaStyle(persona);
  const todayLabel = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const prompt = `너는 "${characterName}"이야. 사용자의 일기를 함께 기억하는 AI 친구야.
"${characterName}"는 너 자신(AI)의 이름이야. 절대 사용자를 "${characterName}"라고 부르지 마. 사용자의 이름은 모르니 이름이나 호칭으로 부르지 말고 자연스럽게 대화해.

오늘은 ${todayLabel}이야. 날짜나 시점은 반드시 오늘을 기준으로 계산해.

## 사용자의 최근 일기 (현재 기준 최신):
${recentSection}
${
  relatedSection
    ? `\n## 질문과 관련된 과거 일기 (날짜·키워드·의미로 찾음):\n${relatedSection}\n`
    : ""
}
## 가장 중요한 규칙 — 일기에 있는 내용만 말하기:
- 너는 위에 적힌 일기 내용만 알고 있어. 위 일기에 없는 구체적인 사실 — 장소·가게·교회 이름, 사람 이름, 먹은 음식, 주고받은 물건, 금액·숫자, 있었던 일 — 은 단 하나도 추측하거나 지어내지 마.
- 사용자가 물어본 내용이 위 일기에 없으면, 아는 척 만들어내지 말고 "그건 일기에 안 적혀 있는 것 같아" / "그 부분은 기록이 없네"처럼 솔직하게 말해. 모른다고 하는 게 지어내는 것보다 훨씬 낫다 — 사용자가 가장 혼란스러워하는 건 안 쓴 얘기를 사실처럼 듣는 거야.
- 위 일기 목록이 지금 이 순간의 유일한 진실 기준이야. 네가 이전 대화에서 한 말이라도 위 일기에 근거가 없으면 사실로 취급하지 마. 반대로 이전에 "일기가 없다"고 했어도 위 목록에 있으면 그게 사실이야. 항상 위 목록을 다시 확인하고 답해.

## 응답 스타일:
- ${style}.
- 사용자의 말에 먼저 공감하고, 위 일기 중 직접 관련 있는 것만 자연스럽게 언급해 (억지 연결 금지).
- '어제·그제·이번 주·지난주' 같은 상대적 시점 표현은 오늘 기준으로 실제로 맞을 때만 써라. 헷갈리면 '6월 1일'처럼 날짜로 말해. (예: 오늘이 수요일이면 이번 주 월요일은 '그제'이지 '지난주'가 아니야.)
- 담백하고 자연스러운 구어체로 말해. 과장된 감탄이나 '~했었지/~였었네' 같은 어색한 말투는 피하고, 친한 친구에게 말하듯 편하게.
- 한국어로만 대화해.
- 이모지는 1개 이내로 자연스럽게.

## 근거 표시 (시스템용 — 반드시 지켜):
- 답변을 다 쓴 뒤, 맨 마지막 줄에 방금 답변에서 실제로 근거로 삼은 일기의 [#번호]만 골라 [[refs: 1, 3]] 형식으로 적어.
- 위 일기 목록에 있는 번호만 써. 직접 근거로 언급하지 않은 일기 번호는 절대 넣지 마.
- 근거로 쓴 일기가 하나도 없으면 [[refs: none]] 이라고만 적어.
- 이 [[refs: ...]] 줄은 사용자에게 보이지 않는 시스템 표시야. 자연스러운 답변 문장 안에는 번호나 [[refs]]를 절대 쓰지 마.`;

  return { prompt, sources };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청" },
      { status: 400 },
    );
  }
  const userMessage = parsed.data.message;

  // 캐릭터 먼저 — chatResetAt(대화 경계)이 아래 history 쿼리 범위를 정한다.
  const character = await prisma.character.findUnique({
    where: { userId: session.userId },
    select: { id: true, subscriptionStatus: true, chatResetAt: true },
  });
  if (!character) {
    return NextResponse.json({ error: "캐릭터를 찾을 수 없어요" }, { status: 404 });
  }

  // 모델 컨텍스트는 "현재 대화"만 — 경계(chatResetAt) 이후, 없으면 최근 24h. 표시(영구)와 분리.
  const contextFloor =
    character.chatResetAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [recentDiaries, recentHistory, persona, relevant] = await Promise.all([
    prisma.diary.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        mood: true,
        createdAt: true,
      },
    }),
    prisma.chatMessage.findMany({
      where: {
        userId: session.userId,
        createdAt: { gte: contextFloor },
      },
      orderBy: { createdAt: "desc" }, // 최근 20개를 집으려 desc → 사용 시 reverse
      take: 20,
      select: { role: true, content: true },
    }),
    prisma.userPersona.findUnique({
      where: { userId: session.userId },
      select: { tone: true, formality: true, sentenceLength: true },
    }),
    // 하이브리드 검색(의미+날짜+키워드). 실패해도 chat 전체를 막지 않는다 (best-effort).
    findRelevantDiaries(session.userId, userMessage, {
      now: new Date(),
      topK: 5,
    }).catch((e) => {
      console.warn(
        "[chat] relevant-diary search failed:",
        e instanceof Error ? e.message : e,
      );
      return [] as RelevantDiary[];
    }),
  ]);

  const cap = await checkAndIncrement(session.userId, character.subscriptionStatus);
  if (!cap.allowed) {
    return NextResponse.json(
      {
        error: "오늘 AI 사용 횟수를 모두 사용했어요. 내일 다시 만나요.",
        capExhausted: true,
      },
      { status: 429 },
    );
  }

  const { prompt: systemPrompt, sources } = buildSystemPrompt({
    characterName: CHARACTER_NAME,
    persona,
    recentDiaries,
    relevant,
  });
  const history = recentHistory
    .slice()
    .reverse() // desc 조회 → 시간순(오래된→최신)
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      role: (m.role === "USER" ? "user" : "model") as "user" | "model",
      text: m.content,
    }));

  let rawAssistant: string;
  try {
    rawAssistant = await chat({
      systemPrompt,
      history,
      query: userMessage,
    });
  } catch (e) {
    console.error("[chat] Gemini error:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "메이가 잠시 응답하지 못했어요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }

  // 답변 끝 [[refs]] 마커를 떼어내고(사용자에겐 안 보임), 메이가 인용한 번호로만 칩을 만든다.
  // → 칩 = 답변 근거. 날짜 갭·불일치가 구조적으로 사라진다.
  const RELATED_CHIP_MAX = 4;
  const { clean, indices, markerPresent } = extractRefs(rawAssistant, sources);
  const assistantText = clean || rawAssistant.trim();

  const relatedDiaries: { id: string; title: string; createdAt: string }[] =
    markerPresent
      ? indices
          .map((i) => sources.get(i))
          .filter((s): s is DiarySource => Boolean(s))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, RELATED_CHIP_MAX)
          .map((s) => ({
            id: s.id,
            title: s.title,
            createdAt: s.createdAt.toISOString(),
          }))
      : // 마커 누락(모델 실패) 시 fallback: 날짜·키워드로 '직접' 찾은 일기만 (의미-only 제외 → 날짜갭 방지).
        relevant
          .filter((d) => d.matchedByDate !== null || d.matchedByKeyword !== null)
          .slice(0, RELATED_CHIP_MAX)
          .map((d) => ({
            id: d.id,
            title: d.title,
            createdAt: d.createdAt.toISOString(),
          }));

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        userId: session.userId,
        characterId: character.id,
        role: "USER",
        content: userMessage,
      },
    }),
    prisma.chatMessage.create({
      data: {
        userId: session.userId,
        characterId: character.id,
        role: "ASSISTANT",
        content: assistantText,
        relatedDiaries, // 답변과 함께 영구 저장 — 새로고침/스크롤 back 해도 칩 유지 ([]=칩 없음)
      },
    }),
  ]);

  await captureServer("chat_message_sent", session.userId, {
    message_length: userMessage.length,
    rag_hits: relevant.length,
    cap_remaining: cap.remaining,
  });
  return NextResponse.json({
    message: assistantText,
    capRemaining: cap.remaining,
    relatedDiaries,
  });
}
