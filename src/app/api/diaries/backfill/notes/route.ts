import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { saveBackfillNotes } from "@/lib/diary/backfill";
import { MAX_AI_INPUT_CONTENT_LENGTH } from "@/lib/diary/schemas";

const bodySchema = z.object({
  notes: z
    .array(
      z.object({
        dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        // 메모는 정리 재료다 — 정리 입력 상한을 넘으면 organize가 어차피 못 넣는다.
        text: z.string().trim().min(1).max(MAX_AI_INPUT_CONTENT_LENGTH),
      }),
    )
    .min(1),
});

/**
 * 밀린 날 채우기 ①-0 — 날짜별 메모를 그날 일기의 조각으로 저장한다.
 *
 * 사진과 따로 받는 이유: 사진 요청은 4.5MB 한도 때문에 바이트로 쪼개져 여러 번
 * 가는데, 메모는 날짜 단위라 쪼갤 기준이 다르다. 작은 JSON 한 번이면 끝난다.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "메모 형식이 잘못됐어요" }, { status: 400 });
  }

  const r = await saveBackfillNotes(session.userId, parsed.data.notes);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ diaryIds: r.diaryIds });
}
