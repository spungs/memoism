# Repository Guidelines

## Project Structure & Modules
- `apps/backend`: FastAPI + SQLModel API (PostgreSQL). Migrations under `apps/backend/supabase/migrations/`.
- `apps/mobile`: React Native (Expo) app. Assets in `apps/mobile/assets/`.
- `packages/`: Reserved for shared libs (`ui`, `api`, `eslint-config`).
- `docs/`: Architecture and product notes. 
- `Blender/`: 3D assets (non-code).

## Build, Test, and Development
- Backend (local):
  - Create venv and install: `cd apps/backend && python -m venv .venv && . .venv/bin/activate && pip install -e .`
  - Run API: `PYTHONPATH=. uvicorn main:app --host 127.0.0.1 --port 8000 --reload`
  - DB: set `DATABASE_URL` (Postgres). Apply SQL if needed: `psql "$DATABASE_URL" -f supabase/migrations/20240518_initial_schema.sql`.
- Mobile (Expo):
  - Install deps: `cd apps/mobile && npm install`
  - Start dev server: `npm run start` (add `--clear` if cache issues). 
  - Platform builds: `npm run ios` / `npm run android` (requires Xcode/Android SDK).

## Coding Style & Naming
- Python: 4-space indent, type hints where practical, PEP 8. Prefer Black-compatible formatting and imports grouped (std/third-party/local). Modules: `snake_case.py`; classes `PascalCase`; functions/vars `snake_case`.
- TypeScript/JS: 2-space indent, ES modules, functional components. Files `camelCase.tsx|.ts`, React components `PascalCase`. Keep hooks in `useSomething.ts`.
- Avoid breaking public APIs; prefer small, focused PRs.

## Testing Guidelines
- Backend: add `pytest` tests under `apps/backend/tests/` (e.g., `test_auth.py`). Aim for key route coverage and model logic. Run: `pytest` (after adding dev deps).
- Mobile: add Jest tests under `apps/mobile/__tests__/` (e.g., `App.test.tsx`). Run: `npm test` (configure Jest if missing). Consider Detox for E2E later.

## Commit & Pull Requests
- Commit style: Prefer Conventional Commits (`feat:`, `fix:`, `refactor:`). Short imperative subject; optional body for context. English preferred; concise Korean acceptable.
- PRs: clear description (what/why), linked issue, screenshots or curl examples for UI/API changes, and run instructions. Keep diffs minimal; update docs when behavior changes.

## Security & Config
- Use `.env` for local secrets (`SUPABASE_*`, `DATABASE_URL`). Do not commit new secrets; prefer `.env.local` and document required keys in `README.md`.
- CORS: open in dev; restrict origins in production.

## Agent-Specific Instructions
- Follow this guide’s scope and keep edits surgical. Respect existing style, avoid mass refactors, and do not introduce unrelated tooling.
