import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { captureServer } from "@/lib/analytics/server";
import { regenerateDiary } from "@/lib/diary/regenerate";
import {
  MAX_AI_INPUT_CONTENT_LENGTH,
  MAX_DIARY_TITLE_LENGTH,
} from "@/lib/diary/schemas";
import { MAX_AI_INSTRUCTION_LENGTH } from "@/lib/diary/ai-instruction";

// body는 선택이다. 없으면 DB 본문 기준으로 재정리한다(구 동작).
// content가 오면 그게 "화면에서 편집 중인 현재 본문"이라 그대로 AI 입력이 된다.
// title이 오고 DB 제목과 다르면 사용자가 고친 것이므로 AI 제목으로 덮어쓰지 않는다.
const bodySchema = z.object({
  content: z.string().max(MAX_AI_INPUT_CONTENT_LENGTH).optional(),
  title: z.string().max(MAX_DIARY_TITLE_LENGTH).optional(),
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
      // 길이 초과는 흔한 실패라 따로 안내한다. "잘못된 요청 형식"만 보면
      // 사용자가 무엇을 고쳐야 할지 알 수 없다.
      const tooLong = parsed.error.issues.some(
        (i) => i.path[0] === "content" && i.code === "too_big",
      );
      return NextResponse.json(
        {
          error: tooLong
            ? `일기가 너무 길어요. ${MAX_AI_INPUT_CONTENT_LENGTH}자 이내만 AI가 정리할 수 있어요.`
            : "잘못된 요청 형식이에요",
        },
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
