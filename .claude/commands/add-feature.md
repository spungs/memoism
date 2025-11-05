---
description: 새 기능 추가 체크리스트
---

새로운 기능을 추가하기 위한 체크리스트입니다.

## Frontend 기능 추가

### 1. 새 화면 추가
- [ ] `apps/mobile/screens/` 에 화면 컴포넌트 생성
- [ ] `apps/mobile/App.tsx` 에 네비게이션 라우트 추가
- [ ] `apps/mobile/locales/` 에 번역 키 추가 (en, ko, ja, zh)

### 2. API 연동
- [ ] `apps/mobile/api/` 에 API 클라이언트 함수 작성
- [ ] React Query hook 생성 (`useQuery` 또는 `useMutation`)
- [ ] 에러 처리 및 로딩 상태 처리

### 3. 상태 관리
- [ ] Zustand store 필요 여부 확인
- [ ] React Query 캐시 invalidation 설정

## Backend 기능 추가

### 1. API 엔드포인트
- [ ] `apps/backend/{module}/router.py` 에 라우트 추가
- [ ] `apps/backend/{module}/schemas.py` 에 Pydantic 모델 정의
- [ ] 인증 필요 시 `Depends(get_current_user)` 추가

### 2. 데이터베이스
- [ ] `apps/backend/models.py` 에 SQLModel 추가 (필요시)
- [ ] 마이그레이션 SQL 작성 (`apps/backend/supabase/migrations/`)
- [ ] 테이블 관계 (FK) 설정

### 3. 비즈니스 로직
- [ ] 유효성 검사
- [ ] 에러 처리 (HTTPException)
- [ ] 트랜잭션 처리 (필요시)

어떤 기능을 추가하시겠습니까?
