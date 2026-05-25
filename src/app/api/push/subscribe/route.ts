import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { pushSubscriptionSchema } from "@/lib/push/schemas";

// Web Push 구독 등록 (NEW-15). 클라이언트가 pushManager.subscribe() 결과를 POST.
// endpoint 기준 upsert — 같은 기기/브라우저가 재구독해도 행이 중복되지 않는다.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 구독 정보예요" },
      { status: 400 },
    );
  }

  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      // 동일 endpoint가 다른 계정으로 재구독될 수 있으니 소유자/키를 갱신.
      userId: session.userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}
