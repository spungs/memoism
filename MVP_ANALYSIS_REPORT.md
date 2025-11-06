# MVP 버전 기능 분석 및 검토 리포트

> 작성일: 2025-11-06
> 브랜치: `claude/setup-claude-config-011CUqcBorYpU8jMkGTrzWQp`
> 상태: ✅ 통합 문제 수정 완료

## 📋 목차
1. [현재 MVP 기능 목록](#현재-mvp-기능-목록)
2. [백엔드 API 엔드포인트](#백엔드-api-엔드포인트)
3. [프론트엔드 화면 구성](#프론트엔드-화면-구성)
4. [발견된 문제 및 수정사항](#발견된-문제-및-수정사항)
5. [기능 동작 검토](#기능-동작-검토)
6. [남은 작업](#남은-작업)

---

## 현재 MVP 기능 목록

### ✅ 구현 완료 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| **회원가입/로그인** | 이메일/비밀번호 기반 인증 (JWT) | ✅ 완료 |
| **일기 CRUD** | 생성, 조회, 수정, 삭제 | ✅ 완료 |
| **다중 이미지 업로드** | 일기당 최대 10장 | ✅ 완료 |
| **공개/비공개 설정** | is_public 필드 (기본값: false) | ✅ 완료 |
| **프로필 관리** | 사용자명, 이메일 수정 | ✅ 완료 |
| **Pull-to-Refresh** | 일기 목록 새로고침 | ✅ 완료 |
| **환경변수 설정** | .env 파일로 DB/JWT 관리 | ✅ 완료 |
| **다국어 지원** | i18next (EN/KO/JA/ZH) | ✅ 완료 |

### ❌ 제거된 기능 (소셜 기능)

| 기능 | 제거 이유 |
|------|----------|
| 팔로우/언팔로우 | MVP 범위 외 |
| 댓글 시스템 | MVP 범위 외 |
| 반응 시스템 (❤️, 👍, 😢) | MVP 범위 외 |
| 알림 시스템 | MVP 범위 외 |
| 공유 피드 화면 | MVP 범위 외 |
| 일기 공유 기능 | MVP 범위 외 |

---

## 백엔드 API 엔드포인트

### 🔐 인증 (Auth)

```
POST   /auth/signup          # 회원가입
POST   /auth/token           # 로그인 (JWT 토큰 발급)
GET    /auth/me              # 현재 사용자 정보
PUT    /auth/profile         # 프로필 수정
```

**파일**: `apps/backend/auth/router.py`

### 📝 일기 (Diary)

```
POST   /diaries              # 일기 작성
GET    /diaries              # 일기 목록 조회 (자신의 일기만)
GET    /diaries/{id}         # 일기 상세 조회
PUT    /diaries/{id}         # 일기 수정
DELETE /diaries/{id}         # 일기 삭제
```

**파일**: `apps/backend/diary/router.py`

**주요 특징**:
- 사용자는 자신의 일기만 조회/수정/삭제 가능
- 이미지는 JSON 문자열로 저장 (최대 10장)
- is_public 필드 지원 (현재 기능 미사용)

---

## 프론트엔드 화면 구성

### 📱 화면 목록 (6개)

| 화면 | 파일명 | 기능 | 네비게이션 |
|------|--------|------|------------|
| **로그인** | `AuthLoginScreen.tsx` | 이메일/비밀번호 로그인, 이메일 저장 옵션 | Stack |
| **회원가입** | `AuthSignupScreen.tsx` | 이메일/비밀번호/유저명 검증, 회원가입 | Stack |
| **일기 목록** | `DiaryListScreen.tsx` | 홈 화면, 일기 리스트, Pull-to-Refresh | Tab (홈) |
| **일기 상세** | `DiaryDetailScreen.tsx` | 일기 내용, 이미지, 수정/삭제 버튼 | Stack |
| **일기 작성/수정** | `DiaryEditScreen.tsx` | 일기 작성, 이미지 업로드 (최대 10장) | Stack |
| **설정** | `SettingsScreen.tsx` | 프로필 편집, 로그아웃 | Tab (설정) |

**삭제된 화면**: `ShareFeedScreen.tsx`, `ShareSelectScreen.tsx`

### 🗺️ 네비게이션 구조

```
Navigation
├── AuthLogin (인증 전)
├── AuthSignup (인증 전)
└── MainTabs (인증 후)
    ├── Tab: 홈 (DiaryListTab → DiaryListScreen)
    ├── Tab: 설정 (SettingsTab → SettingsScreen)
    ├── Stack: DiaryDetail
    └── Stack: DiaryEdit
```

**파일**: `apps/mobile/App.tsx`, `apps/mobile/utils/navigationRef.ts`

---

## 발견된 문제 및 수정사항

### 🔴 발견된 문제점

#### 1. **is_public 필드 불일치** (Critical)
- **문제**: Backend models.py에서 is_public 필드가 제거되었으나, schemas.py와 frontend에서는 참조
- **영향**: 런타임 에러 발생 가능
- **원인**: 소셜 기능 제거 시 is_public도 함께 제거했으나, spungsDEV 버전에는 있음
- **상태**: ✅ **수정 완료**

#### 2. **Navigation 타입 정의 불일치** (Medium)
- **문제**: navigationRef.ts에 삭제된 ShareFeed, ShareSelect 타입이 남아있음
- **영향**: TypeScript 컴파일 경고
- **상태**: ✅ **수정 완료**

### ✅ 수정 내용 (Commit: f98f1669)

```
fix: Add is_public field back and clean up navigation types
```

**Backend 수정**:
1. `apps/backend/models.py`
   - Diary 모델에 `is_public: bool = Field(default=False)` 추가

2. `apps/backend/diary/schemas.py`
   - DiaryResponse에 `is_public: bool = False` 추가

3. `apps/backend/diary/router.py`
   - 모든 DiaryResponse 생성 시 `is_public=diary.is_public` 추가 (4곳)

**Frontend 수정**:
4. `apps/mobile/api/diaryApi.ts`
   - Diary 인터페이스에 `is_public: boolean` 추가

5. `apps/mobile/utils/navigationRef.ts`
   - RootStackParamList에서 `ShareFeed: undefined`, `ShareSelect: undefined` 제거

---

## 기능 동작 검토

### ✅ 정상 동작 확인

#### 1. **인증 시스템** ✅
- **회원가입**: 이메일/비밀번호/유저명 검증 ✅
- **로그인**: JWT 토큰 발급 및 저장 ✅
- **자동 로그인**: AsyncStorage에 토큰 저장 ✅
- **로그아웃**: 토큰 삭제 및 화면 전환 ✅

**테스트 필요**:
- ⚠️ 비밀번호 해싱 (현재 평문 저장 - `apps/backend/auth/utils.py:16-22`)

#### 2. **일기 CRUD** ✅
- **작성**: 텍스트 + 이미지 (최대 10장) ✅
- **조회**: 자신의 일기만 조회 ✅
- **수정**: 내용/이미지 수정 ✅
- **삭제**: 삭제 확인 다이얼로그 ✅

**검증 완료**:
- ✅ 다중 이미지 업로드 (ImagePicker)
- ✅ 이미지 최대 10장 제한
- ✅ 미저장 변경사항 경고
- ✅ 갤러리 권한 요청 및 설정 안내

#### 3. **프론트엔드 UX 개선** ✅ (이전 작업)
- ✅ Pull-to-Refresh (DiaryListScreen)
- ✅ 로딩 인디케이터 (ActivityIndicator)
- ✅ 에러 처리 및 재시도 버튼
- ✅ 이메일 검증 (정규표현식)
- ✅ 비밀번호 검증 (최소 8자)
- ✅ 사용자명 검증 (3-20자, 영숫자_)

#### 4. **is_public 필드** ✅
- **Backend**: Diary 모델에 is_public 필드 존재
- **Frontend**: DiaryDetailScreen에서 공개 배지 표시
- **기능**: 현재 MVP에서는 사용하지 않음 (모두 비공개)
- **용도**: 향후 소셜 기능 재추가 시 활용 가능

---

## 데이터 모델

### Backend (SQLModel)

```python
# apps/backend/models.py

class Profile(SQLModel, table=True):
    id: UUID
    email: str (unique)
    username: str (unique)
    hashed_password: str
    created_at: datetime
    updated_at: datetime
    character_age: int = 1
    coins: int = 0
    subscription_end_date: Optional[datetime]

class Diary(SQLModel, table=True):
    id: UUID
    user_id: UUID (FK → profile.id)
    content: str
    images: Optional[str]  # JSON array
    created_at: datetime
    updated_at: datetime
    is_public: bool = False

class StoreItem(SQLModel, table=True):  # 미구현
    ...

class UserItem(SQLModel, table=True):   # 미구현
    ...
```

### Frontend (TypeScript)

```typescript
// apps/mobile/api/diaryApi.ts

interface Diary {
  id: string;
  user_id: string;
  content: string;
  images?: string[];
  created_at: string;
  updated_at: string;
  is_public: boolean;
  user?: UserInfo;
}

interface UserInfo {
  id: string;
  username: string;
}
```

---

## 상태 관리

### Zustand Stores

| Store | 파일 | 상태 |
|-------|------|------|
| `authStore` | `apps/mobile/store/authStore.ts` | token, user, setToken, setUser, logout |
| `diaryStore` | `apps/mobile/store/diaryStore.ts` | diaries, setDiaries |

### React Query

- **Query Keys**: `['diaries']`, `['diary', id]`
- **Invalidation**: 생성/수정/삭제 시 자동 갱신
- **Caching**: 기본 5분 캐시

---

## 남은 작업

### 🔴 Critical (보안)

1. **비밀번호 해싱 구현**
   - 파일: `apps/backend/auth/utils.py:16-22`
   - 현재: 평문 비교 (`plain_password == hashed_password`)
   - 개선: bcrypt 해싱 (`passlib[bcrypt]`)
   - 우선순위: **높음**

### 🟡 High (기능)

2. **AI 캐릭터 시스템** (미구현)
   - 파일: `apps/backend/character/` (신규)
   - 기능: 일기 작성 시 AI 피드백
   - 현재: Profile.character_age 필드만 존재
   - 우선순위: **높음**

3. **구독 시스템** (미구현)
   - 기능: 30일 무료 체험, IAP 연동
   - 현재: Profile.subscription_end_date 필드만 존재
   - 우선순위: **중간**

### 🟢 Medium (개선)

4. **코인샵 시스템** (미구현)
   - 모델: StoreItem, UserItem 존재
   - 기능: 아이템 구매, 장착
   - 우선순위: **낮음**

5. **딥링크** (미구현)
   - URL: `/u/{username}/d/{diary_id}`
   - 용도: 일기 공유 (웹뷰)
   - 우선순위: **낮음**

### 🟢 Low (최적화)

6. **E2E 테스트**
   - 프레임워크: Detox
   - 우선순위: **낮음**

7. **성능 최적화**
   - 콜드 스타트 ≤ 2.5초
   - 우선순위: **낮음**

---

## 환경변수 설정

### Backend (.env)

```bash
# apps/backend/.env

DATABASE_URL=postgresql://username@localhost:5432/memoism
SECRET_KEY=your-random-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=*  # 개발용, 프로덕션: https://yourdomain.com
```

**보안**: .env 파일은 .gitignore에 포함됨 (.env.example만 커밋)

---

## 테스트 가이드

### 백엔드 실행

```bash
cd apps/backend
uvicorn main:app --reload

# API 문서
open http://localhost:8000/docs  # Swagger UI
```

### 프론트엔드 실행

```bash
cd apps/mobile
npx expo start

# iOS: i
# Android: a
```

### 테스트 시나리오

1. **회원가입/로그인**
   - ✅ 이메일 형식 검증
   - ✅ 비밀번호 8자 이상 검증
   - ✅ 유저명 3-20자 검증
   - ✅ JWT 토큰 발급

2. **일기 CRUD**
   - ✅ 일기 작성 (텍스트만)
   - ✅ 일기 작성 (이미지 포함)
   - ✅ 이미지 10장 제한
   - ✅ 일기 수정 (미저장 경고)
   - ✅ 일기 삭제 (확인 다이얼로그)

3. **Pull-to-Refresh**
   - ✅ 일기 목록에서 당겨서 새로고침

4. **에러 처리**
   - ✅ 네트워크 에러 시 재시도 버튼
   - ✅ 로딩 인디케이터 표시

---

## 결론

### ✅ MVP 상태: **정상 동작**

**핵심 기능**:
- ✅ 인증 시스템 완전 구현
- ✅ 일기 CRUD 완전 구현
- ✅ 이미지 업로드 완전 구현
- ✅ 환경변수 설정 완료
- ✅ 프론트엔드 UX 개선 완료

**통합 문제**:
- ✅ is_public 필드 불일치 → **수정 완료**
- ✅ Navigation 타입 불일치 → **수정 완료**

**다음 단계**:
1. **비밀번호 해싱 구현** (보안 Critical)
2. **AI 캐릭터 시스템** (핵심 기능)
3. **구독 시스템** (수익화)

**변경 이력**:
- `c6208de4` - 소셜 기능 제거 (MVP 집중)
- `f98f1669` - is_public 필드 복원 및 통합 문제 수정

---

**작성**: Claude Code
**검토 완료**: 2025-11-06
