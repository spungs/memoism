# Memoism – Product Specification

## 1. Overview

Memoism is a **mobile‐first diary application** that pairs every user with a virtual AI character. The character helps users search, recall, and reflect on past diary entries through natural conversation. Memoism targets a global audience and must deliver a consistent user experience on both **iOS and Android** using a single React Native code‑base.

---

## 2. Core User Stories

| ID     | Title           | As a …         | I want …                                                        | So that …                           |
| ------ | --------------- | -------------- | --------------------------------------------------------------- | ----------------------------------- |
| US‑01 | Write Diary     | user           | to write daily diary entries with rich‑text (markdown) & images | I can record my memories            |
| US‑02 | Fast Search     | paid user      | the AI character to answer questions about my past entries      | I retrieve memories instantly       |
| US‑03 | 30‑day Trial    | new user       | free access to the AI character for 30 days                     | I can evaluate the feature          |
| US‑04 | Character Sleep | non‑subscriber | the character to appear asleep                                  | monetisation is visually reinforced |
| US‑05 | Shop – Coins    | user           | to buy app‑coins (1 coin = ₩100) via IAP                        | I can purchase outfits              |
| US‑06 | Outfit Change   | user           | to dress my character or revert its age                         | personalisation & revenue           |
| US‑07 | Diary Share     | user           | to share a diary publicly with comments & reactions             | social engagement                   |

---

## 3. Functional Requirements

### 3.1 Diary

* CRUD with offline cache & optimistic updates.
* Markdown support, single image upload (≤ 10 MB each).

### 3.2 AI Character

* Chat interface powered by OpenAI (or local LLM).
* Age starts at **1 year** on sign‑up; increments every 365 days.
* Sleeps (greyed avatar + Zzz animation) when subscription inactive.

### 3.3 Subscription

* **30‑day free trial** post sign‑up (one‑time).
* After trial, **₩6,500 / month** via App Store / Play Store IAP.
* Subscription status fetched on app launch; cached for 6 hours.

### 3.4 Coin Store

* Packages: 100 c (₩9,900), 550 c (₩52,000), 1,200 c (₩99,000).
* Outfits & age‑revert items priced in coins; content list pulled from backend.

### 3.5 Diary Sharing

* Public link: `/u/{username}/d/{id}`.
* Comment & reaction (❤️ 👍 😢). Negative users managed via blacklist.

---

## 4. Non‑Functional Requirements

| Area          | Target                                           |
| ------------- | ------------------------------------------------ |
| Launch Time   | ≤ 2.5 s (median cold start)                      |
| Offline       | Read & write diaries offline; sync on reconnect  |
| Localisation  | Korean (default), English; expandable            |
| Accessibility | WCAG 2.1 AA; dynamic font sizes                  |
| Privacy       | GDPR / CCPA compliant; diaries encrypted at rest |

---

## 5. Tech Stack

### Mobile App (React Native)

* **Language**: TypeScript 5.x
* **Framework**: React Native 0.74 / Expo SDK 51 (managed workflow)
* **State**: **Zustand** + React Query (network cache)
* **Navigation**: React Navigation 7 (Stack + BottomTabs)
* **Styling**: Tailwind (+ Nativewind)
* **I18n**: i18next
* **Testing**: Jest, React Native Testing Library, Detox (E2E)

### Backend (MVP)

* **API**: FastAPI + SQLModel
* **Database**: PostgreSQL (Supabase cloud) + pgvector
* **Auth**: Supabase Auth (JWT) – OAuth & email
* **AI**: OpenAI Chat Completion (gpt‑3.5‑turbo) via server proxy

### DevOps

* **Repo**: mono‑repo (Expo + Python) – Nx workspace
* **CI**: GitHub Actions →
  – lint / test → build Android APK & iOS sim build → upload to TestFlight & Internal Testing
  – backend deploy to Railway
* **CD**: EAS Submit for stores; Railway auto deploy on `main`.

---

## 6. Suggested Folder Structure

