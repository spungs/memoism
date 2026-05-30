import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { searchDiariesByText } from "@/lib/diary/queries";
import { getSignedUrlsForOwner } from "@/lib/storage";

const queryBodySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "검색어를 입력해주세요")
    .max(200, "검색어는 200자 이내여야 합니다"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = queryBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 검색어" },
      { status: 400 },
    );
  }

  let hits;
  try {
    hits = await searchDiariesByText(session.userId, parsed.data.q);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[search] failed:", msg);
    return NextResponse.json(
      { error: `검색 실행 중 오류가 발생했어요: ${msg}` },
      { status: 500 },
    );
  }

  if (hits.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // 각 일기의 첫 이미지 storagePath 일괄 조회
  const diaryIds = hits.map((h) => h.id);
  const images = await prisma.diaryImage.findMany({
    where: { diaryId: { in: diaryIds } },
    select: { diaryId: true, storagePath: true, orderIndex: true },
    orderBy: [{ diaryId: "asc" }, { orderIndex: "asc" }],
  });
  const firstImageByDiary = new Map<string, string>();
  for (const img of images) {
    if (!firstImageByDiary.has(img.diaryId)) {
      firstImageByDiary.set(img.diaryId, img.storagePath);
    }
  }

  const paths = [...firstImageByDiary.values()];
  const urls =
    paths.length > 0
      ? await getSignedUrlsForOwner(paths, session.userId)
      : [];
  const urlByPath = new Map<string, string | null>();
  paths.forEach((p, i) => urlByPath.set(p, urls[i] ?? null));

  const items = hits.map((h) => {
    const path = firstImageByDiary.get(h.id);
    return {
      id: h.id,
      title: h.title,
      content: h.content,
      mood: h.mood,
      source: h.source,
      createdAt: h.createdAt.toISOString(),
      thumbnailUrl: path ? (urlByPath.get(path) ?? null) : null,
    };
  });

  return NextResponse.json({ items });
}
