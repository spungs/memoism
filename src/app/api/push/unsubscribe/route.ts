import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { unsubscribeSchema } from "@/lib/push/schemas";

// Web Push 구독 해제 (NEW-15). 본인 소유 구독만 삭제한다.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청이에요" },
      { status: 400 },
    );
  }

  // userId 조건으로 타인 소유 구독은 삭제하지 못하게 한다.
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: session.userId },
  });

  return NextResponse.json({ ok: true });
}
