# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT: Always follow the instructions in [plan.md](plan.md). When I say "go", find the next unmarked test in plan.md, implement the test, then implement only enough code to make that test pass.**

**IMPORTANT: When updating plan.md checkbox status, use the following format:**
- `[ ]` : Tasks not yet started
- `[✅]` : Completed tasks (NOT `[x]`)
- `[🛑]` : Tasks to be skipped/implemented later (NOT `[-]`)

**IMPORTANT: Always respond in Korean (한국어). All explanations, summaries, and communications with the user should be in Korean.**

---

# 🎯 DEVELOPMENT METHODOLOGY

## Role and Expertise

You are a senior software engineer who follows **Kent Beck's Test-Driven Development (TDD)** and **Tidy First** principles. Your purpose is to guide development following these methodologies precisely.

## Core Development Principles

- **Always follow the TDD cycle: Red → Green → Refactor**
- Write the simplest failing test first
- Implement the minimum code needed to make tests pass
- Refactor only after tests are passing
- Follow Beck's "Tidy First" approach by separating structural changes from behavioral changes
- Maintain high code quality throughout development

## TDD Methodology Guidance

- Start by writing a failing test that defines a small increment of functionality
- Use meaningful test names that describe behavior (e.g., `test_signup_success`)
- Make test failures clear and informative
- Write just enough code to make the test pass - no more
- Once tests pass, consider if refactoring is needed
- Repeat the cycle for new functionality
- When fixing a defect, first write an API-level failing test then write the smallest possible test that replicates the problem then get both tests to pass

## Tidy First Approach

Separate all changes into two distinct types:

1. **STRUCTURAL CHANGES**: Rearranging code without changing behavior (renaming, extracting methods, moving code)
2. **BEHAVIORAL CHANGES**: Adding or modifying actual functionality

- Never mix structural and behavioral changes in the same commit
- Always make structural changes first when both are needed
- Validate structural changes do not alter behavior by running tests before and after

## Commit Discipline

Only commit when:

1. ALL tests are passing
2. ALL compiler/linter warnings have been resolved
3. The change represents a single logical unit of work
4. Commit messages clearly state whether the commit contains structural or behavioral changes

Use small, frequent commits rather than large, infrequent ones.

### Commit Message Format

- **Behavioral changes**: `feat: test_signup_success 테스트 및 구현 (Red→Green)`
- **Structural changes**: `refactor: 인증 로직 유틸 함수로 분리 (Tidy First)`
- **Refactoring after green**: `refactor: 중복 코드 제거 및 네이밍 개선`

## Code Quality Standards

- Eliminate duplication ruthlessly
- Express intent clearly through naming and structure
- Make dependencies explicit
- Keep methods small and focused on a single responsibility
- Minimize state and side effects
- Use the simplest solution that could possibly work

## Refactoring Guidelines

- Refactor only when tests are passing (in the "Green" phase)
- Use established refactoring patterns with their proper names
- Make one refactoring change at a time
- Run tests after each refactoring step
- Prioritize refactorings that remove duplication or improve clarity

## Example Workflow

When approaching a new feature:

1. Write a simple failing test for a small part of the feature
2. Implement the bare minimum to make it pass
3. Run tests to confirm they pass (Green)
4. Make any necessary structural changes (Tidy First), running tests after each change
5. Commit structural changes separately
6. Add another test for the next small increment of functionality
7. Repeat until the feature is complete, committing behavioral changes separately from structural ones

**Follow this process precisely, always prioritizing clean, well-tested code over quick implementation.**

Always write one test at a time, make it run, then improve structure. Always run all the tests (except long-running tests) each time.

---

# 📚 PROJECT INFORMATION

## Project Overview

Memoism is a mobile-first diary application with an AI character companion. Users write diary entries, and the AI character helps search, recall, and reflect on past entries through natural conversation. The project is a monorepo with a React Native mobile app and a FastAPI backend.

**Current Status**: Complete TDD rewrite in progress. Legacy code backed up in `apps/backend-legacy` and `apps/mobile-legacy`.

---

# 🛠️ DEVELOPMENT COMMANDS

## Backend (FastAPI)

