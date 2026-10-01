import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getRequestTimeZone } from "@/lib/tz-server";
import { findUnfoldedDiary, listUnfoldedDiaries } from "@/lib/diary/queries";
import { unauthorized } from "@/lib/auth/unauthorized";

/**
 * 메이 채팅의 "정리해줄까?" 제안 대상 조회.
 *
 * 제안은 `foldedAt IS NULL`에서 파생되는 *상태*라 저장하지 않고 매번 묻는다.
 * 저장하면 정리한 뒤에도 대화에 남아, 누르면 "정리할 조각이 없어요"가 뜬다.
 *
 * `days`는 한번에 정리할 지난 날 목록(최근 날짜순)이다. 화면은 2일 이상일 때만 쓴다.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }
  const timeZone = await getRequestTimeZone();
  const [suggestion, days] = await Promise.all([
    findUnfoldedDiary(session.userId, timeZone),
    listUnfoldedDiaries(session.userId, timeZone),
  ]);
  return NextResponse.json({ suggestion, days });
}
