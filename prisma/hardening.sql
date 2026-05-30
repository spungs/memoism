-- Memoism · Postgres 보안 하드닝 (멱등)
-- 목적: PostgREST Data API role(anon/authenticated)이 app 스키마 데이터에
--       절대 닿지 못하게 못박는다. 현재도 grant가 0개라 no-op이지만, 향후
--       실수로 grant가 생기는 것을 방지하는 방어선이다.
-- 적용: Supabase MCP execute_sql 또는 DIRECT_URL(postgres) 세션에서 실행.
--       DCL이므로 Prisma 마이그레이션이 관리하지 않는다.
-- 비대상: service_role(백엔드용, bypassrls)·PUBLIC은 건드리지 않는다
--         (Supabase 내부 동작 영향 회피).

revoke all on all tables    in schema app from anon, authenticated;
revoke all on all sequences in schema app from anon, authenticated;
revoke all on all functions in schema app from anon, authenticated;
revoke usage on schema app from anon, authenticated;

-- 미래에 postgres가 app 스키마에 생성하는 객체에 대한 자동 grant도 차단
alter default privileges for role postgres in schema app
  revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema app
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema app
  revoke all on functions from anon, authenticated;
