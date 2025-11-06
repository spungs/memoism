# CLAUDE.md - Memoism 프로젝트 가이드

> AI 캐릭터와 함께 성장하는 일기 앱 - React Native + FastAPI 모노레포

## 📋 프로젝트 개요

**Memoism**은 사용자의 일기 작성 활동에 반응하는 AI 캐릭터와 함께 성장하는 모바일 다이어리 애플리케이션입니다.

- **Frontend**: React Native (Expo) + TypeScript
- **Backend**: FastAPI + SQLModel + PostgreSQL
- **Architecture**: Monorepo 구조
- **Current Branch**: `claude/setup-claude-config-011CUqcBorYpU8jMkGTrzWQp`

## 🏗️ 프로젝트 구조

```
memoism/
├── apps/
│   ├── backend/              # FastAPI 백엔드
│   │   ├── main.py           # FastAPI 앱 엔트리포인트
│   │   ├── database.py       # DB 연결 설정
│   │   ├── models.py         # SQLModel 데이터베이스 스키마
│   │   ├── auth/             # 인증 라우터 & JWT 유틸
│   │   ├── diary/            # 일기 CRUD & 댓글/반응
│   │   ├── follow/           # 팔로우 시스템 & 알림
│   │   └── supabase/migrations/  # DB 마이그레이션
│   │
│   └── mobile/               # React Native Expo 프론트엔드
│       ├── App.tsx           # 메인 앱 컴포넌트 & 네비게이션
│       ├── app.json          # Expo 설정
│       ├── i18n.ts           # 다국어 설정 (EN/KO/JA/ZH)
│       ├── screens/          # 8개 화면 컴포넌트
│       ├── store/            # Zustand 상태 관리
│       ├── api/              # API 클라이언트 & React Query 훅
│       ├── locales/          # 번역 파일 (4개 언어)
│       └── android/ios/      # 네이티브 코드
│
├── README.md                 # 제품 스펙 (한영 이중언어)
├── run.md                    # 실행 가이드
└── remind.md                 # 개발 메모
```

## 🛠️ 기술 스택

### Frontend (apps/mobile/)
| 기술 | 버전 | 용도 |
|------|------|------|
| React Native | 0.73.6 | 모바일 프레임워크 |
| Expo | ~50.0.0 | RN 개발 환경 |
| TypeScript | ^5.3.0 | 타입 안정성 |
| Zustand | ^4.5.0 | 상태 관리 (auth, diary cache) |
| React Query | ^5.76.1 | 데이터 페칭 & 캐싱 |
| React Navigation | 6.x | 화면 네비게이션 (Stack + BottomTabs) |
| NativeWind | ^4.0.1 | Tailwind CSS for React Native |
| i18next | ^23.16.8 | 다국어 지원 (4개 언어) |

### Backend (apps/backend/)
| 기술 | 용도 |
|------|------|
| FastAPI | 비동기 웹 프레임워크 |
| SQLModel | SQLAlchemy + Pydantic ORM |
| PostgreSQL | 데이터베이스 (Supabase) |
| Python-Jose | JWT 토큰 생성/검증 |
| Passlib | 비밀번호 해싱 (bcrypt) |
| uvicorn | ASGI 서버 |

## 🔑 핵심 개념 및 패턴

### 1. 인증 시스템
- **JWT 기반**: 30분 만료, HS256 알고리즘
- **저장소**: AsyncStorage (모바일), `authStore` (Zustand)
- **보안**: ⚠️ **현재 비밀번호 평문 저장** (`apps/backend/auth/utils.py:16-22` - 개발용)

```python
# backend/auth/utils.py
# TODO: bcrypt로 전환 필요
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return plain_password == hashed_password  # 임시 구현
```

### 2. 상태 관리 아키텍처
- **Zustand**: 가벼운 전역 상태 (`authStore`, `diaryStore`)
- **React Query**: 서버 상태 캐싱 & 자동 invalidation
- **AsyncStorage**: 로컬 영구 저장 (로그인 정보 저장 옵션)

### 3. API 통신
```typescript
// apps/mobile/api/config.ts
export const API_URL = Platform.select({
  ios: 'http://localhost:8000',      // iOS 시뮬레이터
  android: 'http://10.0.2.2:8000',   // Android 에뮬레이터 특수 IP
})
```

