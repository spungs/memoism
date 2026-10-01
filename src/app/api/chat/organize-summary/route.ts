import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/auth/unauthorized";
import { withJsonErrors } from "@/lib/http/with-json-errors";
import { MAX_ORGANIZE_ALL_DAYS, organizeAllReply } from "@/lib/diary/organize-all";

const count = z.number().int().min(0).max(MAX_ORGANIZE_ALL_DAYS);
const bodySchema = z.object({
  /** 정리에 성공한 일기들. */
  diaryIds: z.array(z.string().min(1).max(64)).min(1).max(MAX_ORGANIZE_ALL_DAYS),
  failedCount: count,
  capStoppedCount: count,
});

/**
 * 한번에 정리하기의 결과 말풍선 한 쌍을 남긴다.
 *
 * 정리 자체는 화면이 날마다 `/api/diaries/[id]/organize`(skipChat)를 불러 끝냈다. 한 번에
 * 몰아 하면 함수 시간 제한(90초)에 걸리고 진행 상황도 못 보여준다. 여기서는 그 결과를
 * 하루 정리와 같은 규약(사용자 요청 + 메이 답 + 일기 칩)으로 남기기만 한다.
 */
async function handlePOST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = null;
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청 형식이에요" }, { status: 400 });
  }
  const { diaryIds, failedCount, capStoppedCount } = parsed.data;

  // 칩은 본인 일기만 — 남의 id를 섞어 보내도 제목이 새지 않는다.
  const [diaries, character] = await Promise.all([
    prisma.diary.findMany({
      where: { id: { in: diaryIds }, userId: session.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.character.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    }),
  ]);
  if (diaries.length === 0 || !character) {
    return NextResponse.json({ error: "정리한 일기를 찾을 수 없어요" }, { status: 404 });
  }

  const relatedDiaries = diaries.map((d) => ({
    id: d.id,
    title: d.title,
    // 정리한 시각이 아니라 *일기의 날짜*다(하루 정리와 같은 규약).
    createdAt: d.createdAt.toISOString(),
  }));
  // createdAt을 명시하는 이유는 하루 정리 경로와 같다 — 한 트랜잭션의 now()는 같아서
  // 정렬이 순서를 보장하지 못한다.
  const sentAt = new Date();
  const [userCreated, created] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        userId: session.userId,
        characterId: character.id,
        role: "USER",
        content: "조각 한번에 정리해줘",
        createdAt: sentAt,
      },
      select: { id: true, content: true, createdAt: true },
    }),
    prisma.chatMessage.create({
      data: {
        userId: session.userId,
        characterId: character.id,
        role: "ASSISTANT",
        content: organizeAllReply(diaries.length, failedCount, capStoppedCount),
        relatedDiaries,
        createdAt: new Date(sentAt.getTime() + 1),
      },
      select: { id: true, content: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    userChatMessage: {
      id: userCreated.id,
      role: "user",
      content: userCreated.content,
      createdAt: userCreated.createdAt.toISOString(),
    },
    chatMessage: {
      id: created.id,
      role: "assistant",
      content: created.content,
      createdAt: created.createdAt.toISOString(),
      relatedDiaries,
    },
  });
}

// 처리 못 한 예외도 JSON으로 — 화면이 res.json()에서 터지지 않게(점검 M8).
export const POST = withJsonErrors(handlePOST);
