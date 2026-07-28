import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { captureServer } from "@/lib/analytics/server";
import { regenerateDiary } from "@/lib/diary/regenerate";
import { MAX_AI_INPUT_CONTENT_LENGTH } from "@/lib/diary/schemas";
import { MAX_AI_INSTRUCTION_LENGTH } from "@/lib/diary/ai-instruction";

// body는 선택이다. 없으면 DB 본문 기준으로 재정리한다(구 동작).
// content가 오면 그게 "화면에서 편집 중인 현재 본문"이라 그대로 AI 입력이 된다.
const bodySchema = z.object({
  content: z.string().max(MAX_AI_INPUT_CONTENT_LENGTH).optional(),
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

  // body 자체가 없는 것(구 클라이언트)과 형식이 틀린 것은 구분한다.
  // 형식 오류를 조용히 무시하면 사용자는 자기 수정이 반영된 줄 알게 된다.
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
  const result = await regenerateDiary(id, session.userId, options);

  if (!result.ok) {
    const status = result.capExhausted ? 429 : result.invalidInput ? 400 : 502;
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