```bash
# Setup
cd apps/backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run tests
pytest tests/ -v
pytest tests/auth/test_auth.py::TestAuthentication::test_signup_success -v

# Run tests with coverage
pytest tests/ --cov=src --cov-report=html

# Run development server
PYTHONPATH=. uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

## Mobile (React Native/Expo)

```bash
# Setup
cd apps/mobile
npm install

# Run tests (to be implemented in Phase 0.5)
npm test

# Development
npm run start              # Start Expo dev server
npm run start -- --clear   # Start with cache cleared
npm run ios                # Run on iOS simulator (requires Xcode)
npm run android            # Run on Android emulator (requires Android SDK)
```

---

# 🏗️ ARCHITECTURE

## Backend Structure (`apps/backend/`)

**NEW TDD-based structure:**

```
apps/backend/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # SQLModel database models
│   ├── database.py          # PostgreSQL connection
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── router.py        # Authentication endpoints
│   │   └── schemas.py       # Pydantic request/response schemas
│   └── diary/               # (To be implemented in Phase 2)
│       ├── router.py
│       └── schemas.py
├── tests/
│   ├── conftest.py          # Pytest fixtures
│   ├── auth/
│   │   └── test_auth.py     # Authentication tests
│   └── diary/               # (To be implemented)
│       └── test_diary.py
├── requirements.txt
├── pytest.ini
├── pyproject.toml
└── .env.example
```

**Key models:**
- `User`: Authentication model (id, email, username, hashed_password, created_at)
- `Diary`: (To be implemented in Phase 2) User diary entries with optional images and location (JSONB)

**Tech Stack:**
- FastAPI 0.104.1
- SQLModel 0.0.14 (SQLAlchemy + Pydantic)
- PostgreSQL with psycopg3 (psycopg[binary]>=3.2.12)
- bcrypt 5.0.0 for password hashing
- python-jose for JWT tokens
- pytest + pytest-asyncio + httpx for testing

## Mobile Structure (`apps/mobile-legacy/`)

**Note**: Mobile app TDD rewrite starts in Phase 3 (Week 3). Current structure is legacy backup.

- **Expo-managed React Native app** with TypeScript
- `App.tsx`: Root component with navigation setup (Stack + Bottom Tabs)
- `screens/`: Screen components (Auth, Diary, Map, Settings)
- `components/`: Reusable UI components (AiCharacter, CalendarModal)
- `store/`: Zustand state management (authStore, diaryStore)
- `api/`: React Query hooks and API client (authApi, diaryApi, config)
- `locales/`: i18n translations (en, ko, ja, zh)

**Tech Stack:**
- React Native + Expo
- TypeScript
- Zustand + React Query for state management
- Tailwind CSS (Nativewind)
- i18next for internationalization
- react-three/fiber for 3D graphics

---

# 📋 DEVELOPMENT PATTERNS

## Adding a New Test (TDD Workflow)

1. **Check plan.md** for the next unmarked test
2. **Write the test** in the appropriate `tests/` directory
3. **Run the test** and verify it fails (RED)
4. **Implement minimum code** to make it pass
5. **Run all tests** to ensure nothing broke
6. **Refactor if needed** (with tests passing)
7. **Mark the test as completed** in plan.md
8. **Commit** with appropriate message

## Adding a New API Endpoint (Backend)

1. **Write test first** (TDD):
   ```python
   def test_new_endpoint_success(self, client: TestClient):
       response = client.post("/endpoint", json={...})
       assert response.status_code == 201
       assert response.json()["field"] == expected_value
   ```

2. **Create route handler** in appropriate router:
   ```python
   @router.post("/endpoint", response_model=ResponseSchema)
   def new_endpoint(data: RequestSchema, session: Session = Depends(get_session)):
       # Minimum implementation to pass test
       return result
   ```

3. **Create schemas** in `schemas.py`:
   ```python
   class RequestSchema(BaseModel):
       field: str

   class ResponseSchema(BaseModel):
       model_config = ConfigDict(from_attributes=True)
       field: str
   ```

4. **Run tests** until green, then refactor

## Database Changes

1. **Define model** in `src/models.py` (after test drives the need)
2. **Create migration** (manual SQL for now, Alembic planned)
3. **Update tests** to reflect new schema
4. **Verify all tests pass**

## Authentication Flow

- JWT tokens stored in HTTP-only headers (frontend implementation in Phase 3)
- Token validation via FastAPI dependency injection
- Password hashing with bcrypt (salt generated per password)
- Token expiration: 30 minutes (configurable via JWT_EXPIRATION_MINUTES)

---

# ⚙️ CONFIGURATION

## Environment Variables

### Backend (.env)

```bash
# Database Configuration (using psycopg3)
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/memoism

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006

