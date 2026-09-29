"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getSignedUrlsForOwner } from "@/lib/storage";
import { reembedDiaryWithFragments } from "./fragment-embed";
import { getOrCreateDiaryForDate } from "./queries";
import { dateKeyLabel } from "./kst";
import { todayKeyInZone } from "@/lib/tz";
import { getRequestTimeZone } from "@/lib/tz-server";

/**
 * 대화에 보이는 사진 썸네일용 signed URL — `captureRef.entries[].imageIds`로 조회한다.
 *
 * id로 받는 이유: captureRef에는 storagePath가 없고, 넣어두면 채팅 메시지 JSON에
 * 경로가 영구 복제된다. id → path 해석을 서버에서 하면 **소유자 검증이 쿼리 자체에
 * 걸린다**(`diary: { userId }`).
 */
const MAX_CHAT_PHOTO_IDS = 60;

export async function getCapturePhotoUrls(
  imageIds: string[],
): Promise<Record<string, string>> {
  const session = await getSession();
  if (!session || !Array.isArray(imageIds) || imageIds.length === 0) return {};

  const ids = imageIds
    .filter((id) => typeof id === "string" && id.length > 0)
    .slice(0, MAX_CHAT_PHOTO_IDS);
  if (ids.length === 0) return {};

  const rows = await prisma.diaryImage.findMany({
    where: { id: { in: ids }, diary: { userId: session.userId } },
    select: { id: true, storagePath: true },
  });
  if (rows.length === 0) return {};

  const urls = await getSignedUrlsForOwner(
    rows.map((r) => r.storagePath),
    session.userId,
  );
  const out: Record<string, string> = {};
  rows.forEach((r, i) => {
    const u = urls[i];
    if (u) out[r.id] = u;
  });
  return out;
}

/** 옮겨간 일기 id를 함께 돌려준다 — 호출한 화면이 칩을 바로 갱신할 수 있게. */
type Result = { ok: true; diaryId: string } | { ok: false; error: string };

type StoredCaptureRef = {
  diaryId: string;
  dateKey: string;
  label: string;
  fragmentId?: string | null;
  entries?: { dateKey: string; diaryId: string; imageIds: string[] }[];
};

/**
 * 캡처 날짜 교정 — 그 메시지가 만든 조각·사진을 다른 날 일기로 옮기고
 * captureRef를 갱신한다(칩이 새 날짜를 보여주게).
 *
 * 용량 카운터는 건드리지 않는다 — 같은 사용자의 같은 바이트가 일기만 바꿔 다는 것이다.
 */
export async function recaptureDateAction(
  chatMessageId: string,
  dateKey: string,
): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { ok: false, error: "날짜 형식이 올바르지 않습니다" };
  }
  // 현지 오늘까지 허용한다(해외여행 — 동쪽 여행지는 한국보다 하루 앞설 수 있다).
  if (dateKey > todayKeyInZone(await getRequestTimeZone())) {
    return { ok: false, error: "미래 날짜로는 옮길 수 없어요" };
  }

  const msg = await prisma.chatMessage.findFirst({
    where: { id: chatMessageId, userId: session.userId },
    select: { id: true, captureRef: true },
  });
  const ref = (msg?.captureRef as StoredCaptureRef | null) ?? null;
  if (!ref) return { ok: false, error: "기록을 찾을 수 없습니다" };

  // entries가 없는 구버전 행(Plan 04 배포분)은 대표 세 키로 폴백한다.
  const entries = ref.entries ?? [
    { dateKey: ref.dateKey, diaryId: ref.diaryId, imageIds: [] },
  ];

  // 여러 날에 걸친 캡처는 "한 날로 옮기기"가 무의미하다 — 사진이 각자 제 날짜에
  // 정확히 갔는데 한 날로 몰면 되레 데이터가 틀어진다. UI에서도 막지만 서버에서도 거절.
  if (entries.length > 1) {
    return {
      ok: false,
      error:
        "여러 날에 나눠 기록된 건 한 번에 옮길 수 없어요. 일기에서 하나씩 옮겨주세요.",
    };
  }

  const { id: toDiaryId } = await getOrCreateDiaryForDate(
    session.userId,
    dateKey,
  );
  const fromDiaryId = entries[0].diaryId;
  const imageIds = entries[0].imageIds;
  if (toDiaryId === fromDiaryId) return { ok: true, diaryId: toDiaryId };

  await prisma.$transaction(async (tx) => {
    if (ref.fragmentId) {
      // 정리 표시는 떠난 일기 기준 — 새 일기에서 정리에 들어가도록 푼다(점검 M4).
      await tx.diaryFragment.updateMany({
        where: { id: ref.fragmentId, diary: { userId: session.userId } },
        data: { diaryId: toDiaryId, foldedAt: null },
      });
    }
    if (imageIds.length) {
      // 대상 일기의 기존 사진 뒤에 이어 붙인다. 번호를 그대로 두면 기존 사진과
      // 겹쳐 순서가 정해지지 않는다(유니크 제약이 없어 조용히 겹친다).
      const agg = await tx.diaryImage.aggregate({
        where: { diaryId: toDiaryId },
        _max: { orderIndex: true },
      });
      const moving = await tx.diaryImage.findMany({
        where: { id: { in: imageIds }, diary: { userId: session.userId } },
        select: { id: true },
        orderBy: { orderIndex: "asc" },
      });
      const nextOrder = (agg._max.orderIndex ?? -1) + 1;
      for (const [i, img] of moving.entries()) {
        await tx.diaryImage.update({
          where: { id: img.id },
          data: { diaryId: toDiaryId, orderIndex: nextOrder + i },
        });
      }
    }
    await tx.chatMessage.update({
      where: { id: chatMessageId },
      data: {
        captureRef: {
          ...ref,
          diaryId: toDiaryId,
          dateKey,
          label: dateKeyLabel(dateKey),
          entries: [{ dateKey, diaryId: toDiaryId, imageIds }],
        },
      },
    });
  });

  // 양쪽 다 재임베딩 — 안 하면 떠난 쪽이 없는 문장을 계속 인용한다.
  await reembedDiaryWithFragments(fromDiaryId);
  await reembedDiaryWithFragments(toDiaryId);

  revalidatePath(`/diary/${fromDiaryId}`);
  revalidatePath(`/diary/${toDiaryId}`);
  revalidatePath("/diary");
  return { ok: true, diaryId: toDiaryId };
}
