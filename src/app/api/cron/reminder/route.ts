import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sendPushToSubscriptions } from "@/lib/push/web-push";
import { CHARACTER_NAME } from "@/lib/character/utils";

// 22:00 KST 리마인드 Web Push 발송 (NEW-15).
// Vercel Cron이 vercel.json의 스케줄(13:00 UTC = 22:00 KST)에 따라 GET으로 호출하며,
// `Authorization: Bearer ${CRON_SECRET}` 헤더를 보낸다.
//
// 중요: 이 라우트는 src/middleware.ts에서 `/api/cron` 경로 우회 처리가 필요하다.
//   미들웨어는 인증 안 된 /api/* 요청에 401을 반환하므로, Cron(쿠키 없음)이
//   여기까지 도달하려면 /api/cron 을 PUBLIC_PATHS에 추가해야 한다 (부모가 추가 예정).
//   본 핸들러는 CRON_SECRET으로 자체 인증한다.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await prisma.pushSubscription.findMany({
    select: { endpoint: true, p256dh: true, auth: true },
  });

  // 구독 0건이어도 정상 종료.
  const { sent, pruned } = await sendPushToSubscriptions(subs, {
    title: CHARACTER_NAME,
    body: "오늘 하루도 수고했어요. 1분만 남겨볼까요?",
    url: "/diary/new",
  });

  return NextResponse.json({ sent, pruned });
}
