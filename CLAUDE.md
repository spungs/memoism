# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

docker compose up -d postgres   # local Postgres on :5432, user/pass/db all "memoism"
```

`postinstall` runs `prisma generate`, so a fresh `pnpm install` produces a working client. After editing `prisma/schema.prisma` re-run `pnpm db:generate` (or `db:push`/`db:migrate`).

## Environment

Copy `.env.local.example` → `.env.local`. Two vars are required:

- `DATABASE_URL` — Postgres URL **including `?schema=app`**. Every Prisma model is mapped to the `app` schema in single-schema mode (no `@@schema` annotations).
- `JWT_SECRET` — HS256 signing key for session cookies. Rotating it invalidates all sessions.

`prisma.config.ts` loads `.env` then `.env.local` (latter overrides) so Prisma CLI sees the same values as the Next runtime.

## Architecture

### Auth: JWT cookie + middleware route gate

- `src/lib/auth/session.ts` signs HS256 JWTs with `jose` and stores them in an httpOnly `session` cookie (7-day TTL).
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

`updateDiaryAction` uses an `imageMode` form field with three values: absent / `"__keep__"` (no change), `"remove"` (drop existing), or a new file in the `image` field (replace). On replace/remove the old image is deleted from storage **after** the DB update succeeds. `deleteDiaryAction` deletes all images after the row is removed. Preserve this ordering — uploading before DB write would orphan files on validation failure.

### Character & subscription invariants (per `prisma/schema.prisma` comments)

- `User` ↔ `Character` is 1:1. Signup creates both inside one `prisma.$transaction` (`signupAction`); never create a `User` without a `Character`.
- Trial starts at signup for 30 days (`trialEndDate` in `src/lib/character/utils.ts`).
- `Character.coinBalance` is a denormalised cache of `SUM(CoinTransaction.amount)`. **Always update it inside the same transaction as the `CoinTransaction` insert**, or the cache drifts.
- `Character.isAsleep` is a derived visual flag; `subscriptionStatus` is authoritative.

### UI stack

- Tailwind v4 + shadcn (style `base-nova`, neutral base, CSS variables) configured in `components.json`. CSS lives in `src/app/globals.css`. Component aliases: `@/components/ui` for shadcn primitives, `@/components/<domain>` for feature components.
- Base UI primitives via `@base-ui/react`, icons via `lucide-react`.
- Forms use `react-hook-form` + `@hookform/resolvers/zod`, sharing the same Zod schemas the Server Actions validate against.
- Client cache via `@tanstack/react-query` (provider in `src/providers/query-provider.tsx`).
- PWA wrapper via `@ducanh2912/next-pwa` in `next.config.ts` — disabled in dev. The service worker (`public/sw.js`, `workbox-*.js`, etc.) is build-generated; don't edit by hand and don't commit it.
- Korean is the primary UI language (`<html lang="ko">`, all error strings are Korean). Match this when adding user-facing text.

### Path aliases

`@/*` → `src/*` (see `tsconfig.json`). Use it consistently — mixed relative/aliased imports for the same target are a code-review smell here.

---