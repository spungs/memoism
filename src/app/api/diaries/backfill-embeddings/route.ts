import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { backfillUserEmbeddings } from "@/lib/diary/embedding";
import { unauthorized } from "@/lib/auth/unauthorized";

// 본인 일기 중 임베딩 누락분을 채움. dev/staging 일회성 사용.
// V2에서는 background queue로 자동화.
//
// 운영에서는 닫는다. 로그인한 누구나 rate limit 없이 임베딩 API를 반복 호출할 수 있었고,
// 실패 원문(errors[].error)을 그대로 돌려줬다(점검 L7).
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  const result = await backfillUserEmbeddings(session.userId);
  return NextResponse.json(result);
}
