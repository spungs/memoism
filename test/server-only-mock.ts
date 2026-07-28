// vitest용 "server-only" 셔임. 실제 패키지는 next 빌드(webpack/turbopack)가
// server-only↔next/dist/compiled/server-only 별칭을 내부 처리해 resolve되지만,
// vitest(vite-node)는 이 별칭을 모르고 순수 node 모듈 해석만 하므로 미설치 패키지로
// 잡힌다 (Cannot find module 'server-only'). vitest.config.ts의 resolve.alias가
// "server-only" import를 이 빈 모듈로 돌려 테스트 환경에서도 통과하게 한다.
export {};