```text
memoism/
├─ apps/
│  ├─ mobile/          # React Native (Expo)
│  └─ backend/         # FastAPI
├─ packages/
│  ├─ ui/              # Reusable RN UI kit (Tailwind)
│  ├─ api/             # OpenAPI‑generated TS SDK
│  └─ eslint‑config/
└─ docs/               # Architecture ADRs, diagrams
```

---

## 7. Open API Outline (v0)

| Method | Path                 | Description               |
| ------ | -------------------- | ------------------------- |
| POST   | /auth/signup         | email + password          |
| POST   | /auth/login          | —                         |
| GET    | /diaries             | list diaries (pagination) |
| POST   | /diaries             | create diary              |
| GET    | /diaries/{id}        | fetch detail              |
| PUT    | /diaries/{id}        | update                    |
| DELETE | /diaries/{id}        | delete                    |
| POST   | /character/chat      | chat with AI              |
| GET    | /store/items         | list outfits              |
| POST   | /store/purchase      | buy item                  |
| POST   | /subscription/verify | verify receipt            |

Full schema is kept in `docs/openapi.yaml` and auto‑generates TS & Dart clients.

---

## 8. Milestone / Cursor Tasks

| Sprint | Cursor Command‑K Task                              | Acceptance                       |
| ------ | -------------------------------------------------- | -------------------------------- |
| 0      | create expo RN skeleton with TS, Tailwind, Zustand | app starts on iOS sim            |
| 1      | implement Auth (Supabase) screens & flow           | signup, login, error handling    |
| 2      | diary CRUD UI + API integration                    | offline cache, optimistic update |
| 3      | AI character chat PoC                              | question→response cycle works    |
| 4      | subscription flow with mock IAP                    | subscribe / unsubscribe UI       |
| 5      | coin store & outfit manager                        | purchase flow + avatar update    |
| 6      | analytics & crash reporting                        | Sentry integrated                |

---

## 9. Glossary

| Term                | Definition                                                                        |
| ------------------- | --------------------------------------------------------------------------------- |
| **Character Sleep** | Disabled AI character state (dimmed avatar, Zzz badge) visible to non‑subscribers |
| **Coins**           | In‑app currency purchased via IAP (server‑authoritative balance)                  |
| **Age Revert**      | Paid item that sets character visual age back to any previous stage               |

---

*Last updated: 2025‑05‑18*

---

# Memoism – 제품 명세서 (한국어)

## 1. 개요

Memoism은 **모바일 우선 일기 애플리케이션**으로, 사용자마다 가상 AI 캐릭터를 1명씩 배치합니다. 캐릭터는 자연어 대화를 통해 과거 일기를 검색·회상·정리하도록 도와줍니다. Memoism은 전 세계 사용자를 목표로 하며, **React Native 단일 코드베이스**로 iOS·Android에서 동일한 경험을 제공해야 합니다.

---

## 2. 핵심 사용자 스토리

| ID    | 제목       | 역할     | 하고 싶은 일                | 이유        |
| ----- | -------- | ------ | ---------------------- | --------- |
| US‑01 | 일기 작성    | 사용자    | 마크다운·이미지를 포함한 일기를 작성   | 추억 기록     |
| US‑02 | 빠른 검색    | 유료 사용자 | AI 캐릭터가 과거 일기를 답변      | 즉시 회상     |
| US‑03 | 30일 체험   | 신규 사용자 | AI 캐릭터 30일 무료 이용       | 기능 평가     |
| US‑04 | 캐릭터 수면   | 미구독자   | 캐릭터가 자는 모습 표시          | 수익 모델 시각화 |
| US‑05 | 상점 – 코인  | 사용자    | IAP로 코인 구매(1코인 = ₩100) | 의상 구매     |
| US‑06 | 의상/나이 변경 | 사용자    | 캐릭터 의상 교체·나이 되돌리기      | 개인화·매출    |
| US‑07 | 일기 공유    | 사용자    | 댓글·리액션 가능한 공개 링크 공유    | 소셜 참여     |

