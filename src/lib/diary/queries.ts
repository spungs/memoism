import "server-only";
import { prisma } from "@/lib/db";
import { getSignedUrl } from "@/lib/storage";

const DEFAULT_TAKE = 20;

export interface DiariesPage<T> {
  items: T[];
  nextCursor: string | null;
}

// 목록 카드 썸네일용: 첫 사진(orderIndex=0)만 storagePath 가져옴.
// signed URL은 caller가 발급 (getSignedUrlsForOwner 또는 getSignedUrls).
const listSelect = {
  id: true,
  title: true,
  content: true,
  location: true,
  mood: true,
  source: true,
  createdAt: true,
  updatedAt: true,
  images: {
    select: { storagePath: true },
    orderBy: { orderIndex: "asc" },
    take: 1,
  },
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

export type DiaryListItemWithThumbnail = DiaryListItem & {
  thumbnailUrl: string | null;
};

/**
 * getDiaries + 각 item의 첫 이미지 storagePath를 signed URL로 변환.
 *   - 본인 storagePath만 발급 (cross-account 차단)
 *   - 이미지 없는 일기는 thumbnailUrl: null
 *   - 발급 실패도 null
 */
export async function getDiariesWithThumbnails(
  userId: string,
  opts: { cursor?: string; take?: number } = {},
): Promise<DiariesPage<DiaryListItemWithThumbnail>> {
  const page = await getDiaries(userId, opts);
  const prefix = `${userId}/`;
  const items = await Promise.all(
    page.items.map(async (d): Promise<DiaryListItemWithThumbnail> => {
      const path = d.images[0]?.storagePath;
      if (!path || !path.startsWith(prefix)) {
        return { ...d, thumbnailUrl: null };
      }
      const url = await getSignedUrl(path);
      return { ...d, thumbnailUrl: url };
    }),
  );
  return { items, nextCursor: page.nextCursor };
}
