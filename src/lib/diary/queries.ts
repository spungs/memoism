import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_MOOD } from "./schemas";
import { todayKeyInZone } from "@/lib/tz";
import { getSignedUrlsByPath } from "@/lib/storage";
import { fragmentPreview } from "./fragment-preview";
import { NOT_EMPTY_DIARY } from "./not-empty";
import { MAX_ORGANIZE_ALL_DAYS } from "./organize-all";
import {
  dateKeyLabel,
  diaryCreatedAtForDateKey,
  kstDateKey,
  kstDayRangeFromKey,
  kstMonthRangeUtc,
  latestPossibleTodayKey,
} from "@/lib/diary/kst";

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
    where: { userId, ...NOT_EMPTY_DIARY },
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
 * Includes DiaryImage 1:N ordered by orderIndex (사진 상한은 일기당 10장 고정).
 */
export async function getDiary(id: string, userId: string) {
  return prisma.diary.findFirst({
    where: { id, userId },
    include: {
      images: { orderBy: { orderIndex: "asc" } },
      // 조각 타임라인(스펙 §6 ②층). 정리 후에도 보존하므로 항상 함께 읽는다.
      fragments: { orderBy: { createdAt: "asc" } },
    },
  });
}

/**
 * 일기 상세의 이전·다음 — 일기 날짜 기준으로 바로 앞(더 오래된)·뒤(더 최근) 일기.
 * 목록에 안 보이는 빈 일기는 건너뛴다. 같은 시각이면 id로 순서를 정해 서로 맞물리게 한다.
 */
