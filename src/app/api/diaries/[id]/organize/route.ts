import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { organizeDiaryFromFragments } from "@/lib/diary/organize";
import { MAX_AI_INSTRUCTION_LENGTH } from "@/lib/diary/ai-instruction";

/**
 * AI 재시도까지 끝낼 시간을 함수에 준다.
 *
 * 최악: 일기 타임아웃 35s + backoff 0.6s + 재시도 35s ≒ 71s (+ 사진 다운로드).
 * 이 값을 안 적으면 플랫폼 기본값에 매달리게 되고, 모델을 기다리다 함수가 먼저
 * 죽으면 재시도가 아무 의미가 없어진다.
 */
export const maxDuration = 90;

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
    // 남은 실패는 대부분 업스트림(Gemini) 지연·거부다. 500은 "이 서버가 깨졌다"는
    // 뜻이라 regenerate와 같은 오분류를 만든다 — 503으로 보낸다.
    const status = result.capExhausted ? 429 : result.nothingToFold ? 400 : 503;
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
  // 답변만 덩그러니 남으면 사용자가 뭘 시켜서 나온 말인지 알 수 없다 —
  // 앞에 사용자의 요청 말풍선을 같이 남긴다.
  let userChatMessage: {
    id: string;
    role: "user";
    content: string;
    createdAt: string;
  } | null = null;

  try {
    const character = await prisma.character.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (character) {
      const userContent = `${result.dateKey} 조각 정리해줘`;
      // createdAt을 명시한다. @default(now())는 Postgres now()로 컴파일되고 now()는
      // **트랜잭션 시작 시각**을 돌려주므로, 한 트랜잭션 안의 두 행이 밀리초까지 같아진다.
      // 그러면 createdAt 정렬이 순서를 보장하지 못해 답변이 요청보다 먼저 보인다.
      const sentAt = new Date();
      const [userCreated, created] = await prisma.$transaction([
        prisma.chatMessage.create({
          data: {
            userId: session.userId,
            characterId: character.id,
            role: "USER",
            content: userContent,
            createdAt: sentAt,
          },
          select: { id: true, content: true, createdAt: true },
        }),
        prisma.chatMessage.create({
          data: {
            userId: session.userId,
            characterId: character.id,
            role: "ASSISTANT",
            content: `${result.label} 일기로 정리했어.`,
            relatedDiaries: [
              {
                id: result.diary.id,
                title: result.diary.title,
                // 정리한 시각이 아니라 *일기의 날짜*다. 8월 3일 일기를 오늘 정리하면
                // 칩에 오늘 날짜가 찍혀서 눌렀을 때 나오는 일기와 어긋난다.
                createdAt: result.diaryCreatedAt,
              },
            ],
            createdAt: new Date(sentAt.getTime() + 1),
          },
          select: { id: true, content: true, createdAt: true },
        }),
      ]);
      userChatMessage = {
        id: userCreated.id,
        role: "user",
        content: userCreated.content,
        createdAt: userCreated.createdAt.toISOString(),
      };
      chatMessage = {
        id: created.id,
        role: "assistant",
        content: created.content,
        createdAt: created.createdAt.toISOString(),
        relatedDiaries: [
          {
            id: result.diary.id,
            title: result.diary.title,
            createdAt: result.diaryCreatedAt,
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
    diaryCreatedAt: result.diaryCreatedAt,
    userChatMessage,
    chatMessage,
  });
}
