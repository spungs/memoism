import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/ai/gemini";
import { checkAndIncrement } from "@/lib/ai/usage";

const messageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "메시지를 입력해주세요")
    .max(2000, "메시지는 2000자 이내여야 합니다"),
});

function buildSystemPrompt(
  characterName: string,
  diaries: { title: string; content: string; mood: string | null; createdAt: Date }[],
): string {
  const diaryContext =
    diaries.length === 0
      ? "아직 작성된 일기가 없어요."
      : diaries
          .map((d) => {
            const date = d.createdAt.toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            const mood = d.mood ? ` [기분: ${d.mood}]` : "";
            const preview = d.content.slice(0, 200) + (d.content.length > 200 ? "…" : "");
            return `[${date}${mood}] ${d.title}: ${preview}`;
          })
          .join("\n");

  return `너는 "${characterName}"이야. 사용자의 일기를 함께 기억하는 따뜻한 AI 친구야.

## 사용자의 최근 일기 기록 (현재 기준 최신 데이터):
${diaryContext}

중요: 위 일기 목록은 지금 이 순간의 실제 데이터야. 이전 대화에서 일기가 없다고 말했더라도, 위 목록에 일기가 있으면 그게 사실이야. 항상 위 목록을 기준으로 대답해.

## 대화 규칙:
- 1~3문장으로 짧고 따뜻하게 공감해줘.
- 사용자가 한 말에 공감하고, 필요하면 관련 일기 내용을 자연스럽게 언급해.
- 일기에 없는 내용을 꾸며내거나 단정 짓지 마.
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

  const [character, recentDiaries, recentHistory] = await Promise.all([
    prisma.character.findUnique({
      where: { userId: session.userId },
      select: { id: true, name: true, subscriptionStatus: true },
    }),
    prisma.diary.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { title: true, content: true, mood: true, createdAt: true },
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
  ]);

  if (!character) {
    return NextResponse.json({ error: "캐릭터를 찾을 수 없어요" }, { status: 404 });
  }

  // Cap 검증·증분 (베타 ACTIVE → BASIC 10회/일). 호출 전 차감 → 실패해도 cap 카운트.
  // 정상 사용자 영향은 미미(Gemini 99%+ 가용). V2에서 정교화 고려.
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

  const systemPrompt = buildSystemPrompt(character.name, recentDiaries);
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

  return NextResponse.json({
    message: assistantText,
    capRemaining: cap.remaining,
  });
}
