# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> General coding behavior guidelines live in `~/.claude/CLAUDE.md` (global) and apply to every project.

## Project reality vs. README

`README.md` is an aspirational product spec for a **React Native / Expo** app with a FastAPI backend. The actual code in this repo is a **Next.js 15 (App Router) PWA** with a Postgres/Prisma backend and Server Actions. Treat README only as a source of product/UX intent (user stories, pricing, character mechanics). Ignore its tech-stack and folder-structure sections.

## Commands

```bash
pnpm dev            # next dev with Turbopack
pnpm build          # production build (also runs PWA service-worker generation)
pnpm start          # serve the production build
pnpm lint           # eslint (next/core-web-vitals + next/typescript)

pnpm db:push        # apply schema.prisma to the DB without a migration file (dev shortcut)
pnpm db:migrate     # prisma migrate dev — create + apply a named migration
pnpm db:generate    # regenerate Prisma client after schema changes
pnpm db:studio      # open Prisma Studio

docker compose up -d postgres   # local Postgres on :5432 (compose default), user/pass/db all "memoism" — keep the port in .env.local in sync if you remap it
```

`postinstall` runs `prisma generate`, so a fresh `pnpm install` produces a working client. After editing `prisma/schema.prisma` re-run `pnpm db:generate` (or `db:push`/`db:migrate`).

## Environment

Copy `.env.local.example` → `.env.local` (it lists every var). These are required:

- `DATABASE_URL` — Postgres URL **including `?schema=app`**. Every Prisma model is mapped to the `app` schema in single-schema mode (no `@@schema` annotations).
- `JWT_SECRET` — HS256 signing key for session cookies. Rotating it invalidates all sessions.
- `CRON_SECRET` — required in any deployed env. `/api/cron/*` rejects every call when it is unset (`src/lib/cron-auth.ts`).

`prisma.config.ts` loads `.env` then `.env.local` (latter overrides) so Prisma CLI sees the same values as the Next runtime.

## Architecture

### Auth: JWT cookie + middleware route gate

- `src/lib/auth/session.ts` signs HS256 JWTs with `jose` and stores them in an httpOnly `session` cookie (30-day TTL, `SESSION_DURATION_SECONDS` in `jwt.ts`). The middleware re-issues the cookie once less than half the TTL remains (sliding session). Cookie name/options live in `jwt.ts` only.
- `src/middleware.ts` is the single source of truth for route protection. It runs on every non-asset path: authed users hitting `/login` or `/signup` are bounced to `/`; unauthed users hitting anything else get redirected to `/login` (page routes) or get a JSON 401 (paths under `/api/`). When adding a new public route, add it to `PUBLIC_PATHS` in `middleware.ts`.
- The route group `src/app/(auth)` and `src/app/(protected)` is **organisational only** — protection comes from middleware, not from layout checks. Don't rely on the group name to enforce auth.
- Server Actions (`src/lib/*/actions.ts`) and API routes still call `getSession()` themselves before mutating, since middleware only checks cookie validity, not authorization for a specific resource.

### Data layer: Prisma singleton

`src/lib/db.ts` exports a `prisma` singleton stashed on `globalThis` in non-prod to survive Next.js HMR (otherwise each hot reload spawns a new connection pool). Always import from `@/lib/db`; never `new PrismaClient()` directly.

### Domain modules

Each domain folder under `src/lib/<domain>/` follows the same shape:

- `schemas.ts` — Zod schemas + inferred TS types
- `actions.ts` — `"use server"` Server Actions (form mutations, return discriminated `{ ok: true | false }` results)
- `queries.ts` — server-only read functions called from RSC

Current domains: `auth`, `diary`, `character`, `storage` (image upload helpers).

### Diary image lifecycle

A diary holds up to 10 photos as `DiaryImage` rows ordered by `orderIndex`. `updateDiaryAction` takes `removeImageIds` (JSON id list) plus new files in `image`: removed rows are deleted inside the DB transaction (with the storage counter decrement), and their files are deleted from storage **after** it commits via `deleteUnreferencedImages`, which skips any file another row still references. `deleteDiaryAction` follows the same DB → storage order. Preserve it — deleting files first loses photos when the DB write fails.

### Character & subscription invariants (per `prisma/schema.prisma` comments)

- `User` ↔ `Character` is 1:1. Signup creates both inside one `prisma.$transaction` (`signupAction`); never create a `User` without a `Character`.
- The gamification columns (coins, sleep state, trial, per-user name) were dropped — see the `Character` comment in `schema.prisma`. The character name is fixed (`CHARACTER_NAME` in `src/lib/character/utils.ts`).
- `subscriptionStatus` (beta users default to `ACTIVE`) plus `plan` decide the daily AI cap (`src/lib/ai/usage.ts`).

