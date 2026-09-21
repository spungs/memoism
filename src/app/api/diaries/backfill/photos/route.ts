import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { saveBackfillPhotos } from "@/lib/diary/backfill";
import type { ClientExif } from "@/lib/diary/auto-generate";

const exifItem = z.object({
  takenAt: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * 밀린 날 채우기 ① — 사진을 날짜별로 저장한다.
 *
 * 본문 생성은 여기서 하지 않는다. 저장이 끝나면 사용자가 앱을 닫아도 사진은
 * 남고, 정리는 나중에 이어서 할 수 있다(스펙 §3 D-6).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  try {
    exifs = z
      .array(exifItem)
      .parse(JSON.parse(String(form.get("exifs") ?? "[]")));
    dateKeys = z
      .array(dateKeySchema)
      .parse(JSON.parse(String(form.get("dateKeys") ?? "[]")));
  } catch {
    return NextResponse.json(
      { error: "사진 메타데이터 형식이 잘못됐어요" },
      { status: 400 },
    );
  }

  const r = await saveBackfillPhotos(session.userId, photos, exifs, dateKeys);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ savedDates: r.savedDates });
}
