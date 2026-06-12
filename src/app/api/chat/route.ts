import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/ai/gemini";
import { searchDiaries, type RagSearchHit } from "@/lib/ai/rag";
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

function formatRecent(
  diaries: { title: string; content: string; mood: string | null; createdAt: Date }[],
): string {
  if (diaries.length === 0) return "아직 작성된 일기가 없어요.";
  return diaries
    .map((d) => {
      const date = d.createdAt.toLocaleDateString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      });
      const mood = d.mood ? ` [기분: ${d.mood}]` : "";
      // 본문은 전체를 그대로 전달한다. 과거 200자 프리뷰는 일기 뒷부분에 적힌 사실
      // (장소·사람·물건 등)을 메이에게서 숨겨 "기억 못 함"·환각을 유발했다.
      return `[${date}${mood}] ${d.title}: ${d.content}`;
    })
    .join("\n");
}

function formatRelated(hits: RagSearchHit[], excludeIds: Set<string>): string {
  const filtered = hits.filter((h) => !excludeIds.has(h.id));
  if (filtered.length === 0) return "";
  return filtered
    .map((h) => {
      const date = h.createdAt.toLocaleDateString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      });
      const mood = h.mood ? ` [기분: ${h.mood}]` : "";
      const score = h.similarity.toFixed(2);
      // 검색으로 뽑힌 일기일수록 사용자가 바로 그 내용을 물을 확률이 높다 — 전체 본문 전달.
      return `[${date}${mood} · 유사도 ${score}] ${h.title}: ${h.content}`;
    })
    .join("\n");
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
  relatedHits: RagSearchHit[];
}): string {
  const { characterName, persona, recentDiaries, relatedHits } = args;
  const recentSection = formatRecent(recentDiaries);
  const recentIds = new Set(recentDiaries.map((d) => d.id));
  const relatedSection = formatRelated(relatedHits, recentIds);
  const style = personaStyle(persona);
  const todayLabel = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return `너는 "${characterName}"이야. 사용자의 일기를 함께 기억하는 AI 친구야.
"${characterName}"는 너 자신(AI)의 이름이야. 절대 사용자를 "${characterName}"라고 부르지 마. 사용자의 이름은 모르니 이름이나 호칭으로 부르지 말고 자연스럽게 대화해.

오늘은 ${todayLabel}이야. 날짜나 시점은 반드시 오늘을 기준으로 계산해.

## 사용자의 최근 일기 (현재 기준 최신):
${recentSection}
${
  relatedSection
    ? `\n## 사용자의 메시지와 의미적으로 가까운 과거 일기:\n${relatedSection}\n`
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
- 이모지는 1개 이내로 자연스럽게.`;
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

  const [character, recentDiaries, recentHistory, persona, relatedHits] =
    await Promise.all([
      prisma.character.findUnique({
        where: { userId: session.userId },
        select: { id: true, subscriptionStatus: true },
      }),
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
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: { role: true, content: true },
      }),
      prisma.userPersona.findUnique({
        where: { userId: session.userId },
        select: { tone: true, formality: true, sentenceLength: true },
      }),
      // RAG는 실패해도 chat 전체를 막지 않는다 (best-effort).
      searchDiaries(session.userId, userMessage, { topK: 5 }).catch((e) => {
        console.warn(
          "[chat] RAG search failed:",
          e instanceof Error ? e.message : e,
        );
        return [] as RagSearchHit[];
      }),
    ]);

  if (!character) {
    return NextResponse.json({ error: "캐릭터를 찾을 수 없어요" }, { status: 404 });
  }

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

  const systemPrompt = buildSystemPrompt({
    characterName: CHARACTER_NAME,
    persona,
    recentDiaries,
    relatedHits,
  });
  const history = recentHistory
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      role: (m.role === "USER" ? "user" : "model") as "user" | "model",
      text: m.content,
    }));

  let assistantText: string;
  try {
    assistantText = await chat({
      systemPrompt,
      history,
      query: userMessage,
    });
  } catch (e) {
    console.error("[chat] Gemini error:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요. (AI 응답 실패)" },
      { status: 502 },
    );
  }

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
      },
    }),
  ]);

  const RELATED_CHIP_THRESHOLD = 0.7;
  const RELATED_CHIP_MAX = 3;
  const relatedDiaries = relatedHits
    .filter((h) => h.similarity >= RELATED_CHIP_THRESHOLD)
    .slice(0, RELATED_CHIP_MAX)
    .map((h) => ({ id: h.id, title: h.title, createdAt: h.createdAt.toISOString() }));

  await captureServer("chat_message_sent", session.userId, {
    message_length: userMessage.length,
    rag_hits: relatedHits.length,
    cap_remaining: cap.remaining,
  });
  return NextResponse.json({
    message: assistantText,
    capRemaining: cap.remaining,
    relatedDiaries,
  });
}
