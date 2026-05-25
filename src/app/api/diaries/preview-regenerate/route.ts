import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { previewGenerateDiary } from "@/lib/diary/preview-generate";

// 저장 전 검토 게이트의 "다시 생성" 엔드포인트.
// auto-generate와 달리 사진은 이미 업로드돼 있으므로 storagePath만 받는다 (재업로드 X).
// 일기 row를 만들지 않는다 (DB 저장은 사용자가 "저장"을 눌렀을 때 createDiary).

const MAX_TEXT_LENGTH = 2000;

const exifItemSchema = z.object({
  takenAt: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

const bodySchema = z.object({
  storagePaths: z.array(z.string()),
  exifs: z.array(exifItemSchema),
  text: z.string().max(MAX_TEXT_LENGTH).optional(),
  mode: z.enum(["A", "B", "C"]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "잘못된 요청 형식이에요" },
      { status: 400 },
    );
  }

  if (parsed.exifs.length !== parsed.storagePaths.length) {
    return NextResponse.json(
      { ok: false, error: "사진과 EXIF 개수가 일치해야 합니다" },
      { status: 400 },
    );
  }

  const trimmedText = parsed.text?.trim();
  const result = await previewGenerateDiary({
    userId: session.userId,
    storagePaths: parsed.storagePaths,
    exifs: parsed.exifs,
    text: trimmedText && trimmedText.length > 0 ? trimmedText : undefined,
    mode: parsed.mode,
  });

  if (!result.ok) {
    const status = result.capExhausted ? 429 : 502;
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        capExhausted: result.capExhausted ?? false,
      },
      { status },
    );
  }

  return NextResponse.json({ ok: true, data: result.data });
}
