import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Load Next.js-style env files. .env.local takes precedence so individual
// devs can override shared defaults from .env without committing secrets.
//
// 운영 등 다른 DB에 Prisma 명령을 보낼 때는 PRISMA_ENV_FILE로 env 파일을 지정한다
// (예: `PRISMA_ENV_FILE=.env.seoul pnpm db:deploy`). 지정하면 그 파일만 읽는다 —
// 명령 앞에 DATABASE_URL을 줘도 .env.local이 override로 덮어써 로컬 DB로 조용히
// 가던 함정을 막는다.
const targetEnvFile = process.env.PRISMA_ENV_FILE;
if (targetEnvFile) {
  loadEnv({ path: targetEnvFile, override: true });
} else {
  loadEnv({ path: ".env" });
  loadEnv({ path: ".env.local", override: true });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
    // 마이그레이션은 풀러(pgbouncer)가 아니라 직접 연결로 — 스키마의 directUrl과 같은 값.
    directUrl: process.env.DIRECT_URL,
  },
});