export async function getAdjacentDiaries(
  userId: string,
  diary: { id: string; createdAt: Date },
) {
  const select = { id: true, createdAt: true } as const;
  const [prev, next] = await Promise.all([
    prisma.diary.findFirst({
      where: {
        userId,
        // NOT_EMPTY_DIARY가 OR를 쓰므로 펼치지 않고 AND로 묶는다.
        AND: [
          NOT_EMPTY_DIARY,
          {
            OR: [
              { createdAt: { lt: diary.createdAt } },
              { createdAt: diary.createdAt, id: { lt: diary.id } },
            ],
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select,
    }),
    prisma.diary.findFirst({
      where: {
        userId,
        AND: [
          NOT_EMPTY_DIARY,
          {
            OR: [
              { createdAt: { gt: diary.createdAt } },
              { createdAt: diary.createdAt, id: { gt: diary.id } },
            ],
          },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select,
    }),
  ]);
  return { prev, next };
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
    prisma.diary.count({ where: { userId, ...NOT_EMPTY_DIARY } }),
    prisma.diary.count({
      where: { userId, createdAt: { gte: monthStartUtc }, ...NOT_EMPTY_DIARY },
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
  // 썸네일 signed URL을 개별 호출(N회) 대신 batch 1회로 — 목록 로딩 병목 해소.
  const paths = page.items
    .map((d) => d.images[0]?.storagePath)
    .filter((p): p is string => !!p && p.startsWith(prefix));
  const urlMap = await getSignedUrlsByPath(paths);
  const items = page.items.map((d): DiaryListItemWithThumbnail => {
    const path = d.images[0]?.storagePath;
    const thumbnailUrl = path ? urlMap.get(path) ?? null : null;
    return { ...d, thumbnailUrl };
  });
  return { items, nextCursor: page.nextCursor };
}

export interface CalendarEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  mood: string | null;
  createdAt: string; // ISO
  thumbnailUrl: string | null; // 첫 사진 signed URL (없으면 null)
  /** 본문이 비었을 때 카드에 보여줄 조각 요약 (조각 없으면 ""). */
  fragmentPreview: string;
}

export interface CalendarMonthData {
  year: number;
  month: number; // 1~12
  /** KST dateKey("YYYY-MM-DD") → 그날 일기들(시각 오름차순). */
  days: Record<string, CalendarEntry[]>;
}

/**
 * KST 한 달치 일기를 날짜별로 그룹핑해 반환. 캘린더 표식·그 달 목록에 사용.
 * 목록 카드 썸네일용으로 각 일기의 첫 사진 signed URL을 포함한다
 * (그 달 전체 경로를 모아 batch 1회 서명 — getDiariesWithThumbnails와 동일 패턴).
 */
export async function getDiariesForMonth(
  userId: string,
  year: number,
  month: number,
): Promise<CalendarMonthData> {
  const { startUtc, endUtc } = kstMonthRangeUtc(year, month);
  const rows = await prisma.diary.findMany({
    where: {
      userId,
      createdAt: { gte: startUtc, lt: endUtc },
      ...NOT_EMPTY_DIARY,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      content: true,
      source: true,
      mood: true,
      createdAt: true,
      images: {
        select: { storagePath: true },
        orderBy: { orderIndex: "asc" },
        take: 1,
      },
      // 본문이 빈 chat 일기(메이 캡처만 있는 날)의 카드를 채우기 위한 조각 요약 재료.
      fragments: {
        select: { kind: true, content: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // 본인 prefix 경로만 모아 batch 1회 서명 (cross-account 차단).
  const prefix = `${userId}/`;
  const paths = rows
    .map((r) => r.images[0]?.storagePath)
    .filter((p): p is string => !!p && p.startsWith(prefix));
  const urlMap = await getSignedUrlsByPath(paths);

  const days: Record<string, CalendarEntry[]> = {};
  for (const r of rows) {
    const key = kstDateKey(r.createdAt);
    const path = r.images[0]?.storagePath;
    (days[key] ??= []).push({
      id: r.id,
      title: r.title,
      content: r.content,
      source: r.source,
      mood: r.mood,
      createdAt: r.createdAt.toISOString(),
      thumbnailUrl: path ? urlMap.get(path) ?? null : null,
      fragmentPreview: fragmentPreview(r.fragments),
    });
  }
  return { year, month, days };
}

/**
 * 그 날짜의 "그날 일기" — 하루에 일기는 하나다(점검 M5). 예전 데이터엔 한 날에 여럿이
 * 있을 수 있어 가장 이른 것을 주 일기로 본다. `tx`를 주면 그 트랜잭션 안에서 찾는다.
 *
 * 목록에 안 보이는 빈 일기(`NOT_EMPTY_DIARY` 반대)보다 보이는 일기를 먼저 고른다 — 빈
 * 일기가 더 이르면 새 기록이 숨은 빈 일기로 들어가 같은 날 두 번째 카드로 드러났다.
 * `empty`면 사용자 눈엔 그날 일기가 없는 것이다(안내·날짜 이동 판단에 쓴다).
 */
export async function findDiaryForDate(
  userId: string,
  dateKey: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<{ id: string; empty: boolean } | null> {
  const { startUtc, endUtc } = kstDayRangeFromKey(dateKey);
  const rows = await tx.diary.findMany({
    where: { userId, createdAt: { gte: startUtc, lt: endUtc } },
    // 지난 날짜 일기는 모두 정오로 앵커돼 시각이 같다 — id로 순서를 고정해야 합치기와
    // 정리가 같은 일기를 고른다.
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      content: true,
      _count: { select: { images: true, fragments: true } },
    },
  });
  const days = rows.map((r) => ({
    id: r.id,
    empty:
      r.title === "" &&
      r.content === "" &&
      r._count.images === 0 &&
      r._count.fragments === 0,
  }));
  return days.find((d) => !d.empty) ?? days[0] ?? null;
}

/**
 * 같은 사용자의 "그날 일기 확보·생성"을 한 줄로 세운다. 트랜잭션 안에서 부르면 끝날 때 풀린다.
 * 찾고-없으면-만들기가 동시에 두 번 돌면 한 날에 일기가 둘 생겼다(그날 첫 채팅을 연달아
 * 보낼 때, 점검 M5).
 */
export async function lockUserDiaries(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"diary-day:" + userId}))`;
}

/**
 * 대화형 캡처 라우팅용 — 해당 날짜의 "그날 일기"를 결정적으로 확보.
 *   - 있으면 그날 일기(가장 이른 것)를 반환.
 *   - 없으면 빈 일기(source:"chat") 생성. title/content는 조각이 채움. 감정은 평온(점검 M23).
 */
export async function getOrCreateDiaryForDate(
  userId: string,
  dateKey: string,
): Promise<{ id: string }> {
  // 미래 날짜는 거부한다. 미래 칸을 조회해 못 찾으면 앵커가 now(오늘 칸)로 떨어져, 같은
  // 말을 할 때마다 오늘 칸에 일기가 하나씩 더 생겼다(2026-09-29 점검 H2). 현지 날짜는
  // KST보다 최대 하루 앞설 수 있어(동쪽 여행지) 그만큼은 허용한다. 호출자가 현지 오늘
  // 이하로 거른 뒤 부르므로, 여기 걸리는 건 잘못된 입력뿐이다.
  if (dateKey > latestPossibleTodayKey(new Date())) {
    throw new Error(`미래 날짜로는 일기를 만들 수 없어요: ${dateKey}`);
  }
  return prisma.$transaction(async (tx) => {
    await lockUserDiaries(tx, userId);
    const existing = await findDiaryForDate(userId, dateKey, tx);
    if (existing) return { id: existing.id };
    return tx.diary.create({
      data: {
        userId,
        title: "",
        content: "",
        source: "chat",
        mood: DEFAULT_MOOD,
        createdAt: diaryCreatedAtForDateKey(dateKey, new Date()),
      },
      select: { id: true },
    });
  });
}

/** 이 일기의 아직 정리에 안 들어간 텍스트 조각 수. 넛지·제안 문구의 N. */
export async function countUnfoldedFragments(diaryId: string): Promise<number> {
  return prisma.diaryFragment.count({
    where: { diaryId, kind: "text", foldedAt: null },
  });
}

/**
 * 제안 대상 — 미반영 텍스트 조각이 있는 "지난 날" 중 가장 최근 1건.
 *
 * 오늘을 제외하는 이유(스펙 D-2): 하루가 닫혀야 조각이 완전하다. 오전에 정리하면
 * 미완성 일기가 나오고 그 뒤로 재정리 넛지가 계속 붙는다.
 */
export async function findUnfoldedDiary(
  userId: string,
  /** 요청 기기의 시간대 — "오늘"(제안에서 빼는 날)을 현지 날짜로. */
  timeZone: string,
): Promise<{
  diaryId: string;
  dateKey: string;
  label: string;
  count: number;
} | null> {
  // 현지 오늘을 저장 좌표(KST 칸)의 하루 경계로 바꾼다. 일기는 KST 칸에 앵커된다(kst.ts).
  const { startUtc: todayStartUtc } = kstDayRangeFromKey(todayKeyInZone(timeZone));

  const diary = await prisma.diary.findFirst({
    where: {
      userId,
      createdAt: { lt: todayStartUtc },
      fragments: { some: { kind: "text", foldedAt: null } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
  if (!diary) return null;

  const count = await countUnfoldedFragments(diary.id);
  // some 조건과 count 사이에 조각이 지워졌으면 제안할 게 없다.
  if (count === 0) return null;

  const dateKey = kstDateKey(diary.createdAt);
  return { diaryId: diary.id, dateKey, label: dateKeyLabel(dateKey), count };
}

/**
 * 한번에 정리 대상 — 미반영 텍스트 조각이 있는 지난 날 전부(최근 날짜순, 최대 31일).
 * 오늘을 빼는 이유는 findUnfoldedDiary와 같다.
 */
export async function listUnfoldedDiaries(
  userId: string,
  timeZone: string,
): Promise<{ diaryId: string; dateKey: string; label: string }[]> {
  const { startUtc: todayStartUtc } = kstDayRangeFromKey(todayKeyInZone(timeZone));
  const diaries = await prisma.diary.findMany({
    where: {
      userId,
      createdAt: { lt: todayStartUtc },
      fragments: { some: { kind: "text", foldedAt: null } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ORGANIZE_ALL_DAYS,
    select: { id: true, createdAt: true },
  });
  return diaries.map((d) => {
    const dateKey = kstDateKey(d.createdAt);
    return { diaryId: d.id, dateKey, label: dateKeyLabel(dateKey) };
  });
}
