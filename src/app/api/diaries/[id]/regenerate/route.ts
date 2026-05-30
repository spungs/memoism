import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { captureServer } from "@/lib/analytics/server";
import { regenerateDiary } from "@/lib/diary/regenerate";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await regenerateDiary(id, session.userId);

  if (!result.ok) {
    const status = result.capExhausted ? 429 : 502;
    return NextResponse.json(
      {
        error: result.error,
        capExhausted: result.capExhausted ?? false,
      },
      { status },
    );
  }

  await captureServer("ai_regenerated", session.userId, { diary_id: id });
  return NextResponse.json({ diary: result.diary });
}
