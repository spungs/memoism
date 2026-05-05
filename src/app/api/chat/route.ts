import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:e2b";

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
  const userMessage: string = body?.message?.trim() ?? "";
  if (!userMessage) {
    return NextResponse.json({ error: "메시지를 입력해주세요" }, { status: 400 });
  }

  const [character, recentDiaries, recentHistory] = await Promise.all([
    prisma.character.findUnique({ where: { userId: session.userId } }),
    prisma.diary.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { title: true, content: true, mood: true, createdAt: true },
    }),
    prisma.chatMessage.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { role: true, content: true },
    }),
  ]);

  if (!character) {
    return NextResponse.json({ error: "캐릭터를 찾을 수 없어요" }, { status: 404 });
  }

  const systemPrompt = buildSystemPrompt(character.name, recentDiaries);

  const historyMessages = recentHistory
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }));

  const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!ollamaRes.ok) {
    const err = await ollamaRes.text().catch(() => "unknown");
    console.error("Ollama error:", err);
    return NextResponse.json({ error: "AI 응답 생성에 실패했어요" }, { status: 502 });
  }

  const ollamaData = await ollamaRes.json();
  const assistantText: string = ollamaData?.message?.content ?? "";
  if (!assistantText) {
    return NextResponse.json({ error: "AI 응답이 비어있어요" }, { status: 502 });
  }

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: { userId: session.userId, characterId: character.id, role: "USER", content: userMessage },
    }),
    prisma.chatMessage.create({
      data: { userId: session.userId, characterId: character.id, role: "ASSISTANT", content: assistantText },
    }),
  ]);

  return NextResponse.json({ message: assistantText });
}
