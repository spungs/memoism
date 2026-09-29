import { NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteImages } from "@/lib/storage";
import { unauthorized } from "@/lib/auth/unauthorized";

// 계정 탈퇴 (NEW-13).
//   1) 본인의 모든 storagePath 수집
//   2) User 삭제 — schema onDelete:Cascade로 Character/Diary/DiaryImage/DiaryEmbedding/
//      ChatMessage/UserPersona/UsageLog가 모두 정리됨
//   3) 세션 쿠키 삭제
//   4) Storage 일괄 삭제 (best-effort)
//
// 순서: DB 먼저 → Storage 나중 (CLAUDE.md 규약). 예전엔 Storage를 먼저 지워서, DB
// 삭제가 실패하면 계정은 살아 있는데 사진만 전부 사라졌다(2026-09-29 점검 M6).
// Storage가 실패해 남은 파일은 참조가 없으니 고아 GC(gc-orphans)가 48시간 뒤 줍는다.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  const images = await prisma.diaryImage.findMany({
    where: { diary: { userId: session.userId } },
    select: { storagePath: true },
  });
  const paths = images.map((i) => i.storagePath);

  await prisma.user.delete({ where: { id: session.userId } });
  await deleteSession();

  if (paths.length > 0) {
    try {
      await deleteImages(paths);
    } catch (e) {
      console.warn(
        "[account/delete] storage cleanup failed:",
        e instanceof Error ? e.message : e,
      );
      // 탈퇴는 이미 끝났다 — 남은 파일은 고아 GC가 정리한다.
    }
  }

  return NextResponse.json({ ok: true });
}
