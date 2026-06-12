/**
 * Supabase 사용량 + 성장률 모니터링 (read-only).
 *   - 파일 스토리지: diary-images 버킷 객체 크기 합산 (사용자별).
 *   - DB 크기: pg_database_size.
 *   - 성장률: 사용자별 일평균 적재량(MB/day)과 1GB 도달 예상.
 *
 * 실행: pnpm storage-usage
 *   - service-role 키로 버킷을 직접 나열하므로 운영 데이터 기준 실측.
 *   - 변경 없음(나열·집계·SELECT만).
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env", quiet: true });
loadEnv({ path: ".env.local", override: true, quiet: true });

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "diary-images";
const FREE_STORAGE_MB = 1024; // Supabase Free: 1GB 파일 스토리지
const FREE_DB_MB = 500; // Supabase Free: 500MB DB
const DAY_MS = 24 * 60 * 60 * 1000;
const mb = (bytes: number) => bytes / 1024 / 1024;
const fmt = (n: number) => n.toFixed(2);

// ── 터미널 시각화 (ANSI 색 + 게이지 바) ──
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[90m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};
const levelColor = (p: number) => (p >= 80 ? C.red : p >= 50 ? C.yellow : C.green);
/** 한도 대비 채움 게이지 [████░░░░] — 80%+ 빨강 / 50%+ 노랑 / 그 외 초록. */
function gauge(p: number, width = 22): string {
  const filled = Math.min(width, Math.max(0, Math.round((p / 100) * width)));
  return `${C.dim}[${levelColor(p)}${"█".repeat(filled)}${C.dim}${"░".repeat(width - filled)}]${C.reset}`;
}
/** 상대 비교 게이지 (최댓값=꽉 참) — 사용자별 쏠림 시각화. */
function relGauge(value: number, max: number, width = 16): string {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return `${C.dim}[${C.cyan}${"█".repeat(filled)}${C.dim}${"░".repeat(width - filled)}]${C.reset}`;
}
const pctLabel = (p: number) => `${levelColor(p)}${p.toFixed(1).padStart(5)}%${C.reset}`;

async function run(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
    return 1;
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1. 버킷 객체 크기 집계 (루트 폴더 = userId) ──
  const { data: roots, error } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) {
    console.error("❌ 버킷 나열 실패:", error.message);
    return 1;
  }

  let totalBytes = 0;
  let totalFiles = 0;
  const perUser = new Map<string, { files: number; bytes: number }>();

  for (const r of roots ?? []) {
    if (r.id) continue; // 폴더는 id falsy; 루트 직속 파일 무시
    let offset = 0;
    let bytes = 0;
    let files = 0;
    for (;;) {
      const { data: list, error: e2 } = await sb.storage
        .from(BUCKET)
        .list(r.name, { limit: 1000, offset });
      if (e2) {
        console.warn(`  [warn] ${r.name} 나열 실패:`, e2.message);
        break;
      }
      const batch = list ?? [];
      for (const f of batch) {
        if (!f.id) continue;
        bytes += Number(f.metadata?.size) || 0;
        files++;
      }
      if (batch.length < 1000) break;
      offset += batch.length;
    }
    totalBytes += bytes;
    totalFiles += files;
    perUser.set(r.name, { files, bytes });
  }

  // ── 2. 사용자별 활동 시작일(첫 일기) → 일평균 적재율 ──
  const prisma = new PrismaClient();
  let dbBytes = 0;
  const firstDiaryByUser = new Map<string, Date>();
  try {
    const grouped = await prisma.diary.groupBy({
      by: ["userId"],
      _min: { createdAt: true },
      _count: true,
    });
    for (const g of grouped) {
      if (g._min.createdAt) firstDiaryByUser.set(g.userId, g._min.createdAt);
    }
    const rows = await prisma.$queryRaw<Array<{ size: bigint }>>`
      SELECT pg_database_size(current_database()) AS size
    `;
    dbBytes = Number(rows[0]?.size ?? 0);
  } finally {
    await prisma.$disconnect();
  }

  const now = new Date();

  // ── 집계값 ──
  const rowsOut = [...perUser.entries()]
    .map(([userId, u]) => {
      const first = firstDiaryByUser.get(userId);
      const days = first ? Math.max(1, (now.getTime() - first.getTime()) / DAY_MS) : null;
      const perDay = days ? mb(u.bytes) / days : null;
      return { userId, files: u.files, bytes: u.bytes, days, perDay };
    })
    .sort((a, b) => b.bytes - a.bytes);
  const rates = rowsOut.map((r) => r.perDay).filter((x): x is number => x != null && x > 0);
  const heaviest = rates.length ? Math.max(...rates) : 0;
  const remainingMb = FREE_STORAGE_MB - mb(totalBytes);
  const maxBytes = Math.max(...rowsOut.map((r) => r.bytes), 1);
  const stoPct = (mb(totalBytes) / FREE_STORAGE_MB) * 100;
  const dbPct = (mb(dbBytes) / FREE_DB_MB) * 100;

  // ── 출력 ──
  console.log("");
  console.log(`${C.bold}  Supabase 사용량${C.reset}${C.dim}  ·  Free 플랜${C.reset}`);
  console.log("");
  console.log(
    `  파일 스토리지  ${gauge(stoPct)} ${pctLabel(stoPct)}   ${fmt(mb(totalBytes))} / ${FREE_STORAGE_MB} MB ${C.dim}(${totalFiles}장·${perUser.size}명)${C.reset}`,
  );
  console.log(
    `  데이터베이스   ${gauge(dbPct)} ${pctLabel(dbPct)}   ${fmt(mb(dbBytes))} / ${FREE_DB_MB} MB`,
  );

  console.log("");
  console.log(`${C.dim}  사용자별 (사용량 큰 순)${C.reset}`);
  for (const r of rowsOut) {
    const days = r.days ? `${r.days.toFixed(0)}일` : "—";
    const perDay = r.perDay != null ? `${fmt(r.perDay)} MB/day` : "—";
    console.log(
      `  ${r.userId.slice(0, 8)}  ${relGauge(r.bytes, maxBytes)}  ${(fmt(mb(r.bytes)) + "MB").padStart(9)}  ${(r.files + "장").padStart(5)}  ${days.padStart(4)}  ${C.dim}${perDay}${C.reset}`,
    );
  }

  console.log("");
  console.log(`${C.dim}  1GB 도달 예상  ·  헤비유저 ${fmt(heaviest)} MB/day 기준${C.reset}`);
  for (const n of [1, 5, 10, 50]) {
    const rate = heaviest * n;
    const d = rate > 0 ? remainingMb / rate : Infinity;
    const months = d === Infinity ? "∞" : (d / 30).toFixed(1);
    console.log(
      `  헤비 ${String(n).padStart(2)}명   ${(fmt(rate) + " MB/day").padStart(14)}  →  ~${d === Infinity ? "∞" : Math.round(d)}일 ${C.dim}(${months}개월)${C.reset}`,
    );
  }
  console.log("");

  return 0;
}

run().then((c) => process.exit(c)).catch((e) => { console.error(e); process.exit(1); });
