import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { organizeDiaryFromFragments } from "@/lib/diary/organize";
import { MAX_AI_INSTRUCTION_LENGTH } from "@/lib/diary/ai-instruction";

const bodySchema = z.object({
  instruction: z.string().max(MAX_AI_INSTRUCTION_LENGTH).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // body는 선택이다 — 제안 카드는 아무것도 안 보낸다. 형식 오류만 구분해서 막는다.
  // 조용히 무시하면 사용자는 자기 지시가 반영된 줄 안다.
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    raw = null;
  }
  let options: z.infer<typeof bodySchema> = {};
  if (raw !== null) {
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "잘못된 요청 형식이에요" },
        { status: 400 },
      );
    }
    options = parsed.data;
  }

  const { id } = await params;
  const result = await organizeDiaryFromFragments(id, session.userId, options);

  if (!result.ok) {
    const status = result.capExhausted ? 429 : result.nothingToFold ? 400 : 500;
    return NextResponse.json(
      {
        error: result.error,
        capExhausted: result.capExhausted,
        nothingToFold: result.nothingToFold,
      },
      { status },
    );
  }

  return NextResponse.json({
    diary: result.diary,
    foldedCount: result.foldedCount,
    skippedCount: result.skippedCount,
  });
}
