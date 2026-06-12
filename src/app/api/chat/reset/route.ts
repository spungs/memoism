import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// "새 대화하기" — 본인 메이 대화 기록을 비운다.
//   채팅은 24h 슬라이딩 윈도우 컨텍스트 용도일 뿐 영구 보관/열람 기능이 없으므로
//   하드 삭제로 깔끔히 초기화한다. 이전 환각이 history에 남아 반복되던 문제를 끊는다.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.chatMessage.deleteMany({ where: { userId: session.userId } });
  return NextResponse.json({ ok: true });
}
