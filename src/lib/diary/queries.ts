import "server-only";
import { prisma } from "@/lib/db";
import { getSignedUrl } from "@/lib/storage";
import { kstDateKey, kstMonthRangeUtc } from "@/lib/diary/kst";

const DEFAULT_TAKE = 20;
const SEARCH_TAKE = 50;

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
 * Includes DiaryImage 1:N ordered by orderIndex (사진 상한은 구독별: ACTIVE 10 / 그 외 5).
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
    select: {
      id: true,
      title: true,
      createdAt: true,
      content: true,
      source: true,
    },
  });
}

/**
 * 홈 "이번 달" 요약용 카운트.
 *   - total: 유저 전체 일기 수
 *   - thisMonth: 이번 달(KST 1일 자정 기준) 작성 일기 수
 * 적은 일기 수에도 홈이 비어 보이지 않도록 상단 요약 strip에 사용.
 */
export async function getDiaryCounts(userId: string) {
  const now = new Date();
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffsetMs);
  const monthStartUtc = new Date(
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1) - kstOffsetMs,
  );

  const [total, thisMonth] = await Promise.all([
    prisma.diary.count({ where: { userId } }),
    prisma.diary.count({
      where: { userId, createdAt: { gte: monthStartUtc } },
    }),
  ]);

  return { total, thisMonth };
}

/**
 * 일기목록 검색창용 단순 텍스트 검색.
 *   - 의미 기반(RAG)이 아니라, 입력 텍스트가 제목·본문에 실제로 든 일기만 조회.
 *   - 공백으로 나눈 각 단어가 모두(AND) 들어가야 매칭 (제목 OR 본문, 대소문자 무시).
 *   - 최근순, 최대 SEARCH_TAKE개. 본인 일기로만 scope.
 *   - 의미 기반 검색이 필요한 자리는 메이(chat)의 searchDiaries(RAG)를 쓴다.
 */
export async function searchDiariesByText(userId: string, query: string) {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  return prisma.diary.findMany({
    where: {
      userId,
      AND: tokens.map((t) => ({
        OR: [
          { title: { contains: t, mode: "insensitive" as const } },
          { content: { contains: t, mode: "insensitive" as const } },
        ],
      })),
    },
    orderBy: { createdAt: "desc" },
    take: SEARCH_TAKE,
    select: {
      id: true,
      title: true,
      content: true,
      mood: true,
      source: true,
      createdAt: true,
    },
  });
}

export type DiaryListItemWithThumbnail = DiaryListItem & {
  thumbnailUrl: string | null;
};

/**
 * 오늘(KST 자정 기준) 작성된 일기 1개 조회. 첫 이미지 signed URL 포함.
 * 없으면 null — 홈 "오늘 첫 줄 시작해볼까?" CTA 분기에 사용.
 */
export async function getTodayDiary(userId: string) {
  const now = new Date();
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffsetMs);
  const startUtcMs =
    Date.UTC(
      kstNow.getUTCFullYear(),
      kstNow.getUTCMonth(),
      kstNow.getUTCDate(),
    ) - kstOffsetMs;
  const startUtc = new Date(startUtcMs);
  const endUtc = new Date(startUtcMs + 24 * 60 * 60 * 1000);

  const diary = await prisma.diary.findFirst({
    where: {
      userId,
      createdAt: { gte: startUtc, lt: endUtc },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      mood: true,
      source: true,
      createdAt: true,
      images: {
        select: { storagePath: true },
        orderBy: { orderIndex: "asc" },
        take: 1,
      },
    },
  });
  if (!diary) return null;

  const path = diary.images[0]?.storagePath;
  const thumbnailUrl =
    path && path.startsWith(`${userId}/`) ? await getSignedUrl(path) : null;
  return { ...diary, thumbnailUrl };
}

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

export interface CalendarEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  mood: string | null;
  createdAt: string; // ISO
}

export interface CalendarMonthData {
  year: number;
  month: number; // 1~12
  /** KST dateKey("YYYY-MM-DD") → 그날 일기들(시각 오름차순). */
  days: Record<string, CalendarEntry[]>;
}

/**
 * KST 한 달치 일기를 날짜별로 그룹핑해 반환. 캘린더 표식·그날 시트에 사용.
 * 이미지/썸네일은 포함하지 않는다(시트는 무드뱃지+시각+발췌만 쓰므로 가벼움).
 */
export async function getDiariesForMonth(
  userId: string,
  year: number,
  month: number,
): Promise<CalendarMonthData> {
  const { startUtc, endUtc } = kstMonthRangeUtc(year, month);
  const rows = await prisma.diary.findMany({
    where: { userId, createdAt: { gte: startUtc, lt: endUtc } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      content: true,
      source: true,
      mood: true,
      createdAt: true,
    },
  });

  const days: Record<string, CalendarEntry[]> = {};
  for (const r of rows) {
    const key = kstDateKey(r.createdAt);
    (days[key] ??= []).push({
      id: r.id,
      title: r.title,
      content: r.content,
      source: r.source,
      mood: r.mood,
      createdAt: r.createdAt.toISOString(),
    });
  }
  return { year, month, days };
}
