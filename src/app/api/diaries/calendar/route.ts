import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDiariesForMonth } from "@/lib/diary/queries";

// GET /api/diaries/calendar?month=YYYY-MM → 그 KST 월의 날짜별 일기.
// 월 네비(화살표/스와이프) 시 클라이언트가 호출. 초기 월은 페이지가 prefetch.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthParam = req.nextUrl.searchParams.get("month") ?? "";
  const matched = /^(\d{4})-(\d{2})$/.exec(monthParam);
  if (!matched) {
    return NextResponse.json(
      { error: "month=YYYY-MM 형식이 필요합니다" },
      { status: 400 },
    );
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "잘못된 월" }, { status: 400 });
  }

  const data = await getDiariesForMonth(session.userId, year, month);
  return NextResponse.json(data);
}
