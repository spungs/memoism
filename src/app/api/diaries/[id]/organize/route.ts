import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { organizeDiaryFromFragments } from "@/lib/diary/organize";
import { MAX_AI_INSTRUCTION_LENGTH } from "@/lib/diary/ai-instruction";

const bodySchema = z.object({
  instruction: z.string().max(MAX_AI_INSTRUCTION_LENGTH).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // body는 선택이다 — 제안 카드는 아무것도 안 보낸다. 형식 오류만 구분해서 막는다.
  // 조용히 무시하면 사용자는 자기 지시가 반영된 줄 안다.
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    raw = null;
  }
  let options: z.infer<typeof bodySchema> = {};
  if (raw !== null) {
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "잘못된 요청 형식이에요" },
        { status: 400 },
      );
    }
    options = parsed.data;
  }

  const { id } = await params;
  const result = await organizeDiaryFromFragments(id, session.userId, options);

  if (!result.ok) {
    const status = result.capExhausted ? 429 : result.nothingToFold ? 400 : 500;
    return NextResponse.json(
      {
        error: result.error,
        capExhausted: result.capExhausted,
        nothingToFold: result.nothingToFold,
      },
      { status },
    );
  }

  // 결과 칩을 대화에 남긴다. 제안 카드와 달리 이건 *일어난 사실*이라 새로고침 후에도
  // 보여야 한다. 하드룰(단일 원본)에 따라 정리된 산문은 복사하지 않고 포인터만 둔다 —
  // relatedDiaries는 ASSISTANT 메시지의 기존 일기 칩 규약이라 렌더가 그대로 동작한다.
  let chatMessage: {
    id: string;
    role: "assistant";
    content: string;
    createdAt: string;
    relatedDiaries: Array<{ id: string; title: string; createdAt: string }>;
  } | null = null;

  try {
    const character = await prisma.character.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (character) {
      const created = await prisma.chatMessage.create({
        data: {
          userId: session.userId,
          characterId: character.id,
          role: "ASSISTANT",
          content: `${result.label} 일기로 정리했어.`,
          relatedDiaries: [
            {
              id: result.diary.id,
              title: result.diary.title,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        select: { id: true, content: true, createdAt: true },
      });
      chatMessage = {
        id: created.id,
        role: "assistant",
        content: created.content,
        createdAt: created.createdAt.toISOString(),
        relatedDiaries: [
          {
            id: result.diary.id,
            title: result.diary.title,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
  } catch {
    // 칩 저장은 부가 기능이다 — 정리 자체는 이미 성공했으므로 실패를 전파하지 않는다.
    // 클라이언트는 chatMessage가 null이면 낙관적 메시지만 띄운다(새로고침하면 사라짐).
  }

  return NextResponse.json({
    diary: result.diary,
    foldedCount: result.foldedCount,
    skippedCount: result.skippedCount,
    dateKey: result.dateKey,
    label: result.label,
    chatMessage,
  });
}
