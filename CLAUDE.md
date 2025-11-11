# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memoism is a mobile-first diary application with an AI character companion. Users write diary entries, and the AI character helps search, recall, and reflect on past entries through natural conversation. The project is a monorepo with a React Native mobile app and a FastAPI backend.

## Development Commands

### Backend (FastAPI)
```bash
# Setup
cd apps/backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .

# Run development server
PYTHONPATH=. uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Apply database migrations
psql "$DATABASE_URL" -f supabase/migrations/20240518_initial_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20250921_add_location_to_diary.sql
```

### Mobile (React Native/Expo)
```bash
# Setup
cd apps/mobile
npm install

# Development
npm run start              # Start Expo dev server
npm run start -- --clear   # Start with cache cleared
npm run ios                # Run on iOS simulator (requires Xcode)
npm run android            # Run on Android emulator (requires Android SDK)
```

## Architecture

### Backend Structure (`apps/backend/`)
- **FastAPI application** with modular routers
- `main.py`: FastAPI app entry point with CORS middleware
- `models.py`: SQLModel models (Profile, Diary, StoreItem, UserItem)
- `database.py`: PostgreSQL connection and session management
- `auth/`: Authentication module (router, schemas, JWT utils)
- `diary/`: Diary CRUD module (router, schemas)
- `supabase/migrations/`: SQL migration files

**Key models:**
- `Profile`: User accounts with character_age, coins, subscription
- `Diary`: User diary entries with optional images and location (JSONB)
- Location data stored as JSONB for flexible geographic data

### Mobile Structure (`apps/mobile/`)
- **Expo-managed React Native app** with TypeScript
- `App.tsx`: Root component with navigation setup (Stack + Bottom Tabs)
- `screens/`: Screen components
  - Auth: AuthLoginScreen, AuthSignupScreen
  - Diary: DiaryListScreen, DiaryDetailScreen, DiaryEditScreen
  - MapScreen: Displays diary entries on a map
  - SettingsScreen: User settings and profile
- `components/`: Reusable UI components (AiCharacter, CalendarModal)
- `store/`: Zustand state management (authStore, diaryStore)
- `api/`: React Query hooks and API client (authApi, diaryApi, config)
- `locales/`: i18n translations (en, ko, ja, zh)
- `utils/`: Utility functions and navigation reference
- `assets/`: Images and static resources

**State Management:**
- **Zustand** for global state (auth token, user)
- **React Query** for server state (diaries, API caching)
- Zustand stores are minimal; most data fetching uses React Query

**Navigation:**
- React Navigation 7 with Stack + Bottom Tabs
- Unauthenticated: AuthLogin, AuthSignup screens
- Authenticated: MainTabs (DiaryList) → DiaryDetail, DiaryEdit, Map, Settings

### Styling
- **Tailwind CSS** via Nativewind for React Native
- Custom theme colors defined in `tailwind.config.js` (primary, secondary, background, surface, error)
- Use Tailwind classes in JSX with `className` prop

### Internationalization
- **i18next** with 4 languages: English, Korean, Japanese, Chinese
- Auto-detects device language on startup
- Translation files in `apps/mobile/locales/`

### 3D Graphics
- Uses **react-three/fiber** and **react-three/drei** with **expo-gl** and **three.js**
- AiCharacter component renders 3D character model

### Maps
- **react-native-maps** for displaying diary entries with location data
- Location stored as JSONB in PostgreSQL (latitude, longitude, etc.)

## Development Patterns

### Adding a New Screen
1. Create screen component in `apps/mobile/screens/`
2. Add route to Stack or Tab navigator in `App.tsx`
3. Update `RootStackParamList` in `utils/navigationRef.ts` with route params

### Adding a New API Endpoint
1. Backend: Add route handler in appropriate router (e.g., `apps/backend/diary/router.py`)
2. Backend: Add schema in corresponding `schemas.py`
3. Mobile: Add React Query hook in `apps/mobile/api/` (e.g., `diaryApi.ts`)
4. Use hook in screen component with `useQuery` or `useMutation`

### Database Changes
1. Write SQL migration in `apps/backend/supabase/migrations/` with timestamp prefix
2. Apply manually: `psql "$DATABASE_URL" -f <migration_file>.sql`
3. Update SQLModel in `apps/backend/models.py`
4. Update TypeScript types in mobile API files

### Authentication Flow
- JWT tokens stored in Zustand `authStore`
- Token added to API requests via Authorization header
- Navigation conditionally renders auth vs. main screens based on token presence
- Login/signup handled by `authApi.ts` hooks

## Configuration

### Environment Variables
- Backend: `DATABASE_URL` for PostgreSQL connection (default: `postgresql://sonkyoungho@localhost:5432/memoism`)
- Mobile: `API_URL` in `apps/mobile/api/config.ts` for backend endpoint
- Keep secrets in `.env` (not committed)

### API Base URL
- Configured in `apps/mobile/api/config.ts`
- Update for local development vs. production

## Code Style

### Python (Backend)
- 4-space indentation
- Type hints where practical
- PEP 8 naming: `snake_case` for modules/functions/variables, `PascalCase` for classes
- Use Black-compatible formatting

### TypeScript (Mobile)
- 2-space indentation
- Functional React components with hooks
- Files: `camelCase.ts|.tsx`, components: `PascalCase.tsx`
- Custom hooks: `useSomething.ts`

## Current Sprint Scope (Prototype v1)

Based on recent commits, the prototype focuses on:
- Core diary CRUD with rich text and images
- Location-based features (JSONB location field, map view)
- Date filtering for diary entries
- 3D AI character rendering
- Social features have been **removed** (no sharing, comments, reactions in v1)

## Known Technical Debt
- Backend database URL is hardcoded in `database.py` (should use environment variable)
- CORS is wide open (`allow_origins=["*"]`) for development (restrict in production)
- Frontend uses direct fetch calls instead of generated OpenAPI client (planned for packages/api/)