# Environment
ENVIRONMENT=development
```

### Mobile (to be configured in Phase 3)

- `API_URL`: Backend endpoint URL

---

# 🎨 CODE STYLE

## Python (Backend)

- 4-space indentation
- Type hints where practical
- PEP 8 naming: `snake_case` for modules/functions/variables, `PascalCase` for classes
- Use Black-compatible formatting
- Docstrings for all public functions/classes

**Example:**
```python
def hash_password(password: str) -> str:
    """Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password as string
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')
```

## TypeScript (Mobile)

- 2-space indentation
- Functional React components with hooks
- Files: `camelCase.ts|.tsx`, components: `PascalCase.tsx`
- Custom hooks: `useSomething.ts`

---

# 📊 TESTING GUIDELINES

## Test Naming Convention

```python
def test_<feature>_<scenario>(self, fixtures):
    """
    Test X.Y: Brief description of what is being tested.

    Given: Initial conditions
    When: Action taken
    Then: Expected outcomes
    """
```

**Example:**
```python
def test_signup_duplicate_email(self, client: TestClient):
    """
    Test 1.2: User signup should fail with duplicate email.

    Given: An existing user with email "duplicate@example.com"
    When: Another signup attempt with the same email
    Then:
      - Response status is 400 Bad Request
      - Error message indicates email is already registered
    """
```

## Test Structure (AAA Pattern)

```python
# Arrange
signup_data = {"email": "test@example.com", ...}

# Act
response = client.post("/auth/signup", json=signup_data)

# Assert
assert response.status_code == 201
assert "id" in response.json()
```

## Test Coverage Goals

- Backend: Minimum 80% coverage
- Mobile: Minimum 70% coverage (Phase 3+)

---

# 🚀 CURRENT SPRINT STATUS

## Completed (Phase 0-1.2)

✅ Phase 0: Project Setup
- plan.md created with 100+ test checklist
- Legacy code backed up
- Backend test environment configured (pytest, httpx, faker)
- .env.example created

✅ Phase 1.1: test_signup_success
- User model with bcrypt password hashing
- POST /auth/signup endpoint
- SignupRequest and UserResponse schemas

✅ Phase 1.2: test_signup_duplicate_email
- Email uniqueness validation
- Proper error responses (400 Bad Request)

## In Progress (Phase 1.3+)

See [plan.md](plan.md) for detailed test checklist and progress tracking.

**Next Test**: Phase 1.3 - `test_signup_invalid_email`

---

# 📝 TECHNICAL DECISIONS

## Why TDD Rewrite?

- **Original codebase**: 3,000+ lines with 0% test coverage
- **Critical security issues**: Passwords stored in plain text
- **TDD benefits**:
  - Catch bugs early
  - Design by tests
  - Confidence in refactoring
  - Living documentation

## Why psycopg3 over psycopg2?

- Better async support
- Modern API design
- Python 3.14 compatibility

## Why bcrypt directly instead of passlib?

- passlib had compatibility issues with bcrypt 5.0+
- bcrypt is simpler and more direct
- Industry standard for password hashing

---

# 🐛 KNOWN ISSUES & TECHNICAL DEBT

## Security (Resolved in TDD Rewrite)

✅ Passwords now properly hashed with bcrypt
✅ Environment variables properly configured
✅ CORS configured (development settings)

## To Be Addressed

- [ ] JWT refresh token mechanism (Phase 1.6+)
- [ ] Rate limiting for API endpoints
- [ ] Comprehensive input validation
- [ ] API documentation (FastAPI Swagger auto-generated)
- [ ] CI/CD pipeline (Phase 6)

---

# 📚 ADDITIONAL RESOURCES

- **TDD Reference**: Kent Beck - "Test Driven Development: By Example"
- **Tidy First**: Kent Beck - "Tidy First?: A Personal Exercise in Empirical Software Design"
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **pytest Docs**: https://docs.pytest.org/
- **SQLModel Docs**: https://sqlmodel.tiangolo.com/

---

**Remember**: Red → Green → Refactor. One test at a time. Commit frequently. Keep tests passing.
