import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// "새 대화하기" — 대화 맥락 경계를 새로 긋는다 (비파괴).
//   기록은 영구 보존·열람되므로 삭제하지 않고, 이 시각(chatResetAt) 이후 메시지만
//   메이 컨텍스트로 쓴다. 이전 환각이 history에 남아 반복되던 문제는 경계로 끊는다.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.character.update({
    where: { userId: session.userId },
    data: { chatResetAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
