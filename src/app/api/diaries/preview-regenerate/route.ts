import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getRequestTimeZone } from "@/lib/tz-server";
import { previewGenerateDiary } from "@/lib/diary/preview-generate";
import { MAX_AI_INPUT_CONTENT_LENGTH, clientExifSchema } from "@/lib/diary/schemas";
import { MAX_AI_INSTRUCTION_LENGTH } from "@/lib/diary/ai-instruction";
import { MAX_IMAGES_PER_REQUEST } from "@/lib/diary/limits";
import { unauthorized } from "@/lib/auth/unauthorized";
import { aiFailureStatus } from "@/lib/http/ai-status";
import { withJsonErrors } from "@/lib/http/with-json-errors";

// 저장 전 검토 게이트의 "다시 정리하기" 엔드포인트.
// auto-generate와 달리 사진은 이미 업로드돼 있으므로 storagePath만 받는다 (재업로드 X).
// 일기 row를 만들지 않는다 (DB 저장은 사용자가 "저장"을 눌렀을 때 createDiary).
//
// text는 검토화면 textarea의 *현재* 값이다. mode는 받지 않는다 — 클라이언트가 보낸
// 최초 mode를 믿으면 사용자가 고친 본문이 버려진다(사진만 첨부 시 mode A).


const bodySchema = z.object({
  // 검토 화면이 보내는 건 최초 정리 때 올린 사진뿐이라 한 요청 상한을 넘을 일이 없다.
  // 상한이 없으면 경로 하나를 수십 번 반복해 사용 횟수 1회로 수십 장짜리 AI 호출을
  // 만들 수 있었다(점검 H5).
  storagePaths: z.array(z.string()).max(MAX_IMAGES_PER_REQUEST),
  exifs: z.array(clientExifSchema).max(MAX_IMAGES_PER_REQUEST),
  text: z.string().max(MAX_AI_INPUT_CONTENT_LENGTH).optional(),
  instruction: z.string().max(MAX_AI_INSTRUCTION_LENGTH).optional(),
});

async function handlePOST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  const body = await req.json().catch(() => null);
  const result0 = bodySchema.safeParse(body);
  if (!result0.success) {
    // 길이 초과는 흔한 실패라 따로 안내한다.
    const tooLong = result0.error.issues.some(
      (i) => i.path[0] === "text" && i.code === "too_big",
    );
    return NextResponse.json(
      {
        ok: false,
        error: tooLong
          ? `${MAX_AI_INPUT_CONTENT_LENGTH.toLocaleString("ko-KR")}자가 넘어 '다시 정리하기'를 쓸 수 없어요. 줄이면 다시 쓸 수 있어요.`
          : "잘못된 요청 형식이에요",
      },
      { status: 400 },
    );
  }
  const parsed = result0.data;

  // 업로드는 항상 `{userId}/...`에 저장된다. 다운로드는 service role 권한이라 경로만
  // 알면 남의 사진도 받아지므로 본인 경로만 허용한다(점검 H5). 저장 액션의
  // parseStoragePaths와 같은 규칙이지만, 여기선 걸러내지 않고 거절한다 — exifs와
  // 인덱스가 짝이라 일부만 빼면 사진과 촬영정보가 어긋난다.
  const prefix = `${session.userId}/`;
  if (parsed.storagePaths.some((p) => !p.startsWith(prefix) || p.includes(".."))) {
    return NextResponse.json(
      { ok: false, error: "사진 정보가 올바르지 않아요" },
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
  const trimmedInstruction = parsed.instruction?.trim();
  const result = await previewGenerateDiary({
    timeZone: await getRequestTimeZone(),
    userId: session.userId,
    storagePaths: parsed.storagePaths,
    exifs: parsed.exifs,
    text: trimmedText && trimmedText.length > 0 ? trimmedText : undefined,
    instruction:
      trimmedInstruction && trimmedInstruction.length > 0
        ? trimmedInstruction
        : undefined,
  });

  if (!result.ok) {
    // 상태 기준은 모든 AI 라우트 공통(ai-status.ts).
    const status = aiFailureStatus(result);
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

// 처리 못 한 예외도 JSON으로 — 화면이 res.json()에서 터지지 않게(점검 M8).
export const POST = withJsonErrors(handlePOST);
