# Branch Comparison: spungsDEV vs claude/setup-claude-config

> 비교 날짜: 2025-11-06
> Base: 933bf82 (공통 조상 커밋)

## 📊 개요

**spungsDEV 브랜치**와 **claude/setup-claude-config 브랜치**는 933bf82 커밋 이후 서로 다른 방향으로 발전했습니다.

- **spungsDEV**: 소셜 기능 제거 및 1차 프로토타입 범위 조정 (실제 개발 작업)
- **claude**: 환경변수 설정 및 프론트엔드 이슈 수정 (개발 도구 및 버그 픽스)

---

## 🔀 커밋 히스토리 비교

### spungsDEV 브랜치에만 있는 커밋 (4개)
```
fc749002 - refactor: 1차 프로토타입 범위에 맞춰 소셜 기능 완전 제거
c3130441 - feat: 홈 화면 피드 개편 및 안드로이드 오류 수정
966325fb - Implement nickname update and logout consistency features
6b320d74 - Fix Android DETECT_SCREEN_CAPTURE permission error again
```

### claude 브랜치에만 있는 커밋 (4개)
```
2be887bd - fix: Fix all 24 frontend issues across all screens
54cf06d2 - docs: Update CLAUDE.md with completed tasks and environment setup guide
28df6d4e - feat: Migrate hardcoded configurations to environment variables
d5480b10 - docs: Add Claude Code initial setup and configuration
```

---

## 🎯 주요 차이점

### 1. **기능 범위 차이**

#### spungsDEV (소셜 기능 제거)
- ❌ **삭제된 기능**:
  - 팔로우/언팔로우 시스템
  - 공유 피드 (ShareFeedScreen)
  - 일기 공유 선택 (ShareSelectScreen)
  - 댓글 시스템 (DiaryComment)
  - 반응 시스템 (DiaryReaction)
  - 알림 시스템 (Notification)
  - 일기 공개/비공개 토글 (is_public)

- ✅ **남은 기능**:
  - 개인용 일기 CRUD만 유지
  - 순수한 비공개 다이어리 앱

#### claude (전체 기능 유지)
- ✅ **유지된 기능**:
  - 모든 소셜 기능 그대로 유지
  - 팔로우, 공유, 댓글, 반응, 알림 모두 존재
  - 일기 공개/비공개 기능 유지

---

### 2. **백엔드 차이**

| 항목 | spungsDEV | claude |
|------|-----------|--------|
| **follow 모듈** | ❌ 완전 삭제 | ✅ 존재 |
| **Follow 모델** | ❌ 삭제 | ✅ 존재 |
| **DiaryComment 모델** | ❌ 삭제 | ✅ 존재 |
| **DiaryReaction 모델** | ❌ 삭제 | ✅ 존재 |
| **Notification 모델** | ❌ 삭제 | ✅ 존재 |
| **Diary.is_public** | ❌ 삭제 | ✅ 존재 |
| **환경변수 설정** | ❌ 없음 | ✅ .env 파일 |
| **python-dotenv** | ❌ 없음 | ✅ 추가됨 |

**주요 파일 변경**:
- `apps/backend/models.py`: spungsDEV는 소셜 모델 제거, claude는 유지
- `apps/backend/diary/router.py`: spungsDEV는 단순화, claude는 복잡한 소셜 로직 유지
- `apps/backend/main.py`: spungsDEV는 follow router 제거, claude는 환경변수 사용
- `apps/backend/database.py`: spungsDEV는 하드코딩, claude는 환경변수
- `apps/backend/auth/utils.py`: spungsDEV는 하드코딩, claude는 환경변수

---

### 3. **프론트엔드 차이**

| 화면 | spungsDEV | claude |
|------|-----------|--------|
| **ShareFeedScreen** | ❌ 삭제 | ✅ 존재 |
| **ShareSelectScreen** | ❌ 삭제 | ✅ 존재 + 개선 |
| **DiaryListScreen** | ✅ 단순화 (공유 버튼 제거) | ✅ 복잡 (공유 기능 유지) + Pull-to-Refresh |
| **SettingsScreen** | ✅ 단순화 (알림 제거) | ✅ 복잡 (알림 유지) + AsyncStorage 개선 |
| **DiaryEditScreen** | ✅ 기본 CRUD | ✅ 기본 CRUD + 로딩 상태 + 미저장 경고 |
| **AuthLoginScreen** | ✅ 기본 로그인 | ✅ 이메일 검증 + navigation.replace |
| **AuthSignupScreen** | ✅ 기본 회원가입 | ✅ 입력 검증 (이메일/비밀번호/사용자명) |
| **DiaryDetailScreen** | ✅ 기본 상세 | ✅ ActivityIndicator 추가 |

