import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { todayKeyInZone } from "@/lib/tz";
import { getRequestTimeZone } from "@/lib/tz-server";
import { saveBackfillPhotos } from "@/lib/diary/backfill";
import type { ClientExif } from "@/lib/diary/auto-generate";
import { MAX_AI_INPUT_CONTENT_LENGTH, dateKeySchema, clientExifSchema } from "@/lib/diary/schemas";
import { unauthorized } from "@/lib/auth/unauthorized";
import { withJsonErrors } from "@/lib/http/with-json-errors";


/**
 * 밀린 날 채우기 ① — 사진을 날짜별로 저장한다. 날짜별 메모(`notes`)가 있으면
 * 같은 요청에서 그날 일기 본문에 쓴다.
 *
 * 본문 생성은 여기서 하지 않는다. 저장이 끝나면 사용자가 앱을 닫아도 사진은
 * 남고, 정리는 나중에 이어서 할 수 있다(스펙 §3 D-6).
 */
async function handlePOST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
  }

  const photos: File[] = [];
  for (const f of form.getAll("photo")) {
    if (f instanceof File && f.size > 0) photos.push(f);
  }

  let exifs: ClientExif[];
  let dateKeys: string[];
  let notes: Record<string, string>;
  try {
    exifs = z
      .array(clientExifSchema)
      .parse(JSON.parse(String(form.get("exifs") ?? "[]")));
    dateKeys = z
      .array(dateKeySchema)
      .parse(JSON.parse(String(form.get("dateKeys") ?? "[]")));
    // 메모는 정리 입력이 된다 — 정리 입력 상한을 넘으면 어차피 정리하지 못한다.
    notes = z
      .record(dateKeySchema, z.string().max(MAX_AI_INPUT_CONTENT_LENGTH))
      .parse(JSON.parse(String(form.get("notes") ?? "{}")));
  } catch {
    return NextResponse.json(
      { error: "사진 메타데이터 형식이 잘못됐어요" },
      { status: 400 },
    );
  }

  // 현지 오늘보다 늦은 날짜는 받지 않는다. 화면도 미래 촬영일을 "날짜 모름"으로 빼지만
  // 라우트는 공개 엔드포인트다 — 미래 칸 일기가 생기면 캘린더·회상이 어긋난다(점검 H2).
  const today = todayKeyInZone(await getRequestTimeZone());
  if ([...dateKeys, ...Object.keys(notes)].some((k) => k > today)) {
    return NextResponse.json(
      { error: "미래 날짜로는 채울 수 없어요" },
      { status: 400 },
    );
  }

  const r = await saveBackfillPhotos(
    session.userId,
    photos,
    exifs,
    dateKeys,
    notes,
  );
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ savedDates: r.savedDates, diaryIds: r.diaryIds });
}
