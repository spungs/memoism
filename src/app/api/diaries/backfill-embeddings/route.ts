import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { backfillUserEmbeddings } from "@/lib/diary/embedding";

// 본인 일기 중 임베딩 누락분을 채움. dev/staging 일회성 사용.
// V2에서는 background queue로 자동화.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await backfillUserEmbeddings(session.userId);
  return NextResponse.json(result);
}
