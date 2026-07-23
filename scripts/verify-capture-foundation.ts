// DiaryFragment 데이터 모델 통합 검증 — self-contained (scripts/reembed-diaries.ts 패턴).
// server-only/@/ 체인을 피하려 PrismaClient 직접 + get-or-create 로직 인라인
// (실 함수 createFragment/getOrCreateDiaryForDate 는 build 타입체크로 검증).
// 실데이터 보호: 1990-01-01(실일기와 안 겹침) + 시작/종료 시 cascade 정리.
// 실행: node scripts/verify-capture-foundation.ts
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_KEY = "1990-01-01";

function dayRange(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const startUtc = new Date(Date.UTC(y, m - 1, d) - KST_OFFSET_MS);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}

async function getOrCreateDiary(userId: string, dateKey: string) {
  const { startUtc, endUtc } = dayRange(dateKey);
  const existing = await prisma.diary.findFirst({
    where: { userId, createdAt: { gte: startUtc, lt: endUtc } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing;
  // 실 getOrCreateDiaryForDate(queries.ts)와 동일한 앵커 방식: 과거 날짜는
  // 그 날 KST 정오로 createdAt을 고정해 dateKey 창 안에 정확히 버킷시킨다.
  return prisma.diary.create({
    data: {
      userId,
      title: "",
      content: "",
      source: "chat",
      createdAt: new Date(`${dateKey}T12:00:00+09:00`),
    },
    select: { id: true },
  });
}

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error("검증용 user 없음 — 로컬 DB에 계정 1개 필요");
  const userId = user.id;

  // 이전 실패 잔여 정리 (DATE_KEY 범위만)
  const r = dayRange(DATE_KEY);
  await prisma.diary.deleteMany({ where: { userId, createdAt: { gte: r.startUtc, lt: r.endUtc } } });

  let failed = 0;
  const check = (cond: boolean, msg: string) => {
    if (!cond) { failed++; console.error("FAIL:", msg); }
  };

  // 1) get-or-create idempotency
  const a = await getOrCreateDiary(userId, DATE_KEY);
  const b = await getOrCreateDiary(userId, DATE_KEY);
  check(a.id === b.id, "get-or-create가 idempotent 아님");

  // 2) 조각 삽입 → 그날 일기에 연결
  const f1 = await prisma.diaryFragment.create({
    data: { diaryId: a.id, kind: "text", content: "국수 먹음" },
    select: { id: true, diaryId: true },
  });
  const f2 = await prisma.diaryFragment.create({
    data: { diaryId: a.id, kind: "text", content: "산책 다녀옴" },
    select: { id: true, diaryId: true },
  });
  check(f1.diaryId === a.id && f2.diaryId === a.id, "조각이 그날 일기에 안 붙음");

  // 3) 조회 순서 (createdAt asc)
  const frags = await prisma.diaryFragment.findMany({
    where: { diaryId: a.id },
    orderBy: { createdAt: "asc" },
    select: { content: true },
  });
  check(frags.length === 2 && frags[0].content === "국수 먹음", "조각 조회/순서 오류");

  // 4) cascade: 일기 삭제 시 조각도 삭제
  await prisma.diary.delete({ where: { id: a.id } });
  const orphans = await prisma.diaryFragment.findMany({ where: { diaryId: a.id } });
  check(orphans.length === 0, "cascade 삭제 안 됨 (조각 고아)");

  if (failed) throw new Error(`${failed} CHECK FAILED`);
  console.log("PASS: DiaryFragment 데이터 모델 검증 완료 (정리됨)");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
