import "server-only";
import { prisma } from "@/lib/db";
import { getOrCreateDiaryForDate } from "./queries";
import type { Prisma } from "@prisma/client";

export type CreateFragmentInput = {
  userId: string;
  dateKey: string;
  kind: "text" | "photo";
  content?: string;
  storagePath?: string;
  exif?: unknown;
};

export type FragmentRow = {
  id: string;
  kind: string;
  content: string | null;
  storagePath: string | null;
  createdAt: Date;
};

/** 조각 1건을 그날 일기에 라이브 누적. 임베딩 재계산은 Task 6에서 wire. */
export async function createFragment(
  input: CreateFragmentInput,
): Promise<{ diaryId: string; fragmentId: string }> {
  const { id: diaryId } = await getOrCreateDiaryForDate(
    input.userId,
    input.dateKey,
  );
  const fragment = await prisma.diaryFragment.create({
    data: {
      diaryId,
      kind: input.kind,
      content: input.content ?? null,
      storagePath: input.storagePath ?? null,
      exif: (input.exif ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    select: { id: true },
  });
  return { diaryId, fragmentId: fragment.id };
}

/** 한 일기의 조각들을 시간순으로 조회 (일기 상세 타임라인용). */
export async function listFragmentsForDiary(
  diaryId: string,
): Promise<FragmentRow[]> {
  return prisma.diaryFragment.findMany({
    where: { diaryId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      kind: true,
      content: true,
      storagePath: true,
      createdAt: true,
    },
  });
}