---

## 3. 기능 요구 사항

### 3.1 일기

* 오프라인 캐시·낙관적 업데이트를 포함한 CRUD
* 마크다운 지원, 이미지 1장(≤ 10 MB) 업로드

### 3.2 AI 캐릭터

* OpenAI(또는 로컬 LLM) 기반 채팅 인터페이스
* 가입 시 **1살**에서 시작, 365일마다 1살 증가
* 구독 비활성 시 회색 아바타 + Zzz 애니메이션으로 수면 상태

### 3.3 구독

* 가입 후 **30일 무료 체험**(1회)
* 이후 **월 ₩6,500**(앱·플레이 스토어 IAP)
* 앱 실행 시 구독 상태 조회, 6시간 캐시

### 3.4 코인 상점

* 패키지: 100c(₩9,900), 550c(₩52,000), 1,200c(₩99,000)
* 의상·나이 되돌리기 항목은 코인 결제, 목록은 백엔드에서 수신

### 3.5 일기 공유

* 공개 링크: `/u/{username}/d/{id}`
* 댓글·리액션(❤️ 👍 😢), 악성 사용자는 블랙리스트 관리

---

## 4. 비기능 요구 사항

| 항목       | 목표                       |
| -------- | ------------------------ |
| 최초 실행 시간 | ≤ 2.5초(콜드 스타트 중앙값)       |
| 오프라인     | 오프라인 작성·조회, 재연결 시 동기화    |
| 다국어      | 기본 한국어, 영어 지원, 확장 가능     |
| 접근성      | WCAG 2.1 AA, 동적 글꼴 크기    |
| 개인정보     | GDPR/CCPA 준수, 저장 데이터 암호화 |

---

## 5. 기술 스택

### 모바일 앱 (React Native)

* **언어**: TypeScript 5.x
* **프레임워크**: React Native 0.74 / Expo SDK 51
* **상태**: **Zustand** + React Query
* **네비게이션**: React Navigation 7(스택·탭)
* **스타일링**: Tailwind(+Nativewind)
* **I18n**: i18next
* **테스트**: Jest, React Native Testing Library, Detox

### 백엔드(MVP)

* **API**: FastAPI + SQLModel
* **DB**: PostgreSQL(Supabase) + pgvector
* **인증**: Supabase Auth(JWT) – OAuth·이메일
* **AI**: OpenAI Chat Completion(gpt‑3.5‑turbo) 프록시

### DevOps

* **리포지터리**: 모노레포(Expo + Python) – Nx
* **CI**: GitHub Actions
  – 린트·테스트 → Android APK & iOS 시뮬 빌드 → TestFlight·Internal Testing 업로드
  – 백엔드 Railway 배포
* **CD**: EAS Submit(스토어 배포), `main` 브랜치→Railway 자동 배포

---

## 6. 폴더 구조 제안

```text
memoism/
├─ apps/
│  ├─ mobile/          # React Native (Expo)
│  └─ backend/         # FastAPI
├─ packages/
│  ├─ ui/              # 재사용 RN UI 키트
│  ├─ api/             # OpenAPI 기반 TS SDK
│  └─ eslint‑config/
└─ docs/               # 아키텍처 문서, 다이어그램
```

---

## 7. Open API 개요(v0)

| 메서드    | 경로                   | 설명            |
| ------ | -------------------- | ------------- |
| POST   | /auth/signup         | 이메일+비밀번호 가입   |
| POST   | /auth/login          | 로그인           |
| GET    | /diaries             | 일기 목록(페이지네이션) |
| POST   | /diaries             | 일기 작성         |
| GET    | /diaries/{id}        | 일기 상세         |
| PUT    | /diaries/{id}        | 일기 수정         |
| DELETE | /diaries/{id}        | 일기 삭제         |
| POST   | /character/chat      | AI 캐릭터 채팅     |
| GET    | /store/items         | 의상 목록         |
| POST   | /store/purchase      | 아이템 구매        |
| POST   | /subscription/verify | 영수증 검증        |

