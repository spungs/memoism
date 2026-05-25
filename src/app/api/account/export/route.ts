import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getSignedUrlsForOwner } from "@/lib/storage";

// 본인 데이터 일괄 내보내기 (NEW-12).
//   - User, Character, UserPersona, Diaries(+images), 24h chat messages
//   - 이미지는 storagePath + 1h signed URL을 같이 내려 사용자가 곧바로 받을 수 있게 함
//   - 베타 사용자 데이터 규모(<수백 일기) 가정 — JSON 한 방. V2 streaming/zip 고려.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, character, persona, diaries, chatMessages] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        externalLLMConsent: true,
        createdAt: true,
      },
    }),
    prisma.character.findUnique({
      where: { userId: session.userId },
      select: {
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        createdAt: true,
      },
    }),
    prisma.userPersona.findUnique({
      where: { userId: session.userId },
      select: {
        presetKey: true,
        tone: true,
        formality: true,
        sentenceLength: true,
        perspective: true,
        updatedAt: true,
      },
    }),
    prisma.diary.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        content: true,
        mood: true,
        source: true,
        aiGenerationVersion: true,
        previousContent: true,
        previousChangedAt: true,
        contentEditedAt: true,
        createdAt: true,
        updatedAt: true,
        images: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            storagePath: true,
            orderIndex: true,
            exifTakenAt: true,
            exifLat: true,
            exifLng: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.chatMessage.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }

  // 이미지 storagePath 평탄화 → 1h signed URL 일괄 발급
  const allPaths = diaries.flatMap((d) => d.images.map((img) => img.storagePath));
  const urls =
    allPaths.length > 0
      ? await getSignedUrlsForOwner(allPaths, session.userId)
      : [];
  const urlByPath = new Map<string, string | null>();
  allPaths.forEach((p, i) => urlByPath.set(p, urls[i] ?? null));

  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    user,
    character,
    persona,
    diaries: diaries.map((d) => ({
      ...d,
      images: d.images.map((img) => ({
        ...img,
        signedUrl: urlByPath.get(img.storagePath) ?? null,
      })),
    })),
    chatMessages,
  };

  const filename = `memoism-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
