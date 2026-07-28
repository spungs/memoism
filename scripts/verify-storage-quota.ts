/**
 * 스토리지 쿼터 카운터 정합 검증.
 *   1. insert + increment를 한 트랜잭션으로 → 합계 일치
 *   2. diary 삭제(cascade) + decrement를 한 트랜잭션으로 → 원복
 *   3. 감산이 SUM(sizeBytes)과 맞는지 (cascade는 개별 삭제 이벤트가 없음)
 *
 * 실행: pnpm verify-storage-quota
 *
 * 안전장치: 격리 날짜(1990-01-01)에만 임시 데이터를 만들고 finally에서 반드시 지운다.
 * 실제 일기·사진 파일은 건드리지 않는다(Storage 접근 없음).
 * 순수 경계 판정(exceedsQuota)은 vitest가 커버하므로 여기선 카운터 정합만 본다.
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env", quiet: true });
loadEnv({ path: ".env.local", override: true, quiet: true });

const ISOLATED = new Date("1990-01-01T03:00:00.000Z");
const SIZE_A = 111_111;
const SIZE_B = 222_222;

const prisma = new PrismaClient();
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label}: ${actual} (기대 ${expected})`);
}

async function counterOf(userId: string): Promise<number> {
  const c = await prisma.character.findUnique({
    where: { userId },
    select: { storageUsedBytes: true },
  });
  return Number(c!.storageUsedBytes);
}

async function main() {
  const character = await prisma.character.findFirst({ select: { userId: true } });
  if (!character) throw new Error("character가 없어 검증할 수 없습니다");
  const userId = character.userId;
  const before = await counterOf(userId);
  console.log(`대상 유저: ${userId}\n시작 카운터: ${before}\n`);

  let diaryId: string | null = null;
  try {
    // ── 1. insert + increment (actions.ts createDiaryAction과 같은 규약) ──
    console.log("[1] insert + increment");
    const added = SIZE_A + SIZE_B;
    diaryId = await prisma.$transaction(async (tx) => {
      const d = await tx.diary.create({
        data: {
          userId,
          title: "[검증] 스토리지 쿼터",
          content: "카운터 정합 검증용 임시 일기",
          source: "manual",
          createdAt: ISOLATED,
          images: {
            create: [
              { storagePath: `${userId}/verify-a.jpg`, sizeBytes: SIZE_A, orderIndex: 0 },
              { storagePath: `${userId}/verify-b.jpg`, sizeBytes: SIZE_B, orderIndex: 1 },
            ],
          },
        },
        select: { id: true },
      });
      await tx.character.update({
        where: { userId },
        data: { storageUsedBytes: { increment: BigInt(added) } },
      });
      return d.id;
    });
    check("증분 후 카운터", await counterOf(userId), before + added);

    // ── 2. 감산액이 SUM(sizeBytes)과 일치하는가 ──
    console.log("[2] cascade 삭제 전 SUM 합산");
    const agg = await prisma.diaryImage.aggregate({
      where: { diaryId },
      _sum: { sizeBytes: true },
    });
    check("SUM(sizeBytes)", agg._sum.sizeBytes ?? 0, added);

    // ── 3. delete(cascade) + decrement (deleteDiaryAction과 같은 규약) ──
    console.log("[3] delete(cascade) + decrement");
    const freed = agg._sum.sizeBytes ?? 0;
    await prisma.$transaction([
      prisma.diary.delete({ where: { id: diaryId } }),
      prisma.character.update({
        where: { userId },
        data: { storageUsedBytes: { decrement: BigInt(freed) } },
      }),
    ]);
    diaryId = null;
    check("감산 후 카운터(원복)", await counterOf(userId), before);
    check(
      "cascade로 이미지 행 제거",
      await prisma.diaryImage.count({ where: { storagePath: { startsWith: `${userId}/verify-` } } }),
      0,
    );
  } finally {
    // 어떤 경로로 실패해도 격리 날짜 데이터는 남기지 않는다.
    if (diaryId) {
      await prisma.diary.delete({ where: { id: diaryId } }).catch(() => {});
      const c = await counterOf(userId);
      if (c !== before) {
        await prisma.character.update({
          where: { userId },
          data: { storageUsedBytes: BigInt(before) },
        });
      }
    }
    const leftover = await prisma.diary.count({
      where: { userId, createdAt: ISOLATED },
    });
    console.log(`\n격리날짜 잔존 일기: ${leftover}건`);
    if (leftover > 0) failures++;
    console.log(`최종 카운터: ${await counterOf(userId)} (시작 ${before})`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log(failures === 0 ? "\nPASS" : `\nFAIL (${failures}건)`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch(async (e) => {
    console.error("❌", e);
    await prisma.$disconnect();
    process.exit(1);
  });
