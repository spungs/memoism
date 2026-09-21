import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findUnfoldedDiary } from "@/lib/diary/queries";

/**
 * 메이 채팅의 "정리해줄까?" 제안 대상 조회.
 *
 * 제안은 `foldedAt IS NULL`에서 파생되는 *상태*라 저장하지 않고 매번 묻는다.
 * 저장하면 정리한 뒤에도 대화에 남아, 누르면 "정리할 조각이 없어요"가 뜬다.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const suggestion = await findUnfoldedDiary(session.userId);
  return NextResponse.json({ suggestion });
}
