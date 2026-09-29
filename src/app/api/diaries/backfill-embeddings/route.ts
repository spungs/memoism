import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { backfillUserEmbeddings } from "@/lib/diary/embedding";
import { unauthorized } from "@/lib/auth/unauthorized";

// 본인 일기 중 임베딩 누락분을 채움. dev/staging 일회성 사용.
// V2에서는 background queue로 자동화.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  const result = await backfillUserEmbeddings(session.userId);
  return NextResponse.json(result);
}