### UI stack

- Tailwind v4 + shadcn (style `base-nova`, neutral base, CSS variables) configured in `components.json`. CSS lives in `src/app/globals.css`. Component aliases: `@/components/ui` for shadcn primitives, `@/components/<domain>` for feature components.
- Base UI primitives via `@base-ui/react`, icons via `lucide-react`.
- Forms are plain React state / `useActionState` calling Server Actions, which validate with the Zod schemas in `schemas.ts`. (`react-hook-form` is installed but unused.)
- `@tanstack/react-query` has a provider mounted (`src/providers/query-provider.tsx`) but no queries use it yet.
- PWA wrapper via `@ducanh2912/next-pwa` in `next.config.ts` — disabled in dev. The service worker (`public/sw.js`, `workbox-*.js`, etc.) is build-generated; don't edit by hand and don't commit it.
- Korean is the primary UI language (`<html lang="ko">`, all error strings are Korean). Match this when adding user-facing text.

### Dates: 현지 날짜 vs 저장 기준점

날짜는 두 좌표계로 나눠 다룬다(해외여행 대응, `docs/superpowers/plans/2026-09-29-local-timezone-dates.md`).

- **현지 날짜** — "오늘이 며칠인지", 새벽 기록 규칙, "어제·지난주" 해석, 사진 촬영일, 날짜 상한, AI에게 주는 오늘·시각, 시각 표시. 기기 시간대 기준이다. 서버는 쿠키 `tz`(루트 레이아웃 인라인 스크립트가 심음)를 `getRequestTimeZone()`(`src/lib/tz-server.ts`)으로 읽어 **인자로** 넘기고, 클라이언트는 렌더 중엔 `useDeviceTimeZone()`/`useDeviceTodayKey()`(`src/lib/tz-client.ts`), 핸들러에선 `deviceTimeZone()`을 쓴다. 도구는 `src/lib/tz.ts`.
- **저장 기준점** — 일기가 어느 칸에 속하는지. KST 고정(`src/lib/diary/kst.ts`): `diaryCreatedAtForDateKey`(앵커), `kstDayRangeFromKey`·`kstMonthRangeUtc`(조회 범위), `kstDateKey(diary.createdAt)`(일기의 날짜). 현지 날짜로 정한 dateKey를 그대로 여기에 넘긴다 — 그래서 한국에 돌아와도 여행 중 일기 날짜가 바뀌지 않는다.
- 새 코드에서 `kstTodayKey()`로 "사용자의 오늘"을 구하지 말 것. 22시 리마인더와 사용 횟수 초기화(`usage.ts`)는 결정에 따라 KST 그대로다.
- 클라이언트 컴포넌트가 렌더 중 `deviceTimeZone()`을 직접 부르면 서버(UTC)와 달라 하이드레이션 불일치가 난다 — 훅을 쓸 것.

### Path aliases

`@/*` → `src/*` (see `tsconfig.json`). Use it consistently — mixed relative/aliased imports for the same target are a code-review smell here.

### Design system

프로젝트 루트의 [`DESIGN.md`](./DESIGN.md)가 디자인 시스템의 **단일 진실 출처**다. [Google `DESIGN.md` spec](https://github.com/google-labs-code/design.md) (Apache 2.0) 포맷을 따른다 — YAML 프론트매터(기계 판독 토큰) + 마크다운 8섹션(Overview / Colors / Typography / Layout / Elevation / Shapes / Components / Do's and Don'ts).

- **새 컴포넌트·화면을 만들거나 기존 UI를 손보기 전에 `DESIGN.md`를 먼저 확인**한다. 토큰·프리셋·컴포넌트 규약과 brand do/don't 가이드가 정리되어 있다.
- YAML 토큰은 `src/app/globals.css`의 CSS variables와 **1:1 매핑**된다. 색·간격·radius·typography preset을 추가/변경할 때는 두 곳을 함께 업데이트해야 drift가 안 생긴다 (자동 동기화 스크립트는 V2 검토).
- `designer` / `developer` subagent를 호출할 때 prompt에 `DESIGN.md`를 명시적으로 컨텍스트로 넣으면 메모이즘 톤(종이·잉크·따뜻한 sepia)을 즉시 반영한다.
- 토큰 참조 문법은 `{colors.paper.0}` / `{typography.fonts.serif}` / `{spacing.4}` / `{rounded.md}` 등 점 표기.

---