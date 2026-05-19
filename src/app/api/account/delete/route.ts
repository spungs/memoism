import { NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteImages } from "@/lib/storage";

// 계정 탈퇴 (NEW-13).
//   1) 본인의 모든 storagePath 수집
//   2) Storage 일괄 삭제 (best-effort)
//   3) User 삭제 — schema onDelete:Cascade로 Character/Diary/DiaryImage/DiaryEmbedding/
//      ChatMessage/UserPersona/UsageLog가 모두 정리됨
//   4) 세션 쿠키 삭제
//
// 순서: Storage 먼저 → DB 마지막. DB 삭제 후 Storage 실패하면 orphan 파일이 남으니
// Storage가 먼저 끝나야 한다. Storage가 일부 실패해도 DB는 진행해 사용자 탈퇴 의사 존중.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const images = await prisma.diaryImage.findMany({
    where: { diary: { userId: session.userId } },
    select: { storagePath: true },
  });
  const paths = images.map((i) => i.storagePath);

  if (paths.length > 0) {
    try {
      await deleteImages(paths);
    } catch (e) {
      console.warn(
        "[account/delete] storage cleanup failed:",
        e instanceof Error ? e.message : e,
      );
      // 계속 진행 — DB는 삭제해야 사용자 의사 존중
    }
  }

  await prisma.user.delete({ where: { id: session.userId } });
  await deleteSession();

  return NextResponse.json({ ok: true });
}
