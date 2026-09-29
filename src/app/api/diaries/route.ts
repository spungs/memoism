import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getDiariesWithThumbnails } from "@/lib/diary/queries";
import { unauthorized } from "@/lib/auth/unauthorized";

// 0·음수면 마지막 항목 인덱스가 -1이 되어 500이 났다(점검 L3).
const takeSchema = z.coerce.number().int().min(1).max(100);

// JSON list endpoint used by TanStack Query for client refetch / cache hydration.
// Mutations go through server actions in src/lib/diary/actions.ts.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const takeParam = req.nextUrl.searchParams.get("take");
  let take: number | undefined;
  if (takeParam !== null) {
    const parsed = takeSchema.safeParse(takeParam);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "take는 1~100 사이의 정수여야 해요" },
        { status: 400 },
      );
    }
    take = parsed.data;
  }

  const page = await getDiariesWithThumbnails(session.userId, { cursor, take });

  return NextResponse.json(page);
}
