import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { organizeBackfillDay } from "@/lib/diary/backfill";

const bodySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * 밀린 날 채우기 ② — 한 날짜만 정리한다.
 *
 * 날짜별로 쪼갠 이유(스펙 §9): 14일치를 한 요청으로 묶으면 최대 70초 동안 화면이
 * 묶이고 진행 상황도 알 수 없다. 쪼개면 클라이언트가 진행률을 보여주고 중단할 수
 * 있으며, 한 날이 실패해도 나머지가 이어진다.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
  }

  const r = await organizeBackfillDay(session.userId, parsed.data.dateKey);
  if (!r.ok) {
    // 캡 소진은 429 — 클라이언트가 이걸 보고 남은 날짜 순회를 멈춘다.
    // 나머지 이유는 그 날만 건너뛰고 계속 간다.
    const status = r.reason === "cap" ? 429 : 400;
    return NextResponse.json({ error: r.error, reason: r.reason }, { status });
  }
  return NextResponse.json({ diaryId: r.diaryId, title: r.title });
}
