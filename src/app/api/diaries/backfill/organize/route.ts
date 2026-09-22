import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { organizeBackfillDay } from "@/lib/diary/backfill";

/**
 * AI 재시도까지 끝낼 시간을 함수에 준다.
 *
 * 최악: 일기 타임아웃 35s + backoff 0.6s + 재시도 35s ≒ 71s (+ 사진 다운로드).
 * 이 값을 안 적으면 플랫폼 기본값에 매달리게 되고, 모델을 기다리다 함수가 먼저
 * 죽으면 재시도가 아무 의미가 없어진다.
 */
export const maxDuration = 90;

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
    //
    // AI 실패("error")만 503이다. 재료 없음·펜스 차단은 다시 불러도 같은 결과라
    // 400이 맞지만, 업스트림 지연까지 400으로 나가면 "클라이언트가 잘못 보냈다"로
    // 읽혀 로그에서 구분되지 않는다. 클라이언트는 res.ok와 reason만 보므로
    // (backfill-client.tsx) 이 숫자 변경은 순회 동작에 영향이 없다.
    const status = r.reason === "cap" ? 429 : r.reason === "error" ? 503 : 400;
    return NextResponse.json({ error: r.error, reason: r.reason }, { status });
  }
  return NextResponse.json({ diaryId: r.diaryId, title: r.title });
}