### 4. 데이터베이스 모델 (SQLModel)
주요 테이블:
- `Profile`: 사용자 (UUID, email, username, character_age, coins)
- `Diary`: 일기 (content, images[], is_public)
- `DiaryComment`: 댓글
- `DiaryReaction`: 반응 (❤️, 👍, 😢)
- `Follow`: 팔로우 관계
- `Notification`: 알림 (follow, diary_shared, comment, reaction)
- `StoreItem` / `UserItem`: 코인샵 (미구현)

## 📁 중요 파일 위치

### 화면 컴포넌트 (apps/mobile/screens/)
| 파일 | 경로 | 설명 |
|------|------|------|
| 로그인 | `AuthLoginScreen.tsx` | JWT 로그인, 이메일 저장 옵션 |
| 회원가입 | `AuthSignupScreen.tsx` | 이메일/비밀번호/유저명 검증 |
| 일기 목록 | `DiaryListScreen.tsx` | 홈 화면, 사용자 일기 리스트 |
| 일기 상세 | `DiaryDetailScreen.tsx` | 일기 + 댓글 보기 |
| 일기 작성/수정 | `DiaryEditScreen.tsx` | 다중 이미지 업로드 (최대 10장) |
| 피드 | `ShareFeedScreen.tsx` | 인스타그램 스타일 공개 피드 |
| 공유 선택 | `ShareSelectScreen.tsx` | 일기 공개/비공개 모달 |
| 설정 | `SettingsScreen.tsx` | 프로필 편집, 로그아웃 |

### API 엔드포인트 (apps/backend/)
| 모듈 | 경로 | 주요 엔드포인트 |
|------|------|-----------------|
| 인증 | `auth/router.py` | `/auth/signup`, `/auth/token`, `/auth/me` |
| 일기 | `diary/router.py` | `/diaries` (CRUD, like, comment, reaction) |
| 팔로우 | `follow/router.py` | `/follow/{user_id}`, `/follow/notifications` |

### 데이터베이스
| 파일 | 설명 |
|------|------|
| `backend/database.py` | SQLAlchemy 엔진 & 세션 관리 |
| `backend/models.py` | 모든 SQLModel 정의 |
| `backend/supabase/migrations/20240518_initial_schema.sql` | 초기 스키마 |

## 🔧 개발 워크플로우

### 1. 로컬 개발 시작
```bash
# 백엔드 환경변수 설정 (최초 1회)
cd apps/backend
cp .env.example .env
# .env 파일을 열어서 DATABASE_URL과 SECRET_KEY 수정

# 백엔드 의존성 설치 및 실행
pip install -e .
uvicorn main:app --reload

# 프론트엔드 실행 (별도 터미널)
cd apps/mobile
npm install
npx expo start
```

**환경변수 설정** (`apps/backend/.env`):
```bash
DATABASE_URL=postgresql://username@localhost:5432/memoism
SECRET_KEY=your-random-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=*  # 개발용. 프로덕션: https://yourdomain.com
```

### 2. Git 작업
**⚠️ 중요**: 항상 `claude/setup-claude-config-011CUqcBorYpU8jMkGTrzWQp` 브랜치에서 작업

```bash
# 브랜치 확인
git status

# 커밋 & 푸시
git add .
git commit -m "feat: 기능 설명"
git push -u origin claude/setup-claude-config-011CUqcBorYpU8jMkGTrzWQp
```

**네트워크 재시도**: fetch/push 실패 시 최대 4회 재시도 (2s, 4s, 8s, 16s 지수 백오프)

### 3. 일반적인 작업 패턴

#### Frontend 화면 추가
1. `apps/mobile/screens/` 에 새 파일 생성
2. `apps/mobile/App.tsx` 에 네비게이션 라우트 추가
3. `apps/mobile/locales/` 에 번역 키 추가 (4개 언어)

#### Backend API 엔드포인트 추가
1. `apps/backend/{module}/router.py` 에 라우트 추가
2. `apps/backend/{module}/schemas.py` 에 Pydantic 모델 정의
3. 필요시 `apps/backend/models.py` 에 SQLModel 추가
4. `apps/backend/main.py` 에 라우터 등록