전체 스키마는 `docs/openapi.yaml`에 있으며 TS & Dart 클라이언트를 자동 생성합니다.

---

## 8. 마일스톤/커서 작업

| 스프린트 | Cursor Command‑K 작업                            | 완료 기준            |
| ---- | ---------------------------------------------- | ---------------- |
| 0    | Expo RN 스켈레톤 생성(TypeScript, Tailwind, Zustand) | iOS 시뮬 기동        |
| 1    | Supabase 인증 화면·플로우 구현                          | 가입·로그인·오류 처리     |
| 2    | 일기 CRUD UI + API 연동                            | 오프라인 캐시·낙관적 업데이트 |
| 3    | AI 캐릭터 채팅 PoC                                  | 질문→응답 흐름 동작      |
| 4    | 모의 IAP 구독 플로우                                  | 구독·해지 UI         |
| 5    | 코인 상점 & 의상 관리                                  | 구매 흐름 + 아바타 갱신   |
| 6    | 분석·크래시 리포팅                                     | Sentry 통합        |

---

## 9. 용어 사전

| 용어          | 정의                                 |
| ----------- | ---------------------------------- |
| **캐릭터 수면**  | 미구독자에게 표시되는 비활성 상태(회색 아바타, Zzz 뱃지) |
| **코인**      | IAP로 구매하는 앱 내 화폐 (서버 권위 기반 잔액)     |
| **나이 되돌리기** | 캐릭터 외형 나이를 과거 단계로 복원하는 유료 아이템      |

---

*최종 업데이트: 2025‑05‑18*

---

## 10. 개발 현황 (Development Status)

### 🎯 TDD 재작성 프로젝트 (2025년)

Kent Beck의 **Test-Driven Development (TDD)** 원칙에 따라 백엔드와 모바일 앱을 처음부터 재작성했습니다.

#### ✅ 완료된 작업 (Phase 0-5)

**Phase 0: 프로젝트 준비**
- Legacy 코드 백업 (`apps/backend-legacy`, `apps/mobile-legacy`)
- 테스트 환경 구축 (pytest, Jest, React Testing Library)
- TDD 계획 수립 ([plan.md](plan.md) - 100개 테스트 체크리스트)

**Phase 1: Backend - Authentication (11/11 테스트 ✅)**
- 사용자 회원가입 (이메일 검증, 비밀번호 bcrypt 암호화)
- 로그인 및 JWT 토큰 발급
- 토큰 검증 및 만료 처리
- 보안 개선: 평문 비밀번호 저장 → bcrypt 해싱

**Phase 2: Backend - Diary CRUD (16/16 테스트 ✅)**
- 일기 생성 (제목, 내용, 이미지 배열, 위치 정보 JSONB)
- 일기 목록 조회 (페이지네이션, 날짜 필터링)
- 일기 상세 조회, 수정, 삭제
- 권한 검증 (다른 사용자 일기 접근 차단)

**Phase 3: Mobile - Authentication (14/14 테스트 ✅)**
- Zustand authStore (로그인 상태 관리)
- React Query 훅 (useSignup, useLogin)
- 로그인/회원가입 화면 (폼 검증)

**Phase 4: Mobile - Diary Features (17/17 테스트 ✅)**
- Diary CRUD React Query 훅
- 일기 목록 화면 (빈 상태, 네비게이션)
- 일기 상세 화면 (이미지, 위치 표시)
- 일기 편집 화면 (이미지 선택)
- 지도 화면 (마커 표시)

**Phase 5: Integration & Polish (9/9 테스트 ✅)**
- 전체 사용자 여정 통합 테스트
- 네트워크 실패 처리, 토큰 만료 플로우
- 보안 테스트 (SQL Injection, XSS, CORS)
- 대량 데이터 페이지네이션 (50개 일기)
- 다중 이미지 처리 (20개 이미지, 특수 문자 URL)
- **리팩토링**: datetime.utcnow() deprecation 수정 (Python 3.14 호환)

