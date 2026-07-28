/**
 * 스토리지 사용량 백필 (스토리지 쿼터 도입분).
 *   1. sizeBytes=0인 DiaryImage를 버킷 실측 크기로 채운다.
 *   2. Character.storageUsedBytes를 사용자별 SUM(sizeBytes)으로 재계산한다.
 *
 * 실행: pnpm backfill-storage-usage            (dry-run — 아무것도 안 바꿈)
 *       pnpm backfill-storage-usage -- --write (실제 반영)
 *
 * 비파괴: 사진 파일·일기 본문은 건드리지 않는다. 채우는 건 크기 캐시뿐이다.
 * 이미 값이 있는 sizeBytes는 덮어쓰지 않고 불일치만 보고한다(라이브 쓰기와 다투지 않도록).
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env", quiet: true });
loadEnv({ path: ".env.local", override: true, quiet: true });

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "diary-images";
const WRITE = process.argv.includes("--write");
const CHUNK = 500;

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

/** 버킷 전체를 나열해 path → size 맵을 만든다 (루트 폴더 = userId). */
async function loadBucketSizes(
  sb: ReturnType<typeof createClient>,
): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  const { data: roots, error } = await sb.storage
    .from(BUCKET)
    .list("", { limit: 1000 });
  if (error) throw new Error(`버킷 루트 나열 실패: ${error.message}`);

  for (const r of roots ?? []) {
    if (r.id) continue; // 폴더는 id falsy; 루트 직속 파일은 무시
    let offset = 0;
    for (;;) {
      const { data: list, error: e2 } = await sb.storage
        .from(BUCKET)
        .list(r.name, { limit: 1000, offset });
      if (e2) {
        console.warn(`  [warn] ${r.name} 나열 실패: ${e2.message}`);
        break;
      }
      const batch = list ?? [];
      for (const f of batch) {
        if (!f.id) continue;
        sizes.set(`${r.name}/${f.name}`, Number(f.metadata?.size) || 0);
      }
      if (batch.length < 1000) break;
      offset += batch.length;
    }
  }
  return sizes;
}

async function run(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
    return 1;
  }

  console.log(WRITE ? "MODE: --write (실제 반영)" : "MODE: dry-run (변경 없음)");

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const prisma = new PrismaClient();

  try {
    const bucketSizes = await loadBucketSizes(sb);
    console.log(`버킷 객체: ${bucketSizes.size}건`);

    // 고아 이미지는 제외해야 하므로 diary를 조인해 소유자를 함께 가져온다.
    const images = await prisma.diaryImage.findMany({
      select: {
        id: true,
        storagePath: true,
        sizeBytes: true,
        diary: { select: { userId: true } },
      },
    });
    console.log(`DiaryImage: ${images.length}건`);

    // ── 1. sizeBytes 채우기 대상 산출 ──
    const toFill: Array<{ id: string; size: number }> = [];
    let missingInBucket = 0;
    let mismatched = 0;
    // 사용자별 "채운 뒤" 예상 합계 — dry-run/write 모두 같은 값으로 판정한다.
    const projected = new Map<string, number>();

    for (const img of images) {
      const bucketSize = bucketSizes.get(img.storagePath);
      let effective = img.sizeBytes;

      if (img.sizeBytes === 0) {
        if (bucketSize === undefined) {
          missingInBucket++; // 파일이 없는 DB row (삭제됐거나 legacy 경로)
        } else {
          effective = bucketSize;
          if (bucketSize > 0) toFill.push({ id: img.id, size: bucketSize });
        }
      } else if (bucketSize !== undefined && bucketSize !== img.sizeBytes) {
        mismatched++; // 보고만 하고 덮어쓰지 않는다
      }

      const userId = img.diary.userId;
      projected.set(userId, (projected.get(userId) ?? 0) + effective);
    }

    console.log(
      `\n[1] sizeBytes 채울 대상: ${toFill.length}건` +
        ` / 버킷에 파일 없음: ${missingInBucket}건` +
        ` / 기존값 불일치(건드리지 않음): ${mismatched}건`,
    );

    // ── 2. Character.storageUsedBytes 재계산 대상 산출 ──
    const characters = await prisma.character.findMany({
      select: { userId: true, storageUsedBytes: true },
    });
    const toUpdate: Array<{ userId: string; from: number; to: number }> = [];
    for (const c of characters) {
      const from = Number(c.storageUsedBytes);
      const to = projected.get(c.userId) ?? 0;
      if (from !== to) toUpdate.push({ userId: c.userId, from, to });
    }

    console.log(`[2] storageUsedBytes 갱신 대상: ${toUpdate.length}/${characters.length}명`);
    for (const u of toUpdate) {
      console.log(
        `    ${u.userId}: ${mb(u.from)}MB → ${mb(u.to)}MB` +
          ` (${u.to >= u.from ? "+" : ""}${mb(u.to - u.from)}MB)`,
      );
    }

    if (!WRITE) {
      console.log("\ndry-run 종료 — 반영하려면 --write");
      return 0;
    }

    // ── 3. 반영 ──
    // 같은 크기끼리 묶어 updateMany 횟수를 줄인다.
    const bySize = new Map<number, string[]>();
    for (const f of toFill) {
      const ids = bySize.get(f.size) ?? [];
      ids.push(f.id);
      bySize.set(f.size, ids);
    }
    let filled = 0;
    for (const [size, ids] of bySize) {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const r = await prisma.diaryImage.updateMany({
          where: { id: { in: slice } },
          data: { sizeBytes: size },
        });
        filled += r.count;
      }
    }
    console.log(`\n[1] sizeBytes 반영: ${filled}건`);

    for (const u of toUpdate) {
      await prisma.character.update({
        where: { userId: u.userId },
        data: { storageUsedBytes: BigInt(u.to) },
      });
    }
    console.log(`[2] storageUsedBytes 반영: ${toUpdate.length}명`);

    console.log("\n완료.");
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

run()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error("❌ 실패:", e);
    process.exit(1);
  });
