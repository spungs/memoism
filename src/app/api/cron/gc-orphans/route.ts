import { NextResponse, type NextRequest } from "next/server";
import { scanOrphans, deleteOrphans, type OrphanScan } from "@/lib/storage/gc";

// 고아 이미지 GC 엔드포인트 (탈퇴와 무관한 상시 청소).
//
// 트리거: 리마인드(reminder-push)와 동일하게 **Supabase pg_cron + pg_net**이 호출한다
// (Vercel Hobby cron은 실행 보장이 없어 사용 안 함). 미들웨어가 /api/cron/* 를 우회하므로
// 쿠키 없는 호출이 도달하며, 본 핸들러는 CRON_SECRET으로 자체 인증한다.
//
// ── 스케줄 SQL (검토 끝난 뒤 Supabase SQL Editor에서 실행 — 지금은 미적용) ──
//   select cron.schedule(
//     'gc-orphans',
//     '30 4 * * *',  -- 매일 04:30 UTC (= 13:30 KST), 트래픽 적은 시간
//     $$ select net.http_get(
//          url := 'https://memoism-spungs.vercel.app/api/cron/gc-orphans?execute=true',
//          headers := jsonb_build_object(
//            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET')
//          )
//        ) $$
//   );
//   -- 해제: select cron.unschedule('gc-orphans');
//
// 파라미터:
//   execute=true   실제 삭제. 미지정/false면 dry-run(아무것도 안 지움, 무엇을 지울지 보고만).
//   graceHours=48  업로드 후 이 시간 지난 고아만 대상(진행 중 검토 세션 보호). 기본 48h.
//   force=true     안전 상한(1회 MAX_EXECUTE_WITHOUT_FORCE 초과) 무시하고 강행.

const DEFAULT_GRACE_HOURS = 48;
const GRACE_MIN = 1;
const GRACE_MAX = 24 * 30; // 30일
const MAX_EXECUTE_WITHOUT_FORCE = 1000; // 1회 실행에서 이보다 많으면 force 없이는 거부
const SAMPLE_LIMIT = 500; // 응답에 싣는 eligible 목록 최대치

function clampGrace(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_GRACE_HOURS;
  return Math.min(GRACE_MAX, Math.max(GRACE_MIN, Math.floor(n)));
}

function summarize(scan: OrphanScan) {
  return {
    graceHours: scan.graceHours,
    scannedObjects: scan.scannedObjects,
    referencedCount: scan.referencedCount,
    orphanTotal: scan.orphanTotal,
    eligibleCount: scan.eligibleCount,
    eligibleBytes: scan.eligibleBytes,
    eligibleMB: Number((scan.eligibleBytes / 1024 / 1024).toFixed(2)),
    byOwner: scan.byOwner,
    eligibleSample: scan.eligible.slice(0, SAMPLE_LIMIT),
    eligibleTruncated: scan.eligible.length > SAMPLE_LIMIT,
  };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const graceHours = clampGrace(url.searchParams.get("graceHours"));
  const execute = url.searchParams.get("execute") === "true";
  const force = url.searchParams.get("force") === "true";

  const scan = await scanOrphans(graceHours, Date.now());

  // 🔒 안전장치 2 발동: DB 조회 이상 의심 → 삭제 안 함.
  if (scan.aborted) {
    console.warn("[gc-orphans] ABORTED:", scan.aborted);
    return NextResponse.json({ ok: false, dryRun: !execute, aborted: scan.aborted, ...summarize(scan) }, { status: 200 });
  }

  // dry-run (기본): 무엇을 지울지 보고만.
  if (!execute) {
    console.log(`[gc-orphans] DRY-RUN grace=${graceHours}h eligible=${scan.eligibleCount}/${scan.orphanTotal} (${(scan.eligibleBytes / 1024 / 1024).toFixed(2)}MB)`);
    return NextResponse.json({ ok: true, dryRun: true, ...summarize(scan) });
  }

  // 🔒 안전 상한: 한 번에 너무 많이 지우려 하면 force 없이는 거부.
  if (scan.eligibleCount > MAX_EXECUTE_WITHOUT_FORCE && !force) {
    console.warn(`[gc-orphans] REFUSED execute: eligible=${scan.eligibleCount} > cap=${MAX_EXECUTE_WITHOUT_FORCE} (force=true 필요)`);
    return NextResponse.json(
      { ok: false, dryRun: false, error: `삭제 후보 ${scan.eligibleCount}건이 상한 ${MAX_EXECUTE_WITHOUT_FORCE}을 초과 — force=true 필요`, ...summarize(scan) },
      { status: 409 },
    );
  }

  console.warn(`[gc-orphans] EXECUTE grace=${graceHours}h deleting=${scan.eligibleCount} (${(scan.eligibleBytes / 1024 / 1024).toFixed(2)}MB)`);
  for (const o of scan.eligible) {
    console.log(`[gc-orphans] delete ${o.path} (${o.sizeBytes}B, uploaded ${o.createdAt})`);
  }
  const result = await deleteOrphans(scan);

  return NextResponse.json({
    ok: true,
    dryRun: false,
    deleted: result.requested,
    skippedNowReferenced: result.skippedNowReferenced,
    ...summarize(scan),
  });
}