**Phase 6: Production Ready (진행 중)**
- ✅ 전체 테스트 스위트: **36/36 통과**
- ✅ 테스트 커버리지: **89.61%** (목표 80% 초과)
- ✅ FastAPI Swagger 문서 자동 생성
- 🚧 README 업데이트 (현재 작업)

#### 📊 프로젝트 통계

| 항목 | 수치 |
|------|------|
| **백엔드 테스트** | 36개 (모두 통과 ✅) |
| **모바일 테스트** | 43개 (모두 통과 ✅) |
| **총 테스트** | 79개 |
| **백엔드 커버리지** | 89.61% |
| **커밋 수** | 60+ (TDD 브랜치) |
| **개발 기간** | 3주 (Phase 0-5) |

#### 🛠 기술 스택 (실제 구현)

**Backend**
- FastAPI 0.104.1
- SQLModel 0.0.14 (SQLAlchemy + Pydantic)
- PostgreSQL + psycopg3 (psycopg[binary]>=3.2.12)
- bcrypt 5.0.0 (비밀번호 암호화)
- python-jose (JWT 토큰)
- pytest + pytest-asyncio + httpx (테스트)

**Mobile**
- React Native + Expo SDK 51
- TypeScript 5.x
- Zustand (상태 관리)
- React Query (서버 상태 관리)
- Jest + React Testing Library (테스트)

**DevOps**
- GitHub (모노레포)
- pytest (백엔드 테스트)
- Jest (모바일 테스트)
- FastAPI 자동 Swagger 문서 (`/docs`)

#### 🎓 TDD 원칙 준수

1. **Red → Green → Refactor** 사이클 엄격 준수
2. **Tidy First**: 구조적 변경과 행동적 변경 분리
3. **작은 단위 커밋**: 각 테스트마다 개별 커밋
4. **테스트 우선**: 구현 전 테스트 작성
5. **지속적 리팩토링**: 테스트 통과 후 코드 개선

#### 📁 프로젝트 구조

```
Memoism/
├── apps/
│   ├── backend/              # FastAPI (TDD 재작성)
│   │   ├── src/
│   │   │   ├── auth/         # 인증 (11 tests)
│   │   │   ├── diary/        # 일기 CRUD (16 tests)
│   │   │   ├── models.py     # SQLModel 모델
│   │   │   └── main.py       # FastAPI 앱
│   │   └── tests/
│   │       ├── auth/
│   │       ├── diary/
│   │       └── integration/  # 통합 테스트 (9 tests)
│   ├── mobile/               # React Native (TDD 재작성)
│   │   ├── src/
│   │   │   ├── store/        # Zustand stores
│   │   │   ├── api/          # React Query hooks
│   │   │   └── screens/      # 화면 컴포넌트
│   │   └── __tests__/        # 43 tests
│   ├── backend-legacy/       # 백업 (3000+ LOC, 0% coverage)
│   └── mobile-legacy/        # 백업
├── plan.md                   # TDD 진행 계획 (100+ 테스트 체크리스트)
└── CLAUDE.md                 # AI 개발 가이드

```

#### 🚀 다음 단계 (Phase 6 완료 후)

- [ ] 프로덕션 환경 변수 설정
- [ ] CI/CD 파이프라인 구축 (GitHub Actions)
- [ ] 소셜 로그인 (카카오, 구글, 애플, 네이버)
- [ ] AI 캐릭터 채팅 기능
- [ ] 구독 및 IAP 구현
- [ ] 코인 상점 & 의상 시스템

#### 📖 참고 문서

- [plan.md](plan.md) - TDD 진행 계획 및 현황
- [CLAUDE.md](CLAUDE.md) - AI 개발 가이드 및 TDD 방법론
- [Backend API Docs](http://localhost:8000/docs) - FastAPI Swagger UI

---

