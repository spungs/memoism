import "server-only";
import { prisma } from "@/lib/db";

const DEFAULT_TAKE = 20;

export interface DiariesPage<T> {
  items: T[];
  nextCursor: string | null;
}

// Phase 3 MIG-3에서 images: { select: { storagePath, exifTakenAt, orderIndex } } 추가 예정.
// 현재는 다중 이미지 UI/storage 인프라 부재로 select에서 제외.
const listSelect = {
  id: true,
  title: true,
  content: true,
  location: true,
  mood: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type DiaryListItem = Awaited<
  ReturnType<typeof prisma.diary.findMany<{ select: typeof listSelect }>>
>[number];

/**
 * Cursor-paginated list of a user's diaries, newest first.
 * Pass `cursor` = the last item's id from the previous page.
 */
export async function getDiaries(
  userId: string,
  opts: { cursor?: string; take?: number } = {},
): Promise<DiariesPage<DiaryListItem>> {
  const take = Math.min(opts.take ?? DEFAULT_TAKE, 100);
  const rows = await prisma.diary.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: listSelect,
  });

  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
}

/**
 * Single diary, scoped to the owner. Returns null if not found OR not owned —
 * we never differentiate so callers can't probe for foreign IDs.
 * Includes DiaryImage 1:N ordered by orderIndex (베타 사진 최대 5장).
 */
export async function getDiary(id: string, userId: string) {
  return prisma.diary.findFirst({
    where: { id, userId },
    include: {
      images: { orderBy: { orderIndex: "asc" } },
    },
  });
}

export async function getRecentDiaries(userId: string, take = 3) {
  return prisma.diary.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, title: true, createdAt: true, content: true },
  });
}