**API 파일**:
- `apps/mobile/api/followApi.ts`: spungsDEV에서 삭제됨
- `apps/mobile/api/diaryApi.ts`: spungsDEV는 단순화, claude는 소셜 기능 포함

**네비게이션**:
- spungsDEV: 홈/설정 2개 탭만
- claude: 홈/공유/설정 3개 탭

---

### 4. **코드 품질 및 개발 도구**

#### spungsDEV
- ❌ Claude Code 설정 파일 없음 (`.claude/`, `.claudeignore`, `CLAUDE.md` 삭제됨)
- ❌ 프론트엔드 이슈 리포트 없음 (FRONTEND_ISSUES_REPORT.md 삭제됨)
- ❌ 환경변수 사용 안 함 (.env.example 삭제됨)
- ✅ 실제 기능 개발에 집중
- ✅ venv 폴더 포함 (백엔드 의존성 설치됨)

#### claude
- ✅ Claude Code 설정 완비
  - `.claude/commands/` - 5개 슬래시 커맨드
  - `.claudeignore` - 성능 최적화
  - `CLAUDE.md` - 종합 프로젝트 가이드 (413줄)
- ✅ FRONTEND_ISSUES_REPORT.md - 24개 이슈 문서화
- ✅ 환경변수 설정 (.env.example 제공)
- ✅ 24개 프론트엔드 이슈 수정
- ❌ venv 폴더 없음 (의존성 미설치)

---

### 5. **README.md 차이**

spungsDEV는 README.md를 대폭 수정했지만, claude는 원본 유지:

```bash
# 변경 크기
spungsDEV: README.md (129줄 변경)
claude: README.md (변경 없음)
```

---

## 🔍 파일별 상세 비교

### 백엔드

| 파일 | spungsDEV 변경사항 | claude 변경사항 |
|------|------------------|---------------|
| `models.py` | 소셜 모델 전부 삭제 (Follow, Comment, Reaction, Notification) | 변경 없음 (모두 유지) |
| `diary/router.py` | 댓글/반응/is_public 로직 제거 | 변경 없음 (모두 유지) |
| `diary/schemas.py` | 단순화 (공개 관련 필드 제거) | 변경 없음 |
| `follow/router.py` | ❌ 파일 삭제 | ✅ 존재 |
| `follow/schemas.py` | ❌ 파일 삭제 | ✅ 존재 |
| `main.py` | follow router 제거 | 환경변수 사용 (CORS) |
| `database.py` | 하드코딩 유지 | 환경변수 사용 (DATABASE_URL) |
| `auth/utils.py` | 하드코딩 유지 | 환경변수 사용 (SECRET_KEY 등) |
| `setup.py` | 변경 없음 | python-dotenv 추가 |
| `.env.example` | ❌ 삭제 | ✅ 생성 |

### 프론트엔드

| 파일 | spungsDEV 변경사항 | claude 변경사항 |
|------|------------------|---------------|
| `App.tsx` | 공유 탭 제거 (2개 탭만) | 변경 없음 (3개 탭 유지) |
| `ShareFeedScreen.tsx` | ❌ 삭제 | ✅ 존재 |
| `ShareSelectScreen.tsx` | ❌ 삭제 | ✅ 존재 + 진행률 표시 + 에러 처리 개선 |
| `DiaryListScreen.tsx` | 공유 버튼 제거 | Pull-to-Refresh + 에러 재시도 + ActivityIndicator |
| `DiaryEditScreen.tsx` | 변경 없음 | 로딩 상태 + 미저장 경고 + 권한 안내 |
| `AuthLoginScreen.tsx` | 닉네임 갱신 로직 추가 | 이메일 검증 + navigation.replace + HTTP 체크 |
| `AuthSignupScreen.tsx` | 변경 없음 | 이메일/비밀번호/사용자명 검증 |
| `DiaryDetailScreen.tsx` | 변경 없음 | ActivityIndicator 추가 |
| `SettingsScreen.tsx` | 알림 관련 기능 제거 | AsyncStorage Promise.all + 로딩 인디케이터 |
| `api/followApi.ts` | ❌ 삭제 | ✅ 존재 |
| `api/diaryApi.ts` | 소셜 기능 제거 | 변경 없음 (모두 유지) |

---

## 🎨 아키텍처 차이

### spungsDEV - 1차 프로토타입 (MVP)
```
사용자
  ↓
[로그인/회원가입]
  ↓
[홈 화면] → [일기 작성/수정]
  ↓           ↓
[설정]      [일기 상세] → [삭제]
```

