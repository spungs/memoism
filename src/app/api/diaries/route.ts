import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDiaries } from "@/lib/diary/queries";

// JSON list endpoint used by TanStack Query for client refetch / cache hydration.
// Mutations go through server actions in src/lib/diary/actions.ts.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const takeParam = req.nextUrl.searchParams.get("take");
  const take = takeParam ? Number.parseInt(takeParam, 10) : undefined;

  const page = await getDiaries(session.userId, {
    cursor,
    take: Number.isFinite(take) ? take : undefined,
  });

  return NextResponse.json(page);
}
