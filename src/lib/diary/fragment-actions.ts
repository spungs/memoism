"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { reembedDiaryWithFragments } from "./fragment-embed";
import { getOrCreateDiaryForDate } from "./queries";
import { kstTodayKey } from "./kst";

type Result = { ok: true } | { ok: false; error: string };

/**
 * 조각이 로그인 사용자 소유인지 확인하고 부모 diaryId를 돌려준다.
 *
 * DiaryFragment엔 userId가 없다 — **부모 Diary 조인이 유일한 소유권 방어선**이다.
 * 모든 조각 액션은 반드시 이걸 거쳐야 한다.
 */
async function ownedDiaryId(
  fragmentId: string,
  userId: string,
): Promise<string | null> {
  const row = await prisma.diaryFragment.findFirst({
    where: { id: fragmentId, diary: { userId } },
    select: { diaryId: true },
  });
  return row?.diaryId ?? null;
}

export async function updateFragmentAction(
  fragmentId: string,
  content: string,
): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };

  const text = content.trim();
  if (!text) return { ok: false, error: "내용을 입력해 주세요" };

  const diaryId = await ownedDiaryId(fragmentId, session.userId);
  if (!diaryId) return { ok: false, error: "조각을 찾을 수 없습니다" };

  await prisma.diaryFragment.update({
    where: { id: fragmentId },
    data: { content: text },
  });
  // 내용이 바뀌었으니 회상이 옛 문장을 인용하지 않도록 다시 임베딩한다.
  await reembedDiaryWithFragments(diaryId);

  revalidatePath(`/diary/${diaryId}`);
  revalidatePath("/diary");
  return { ok: true };
}

/**
 * 조각을 다른 날 일기로 옮긴다. 대상 날짜에 일기가 없으면 만든다.
 * **양쪽 일기를 모두 재임베딩**한다 — 안 하면 떠난 쪽 일기가 없는 문장을 계속 인용한다.
 */
export async function moveFragmentAction(
  fragmentId: string,
  dateKey: string,
): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { ok: false, error: "날짜 형식이 올바르지 않습니다" };
  }
  // 미래 날짜 금지. 날짜 선택기가 이미 막지만 Server Action은 공개 엔드포인트라
  // 클라이언트 검증만으론 부족하다 — 미래 일기가 생기면 캘린더·회상이 어긋난다.
  if (dateKey > kstTodayKey()) {
    return { ok: false, error: "미래 날짜로는 옮길 수 없어요" };
  }

  const fromDiaryId = await ownedDiaryId(fragmentId, session.userId);
  if (!fromDiaryId) return { ok: false, error: "조각을 찾을 수 없습니다" };

  const { id: toDiaryId } = await getOrCreateDiaryForDate(
    session.userId,
    dateKey,
  );
  if (toDiaryId === fromDiaryId) return { ok: true };

  await prisma.diaryFragment.update({
    where: { id: fragmentId },
    data: { diaryId: toDiaryId },
  });

  await reembedDiaryWithFragments(fromDiaryId);
  await reembedDiaryWithFragments(toDiaryId);

  revalidatePath(`/diary/${fromDiaryId}`);
  revalidatePath(`/diary/${toDiaryId}`);
  revalidatePath("/diary");
  return { ok: true };
}

export async function deleteFragmentAction(fragmentId: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };

  const diaryId = await ownedDiaryId(fragmentId, session.userId);
  if (!diaryId) return { ok: false, error: "조각을 찾을 수 없습니다" };

  await prisma.diaryFragment.delete({ where: { id: fragmentId } });
  await reembedDiaryWithFragments(diaryId);

  revalidatePath(`/diary/${diaryId}`);
  revalidatePath("/diary");
  return { ok: true };
}