**특징**:
- 단순한 개인용 다이어리
- 소셜 기능 전무
- 최소 기능만 유지
- MVP 검증에 집중

### claude - 전체 기능 버전
```
사용자
  ↓
[로그인/회원가입] (검증 강화)
  ↓
[홈] ←→ [공유 피드] ←→ [설정]
  ↓        ↓             ↓
[일기]   [팔로우]    [프로필/알림]
  ↓        ↓
[댓글]   [좋아요]
[반응]   [공유]
```

**특징**:
- 소셜 다이어리 앱
- 인스타그램 스타일
- 풍부한 사용자 상호작용
- 완전한 기능 구현

---

## 📝 문서 차이

### spungsDEV
- ❌ CLAUDE.md 삭제됨
- ❌ FRONTEND_ISSUES_REPORT.md 삭제됨
- ❌ .claude/ 폴더 삭제됨
- ✅ README.md 대폭 수정 (프로토타입 설명)
- ✅ run.md 업데이트

### claude
- ✅ CLAUDE.md 생성 (413줄, 프로젝트 종합 가이드)
- ✅ FRONTEND_ISSUES_REPORT.md 생성 (303줄, 24개 이슈 문서)
- ✅ .claude/commands/ 5개 슬래시 커맨드
  - `/start-dev` - 개발 서버 시작
  - `/add-feature` - 기능 추가 체크리스트
  - `/fix-security` - 보안 이슈 안내
  - `/analyze-api` - API 엔드포인트 분석
  - `/translate` - 다국어 번역 도우미
- ✅ .claudeignore 생성 (성능 최적화)
- ❌ README.md 변경 없음

---

## 🚀 다음 단계 권장사항

### 시나리오 1: spungsDEV 기반으로 계속 개발
**장점**:
- 1차 프로토타입에 집중
- 코드가 단순하고 유지보수 쉬움
- MVP 검증에 최적화

**필요 작업**:
1. ✅ claude 브랜치의 환경변수 설정 병합
2. ✅ 프론트엔드 이슈 중 필요한 것만 선택적으로 적용
3. ✅ CLAUDE.md 업데이트 (소셜 기능 제거 반영)

### 시나리오 2: claude 기반으로 계속 개발
**장점**:
- 완전한 기능 세트
- 버그 수정 완료
- 개발 도구 완비

**필요 작업**:
1. ✅ spungsDEV의 닉네임 갱신 로직 병합
2. ✅ 필요 시 소셜 기능 제거 (spungsDEV 참고)

### 시나리오 3: 두 브랜치 병합 (권장)
**최선의 방법**:
```bash
# 1. spungsDEV를 기반으로 시작
git checkout spungsDEV
git checkout -b feature/merge-improvements

# 2. claude의 개선사항 선택적으로 병합
# - 환경변수 설정 (.env, database.py, main.py, auth/utils.py)
# - 프론트엔드 핵심 이슈 수정 (입력 검증, 로딩 상태)
# - CLAUDE.md 추가 (소셜 기능 제거 반영하여 수정)
```

---

## 📊 통계 요약

| 항목 | spungsDEV | claude |
|------|-----------|--------|
| **총 커밋 수** | 4개 (독립) | 4개 (독립) |
| **삭제된 파일** | 7개 (소셜 기능) | 0개 |
| **추가된 파일** | 0개 | 3개 (문서) |
| **수정된 파일** | 13개 (간소화) | 10개 (개선) |
| **Backend 변경** | 대규모 (소셜 제거) | 소규모 (환경변수) |
| **Frontend 변경** | 대규모 (화면 제거) | 중규모 (버그 수정) |
| **문서화** | 감소 | 대폭 증가 |
| **보안 개선** | 없음 | ✅ 환경변수 |
| **코드 품질** | 단순화 우선 | 버그 수정 우선 |

---

## 🎯 결론

**spungsDEV**는 **실제 제품 개발**에 집중하여 1차 프로토타입 범위에 맞게 소셜 기능을 제거하고 MVP를 구축했습니다.

**claude**는 **개발 환경 개선 및 버그 수정**에 집중하여 환경변수 설정, 24개 프론트엔드 이슈 수정, 문서화를 완료했습니다.

### 권장사항
1. **즉시**: spungsDEV 브랜치를 주 개발 브랜치로 사용
2. **병합**: claude 브랜치의 환경변수 설정과 핵심 버그 수정을 선택적으로 가져오기
3. **문서**: CLAUDE.md를 spungsDEV 버전으로 업데이트

---

**비교 완료 날짜**: 2025-11-06
**작성**: Claude Code