#### API 연동
1. `apps/mobile/api/{module}Api.ts` 에 fetch 함수 작성
2. React Query hook 생성 (`useQuery` / `useMutation`)
3. 화면 컴포넌트에서 hook 사용
4. 성공 시 `queryClient.invalidateQueries()` 로 캐시 갱신

## ⚠️ 알려진 이슈 & 주의사항

### 보안
- [x] **비밀번호 평문 저장**: ~~`apps/backend/auth/utils.py`~~ **✅ 완료** - bcrypt 해싱으로 전환 (참고: `PASSWORD_HASHING_MIGRATION.md`)
- [x] **DB URL 하드코딩**: ~~`apps/backend/database.py:6`~~ **✅ 완료** - 환경변수로 변경됨 (`.env` 파일 사용)
- [x] **JWT Secret 하드코딩**: ~~`apps/backend/auth/utils.py`~~ **✅ 완료** - 환경변수로 변경됨
- [x] **CORS 와일드카드**: ~~`apps/backend/main.py:13`~~ **✅ 완료** - 환경변수로 변경됨 (프로덕션에서 특정 도메인 설정 가능)

### 플랫폼별 설정
```json
// apps/mobile/app.json
{
  "android": {
    "usesCleartextTraffic": true,  // HTTP 허용 (개발용)
    // "permissions": ["DETECT_SCREEN_CAPTURE"]  // 제거됨 (SecurityException 발생)
  }
}
```

### iOS 시뮬레이터 타임아웃
- API URL을 `localhost:8000` 사용 (해결됨)
- `network_security_config.xml` 로 cleartext HTTP 허용 (Android)

## 🎯 구현 완료된 기능

- ✅ 회원가입/로그인 (JWT)
- ✅ 일기 CRUD (다중 이미지 업로드)
- ✅ 공개/비공개 토글
- ✅ 팔로우/언팔로우 시스템
- ✅ 댓글 시스템 (생성, 수정, 삭제)
- ✅ 반응 시스템 (❤️, 👍, 😢)
- ✅ 알림 시스템 (팔로우, 일기 공유)
- ✅ 인스타그램 스타일 피드 UI
- ✅ 다국어 지원 (EN/KO/JA/ZH)
- ✅ Pull-to-refresh
- ✅ React Query 낙관적 업데이트

## 🚧 미구현/계획된 기능

### 1. AI 캐릭터 시스템 (우선순위: 높음)
- **현재 상태**: `Profile.character_age` 필드만 존재 (초기값 1세)
- **필요 작업**:
  - `POST /character/chat` 엔드포인트 구현
  - AI 모델 연동 (OpenAI/Anthropic API)
  - 채팅 화면 UI 구현
  - 캐릭터 성장 로직 (1년마다 나이 증가)

### 2. 구독 & 결제 시스템
- **현재 상태**: DB 스키마만 존재 (`subscription_end_date`, `coins`)
- **필요 작업**:
  - 30일 무료 체험 구독 로직
  - IAP 연동 (Expo In-App Purchases)
  - 구독 상태 검증 미들웨어

### 3. 코인샵 & 아이템 시스템
- **현재 상태**: `StoreItem`, `UserItem` 모델만 존재
- **필요 작업**:
  - `/store/items` GET 엔드포인트
  - `/store/purchase` POST 엔드포인트
  - 코인샵 화면 UI
  - 아이템 장착 시스템

### 4. 일기 공유 링크
- **계획된 URL**: `/u/{username}/d/{diary_id}`
- **필요 작업**: 딥링크 라우팅, 공개 일기 웹뷰

## 🧪 테스트 & 디버깅

### Backend 테스트
```bash
cd apps/backend
pytest  # (테스트 파일 아직 없음)
```

### Frontend 디버깅
```bash
# React Native 디버거
npx expo start
# -> 브라우저에서 j 누르기 (개발자 도구)

# React Query Devtools
# apps/mobile/App.tsx 에 추가:
# import { QueryClientProvider } from '@tanstack/react-query'
# import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
```

### API 테스트
```bash
# FastAPI 자동 문서
open http://localhost:8000/docs  # Swagger UI
open http://localhost:8000/redoc # ReDoc
```

## 📝 코딩 컨벤션

