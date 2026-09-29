import { timingSafeEqual } from "node:crypto";

/**
 * cron 요청 인증 — `Authorization: Bearer <CRON_SECRET>` 헤더를 상수시간 비교한다.
 * (Supabase pg_cron의 net.http_get이 헤더를 붙인다. 시크릿은 Supabase Vault에 보관)
 *
 * 미들웨어가 `/api/cron/*`의 세션 검사를 건너뛰므로 이 함수가 유일한 방어선이다.
 *   - 시크릿이 없으면 무조건 거절한다. 예전 비교식 `Bearer ${process.env.CRON_SECRET}`은
 *     시크릿이 빠진 배포(프리뷰 등)에서 "Bearer undefined"가 되어 그 문자열로 통과했다
 *     (2026-09-29 점검 H7).
 *   - 평문 `!==`는 첫 불일치 바이트에서 끝나 응답 시간으로 시크릿을 추정할 틈이 생긴다.
 *
 * SnapshotFinance의 lib/cron-auth.ts와 같은 구현이다.
 */
export function isAuthorizedCron(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;

  const provided = Buffer.from(authHeader);
  const expected = Buffer.from(`Bearer ${secret}`);
  // timingSafeEqual은 길이가 다르면 throw한다 — 길이는 비밀이 아니므로 먼저 가른다.
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