### TypeScript (Frontend)
- **네이밍**: PascalCase (컴포넌트), camelCase (함수/변수)
- **타입**: interface보다 type 우선 (일관성)
- **스타일링**: Tailwind 클래스 사용 (`className="bg-indigo-600 text-white"`)

### Python (Backend)
- **네이밍**: snake_case (함수/변수), PascalCase (클래스)
- **타입 힌트**: 모든 함수에 필수
- **Pydantic**: request/response 모델은 `schemas.py` 에 분리

### 커밋 메시지
```
feat: 새 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링
docs: 문서 수정
style: 포맷팅, 세미콜론 등
test: 테스트 추가
chore: 빌드, 패키지 등
```

## 🔍 자주 사용하는 명령어

### 빠른 검색
```bash
# 특정 함수/변수 검색
grep -r "functionName" apps/mobile/

# 미구현 TODO 찾기
grep -r "TODO" apps/

# API 엔드포인트 확인
grep -r "@app\\.post\|@app\\.get" apps/backend/
```

### 의존성 관리
```bash
# Frontend
cd apps/mobile
npm install <package>
npm update

# Backend
cd apps/backend
pip install -e .
pip list
```

## 📚 참고 문서

### 프로젝트 문서
- `README.md`: 제품 스펙 및 요구사항 (한영)
- `run.md`: 실행 가이드
- `remind.md`: 개발 메모 및 주의사항

### 외부 문서
- [React Native 공식 문서](https://reactnative.dev/)
- [Expo 공식 문서](https://docs.expo.dev/)
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [SQLModel 공식 문서](https://sqlmodel.tiangolo.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest)

## 🎨 디자인 시스템

### 색상 팔레트 (apps/mobile/tailwind.config.js)
```javascript
colors: {
  primary: '#4F46E5',    // 인디고 (주요 액션)
  secondary: '#10B981',  // 그린 (성공, 긍정)
  background: '#F9FAFB', // 밝은 회색 (배경)
  surface: '#FFFFFF',    // 화이트 (카드)
  error: '#EF4444',      // 레드 (에러)
}
```

### 타이포그래피
- 제목: `text-xl font-bold`
- 본문: `text-base text-gray-700`
- 캡션: `text-sm text-gray-500`

## 🚀 다음 작업 제안

### 높은 우선순위
1. **비밀번호 해싱 구현** (`apps/backend/auth/utils.py`) - bcrypt로 전환
2. ~~**환경변수 설정**~~ **✅ 완료** (`.env` 파일로 DB URL, JWT Secret 분리됨)
3. **프론트엔드 Critical 이슈 수정** (상세: `FRONTEND_ISSUES_REPORT.md`)
   - DiaryEditScreen: 저장 버튼 중복 제출 방지
   - ShareSelectScreen: 일괄 공유 진행률 표시
   - ShareSelectScreen: 에러 처리 개선
4. **AI 캐릭터 채팅 기능** (백엔드 엔드포인트 + 프론트 UI)

### 중간 우선순위
5. **프론트엔드 High/Medium 이슈 수정** (총 13개)
   - 입력 검증 (이메일, 비밀번호, 사용자명)
   - 미저장 변경사항 경고
   - Pull-to-Refresh 추가
6. **구독 시스템 구현** (30일 무료 체험)
7. **코인샵 UI** (아이템 구매 플로우)
8. **E2E 테스트** (Detox 설정)

### 낮은 우선순위
9. **프론트엔드 UX 개선** (이미지 뷰어, Toast 알림 등)
10. **Sentry 연동** (크래시 리포팅)
11. **앱 성능 최적화** (콜드 스타트 ≤ 2.5초)
12. **딥링크 구현** (일기 공유 URL)

---

## 📞 도움이 필요할 때

Claude Code와 작업할 때:
1. **새 기능 추가**: 관련 파일 경로와 함께 요청
2. **버그 수정**: 에러 메시지와 재현 단계 제공
3. **코드 리뷰**: 특정 파일이나 함수명 명시
4. **리팩토링**: 개선하고 싶은 부분과 이유 설명

**최신 정보**: 프로젝트 변경사항은 `git log` 와 `remind.md` 참고

---

**마지막 업데이트**: 2025-11-06
**작성자**: Claude Code Setup
**버전**: 1.2.0 (MVP 전환 & 보안 강화 완료)
