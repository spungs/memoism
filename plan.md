# Memoism TDD 재작성 계획

이 파일은 Kent Beck의 TDD 원칙에 따라 Memoism 프로젝트를 처음부터 재작성하는 계획을 추적합니다.

**규칙:**
- 각 테스트를 순서대로 진행
- Red → Green → Refactor 사이클 엄격히 준수
- 모든 테스트가 통과한 상태에서만 커밋
- Structural changes와 Behavioral changes를 별도로 커밋

---

## Phase 0: 프로젝트 준비

- [x] 0.1 plan.md 생성
- [x] 0.2 기존 Backend 코드 백업 (apps/backend → apps/backend-legacy)
- [x] 0.3 기존 Mobile 코드 백업 (apps/mobile → apps/mobile-legacy)
- [x] 0.4 Backend 테스트 환경 설정 (pytest, pytest-asyncio, pytest-cov, httpx, faker)
- [ ] 0.5 Mobile 테스트 환경 설정 (Jest, React Testing Library)
- [x] 0.6 .env.example 파일 생성

---

## Phase 1: Backend - Authentication (Week 1)

### 테스트 작성 및 구현 (Red → Green)

- [x] 1.1 test_signup_success: 사용자 회원가입 성공
- [x] 1.2 test_signup_duplicate_email: 중복 이메일 검증
- [x] 1.3 test_signup_invalid_email: 잘못된 이메일 형식 검증
- [x] 1.4 test_password_hashing: bcrypt 비밀번호 암호화 검증
- [x] 1.5 test_password_hashing_roundtrip: 암호화/검증 전체 사이클
- [x] 1.6 test_login_success: 로그인 성공 및 JWT 토큰 발급
- [x] 1.7 test_login_invalid_email: 존재하지 않는 이메일로 로그인 실패
- [x] 1.8 test_login_invalid_password: 잘못된 비밀번호로 로그인 실패
- [x] 1.9 test_token_validation: JWT 토큰 검증 성공
- [x] 1.10 test_token_expiration: 만료된 토큰 검증 실패
- [x] 1.11 test_invalid_token: 잘못된 형식의 토큰 검증 실패

### 리팩토링 (Tidy First)

- [x] 1.R1 중복 코드 제거 (테스트 픽스처, 헬퍼 함수)
- [x] 1.R2 함수/변수명 명확화
- [x] 1.R3 인증 유틸리티 함수 분리
- [x] 1.R4 에러 처리 일관성 개선

---

## Phase 2: Backend - Diary CRUD (Week 2)

### 테스트 작성 및 구현 (Red → Green)

- [x] 2.1 test_create_diary_basic: 기본 일기 생성
- [x] 2.2 test_create_diary_with_title: 제목 포함 일기 생성
- [x] 2.3 test_create_diary_with_images: 이미지 URL 배열 포함
- [x] 2.4 test_create_diary_with_location: JSONB 위치 데이터 포함
- [x] 2.5 test_create_diary_unauthorized: 인증 없이 생성 시도 실패
- [x] 2.6 test_list_diaries_empty: 빈 일기 목록 조회
- [x] 2.7 test_list_diaries_with_data: 일기 목록 조회 (데이터 있음)
- [x] 2.8 test_list_diaries_pagination: 페이지네이션 동작
- [x] 2.9 test_list_diaries_date_filter: 날짜 필터링
- [x] 2.10 test_get_diary_detail: 일기 상세 조회 성공
- [x] 2.11 test_get_diary_not_found: 존재하지 않는 일기 조회 실패
- [x] 2.12 test_update_diary: 일기 수정 성공
- [x] 2.13 test_update_diary_unauthorized: 다른 사용자 일기 수정 실패
- [x] 2.14 test_delete_diary: 일기 삭제 성공
- [x] 2.15 test_delete_diary_unauthorized: 다른 사용자 일기 삭제 실패
- [ ] 2.16 test_cannot_access_other_users_diary: 권한 검증

### 리팩토링 (Tidy First)

- [ ] 2.R1 인증 데코레이터 추출
- [ ] 2.R2 공통 에러 응답 포맷 통일
- [ ] 2.R3 데이터베이스 쿼리 최적화
- [ ] 2.R4 스키마 검증 로직 개선

---

## Phase 3: Mobile - Authentication (Week 3)

### 테스트 작성 및 구현 (Red → Green)

- [ ] 3.1 test_auth_store_initial_state: authStore 초기 상태
- [ ] 3.2 test_auth_store_set_token: 토큰 저장
- [ ] 3.3 test_auth_store_set_user: 사용자 정보 저장
- [ ] 3.4 test_auth_store_clear_auth: 로그아웃 (상태 초기화)
- [ ] 3.5 test_use_signup_mutation: 회원가입 훅 (성공)
- [ ] 3.6 test_use_signup_error: 회원가입 훅 (에러 처리)
- [ ] 3.7 test_use_login_mutation: 로그인 훅 (성공)
- [ ] 3.8 test_use_login_error: 로그인 훅 (에러 처리)
- [ ] 3.9 test_login_screen_renders: 로그인 화면 렌더링
- [ ] 3.10 test_login_form_validation: 로그인 폼 유효성 검증
- [ ] 3.11 test_login_submission: 로그인 폼 제출
- [ ] 3.12 test_signup_screen_renders: 회원가입 화면 렌더링
- [ ] 3.13 test_signup_form_validation: 회원가입 폼 유효성 검증
- [ ] 3.14 test_signup_submission: 회원가입 폼 제출

### 리팩토링 (Tidy First)

- [ ] 3.R1 공통 폼 컴포넌트 추출
- [ ] 3.R2 유효성 검증 로직 분리
- [ ] 3.R3 API 클라이언트 유틸리티 정리
- [ ] 3.R4 타입 정의 개선

---

## Phase 4: Mobile - Diary Features (Week 4)

### 테스트 작성 및 구현 (Red → Green)

- [ ] 4.1 test_use_diaries_query: 일기 목록 조회 훅
- [ ] 4.2 test_use_diaries_query_empty: 빈 목록 처리
- [ ] 4.3 test_use_create_diary_mutation: 일기 생성 훅
- [ ] 4.4 test_use_create_diary_with_images: 이미지 포함 생성
- [ ] 4.5 test_use_update_diary_mutation: 일기 수정 훅
- [ ] 4.6 test_use_delete_diary_mutation: 일기 삭제 훅
- [ ] 4.7 test_diary_list_empty_state: 일기 목록 화면 (빈 상태)
- [ ] 4.8 test_diary_list_with_data: 일기 목록 화면 (데이터 있음)
- [ ] 4.9 test_diary_list_navigation: 일기 상세로 네비게이션
- [ ] 4.10 test_diary_detail_renders: 일기 상세 화면 렌더링
- [ ] 4.11 test_diary_detail_images: 이미지 표시
- [ ] 4.12 test_diary_detail_location: 위치 정보 표시
- [ ] 4.13 test_diary_edit_form: 일기 편집 폼
- [ ] 4.14 test_diary_edit_image_picker: 이미지 선택
- [ ] 4.15 test_diary_edit_submission: 편집 제출
- [ ] 4.16 test_map_screen_renders: 지도 화면 렌더링
- [ ] 4.17 test_map_markers: 지도 마커 표시

### 리팩토링 (Tidy First)

- [ ] 4.R1 공통 UI 컴포넌트 추출
- [ ] 4.R2 스타일 일관성 개선
- [ ] 4.R3 로딩/에러 상태 처리 통일
- [ ] 4.R4 네비게이션 로직 정리

---

## Phase 5: Integration & Polish (Week 5)

### 통합 테스트 (Red → Green)

- [ ] 5.1 test_full_user_journey: 회원가입 → 로그인 → 일기 작성 → 조회 → 수정 → 삭제 → 로그아웃
- [ ] 5.2 test_network_failure_handling: 네트워크 실패 처리
- [ ] 5.3 test_token_expiration_flow: 토큰 만료 처리
- [ ] 5.4 test_invalid_input_handling: 잘못된 입력 처리
- [ ] 5.5 test_sql_injection_prevention: SQL Injection 방지
- [ ] 5.6 test_xss_prevention: XSS 방지
- [ ] 5.7 test_cors_policy: CORS 정책 검증
- [ ] 5.8 test_large_diary_list_pagination: 대량 데이터 페이지네이션
- [ ] 5.9 test_multiple_images_upload: 다중 이미지 처리

### 리팩토링 (Tidy First)

- [ ] 5.R1 전체 코드 리뷰 및 중복 제거
- [ ] 5.R2 네이밍 일관성 개선
- [ ] 5.R3 문서화 주석 추가
- [ ] 5.R4 성능 최적화

---

## Phase 6: Production Ready (Week 6)

### 배포 준비

- [ ] 6.1 프로덕션 DATABASE_URL 환경 변수 설정
- [ ] 6.2 CORS 정책 환경별 분리
- [ ] 6.3 API_URL 환경별 설정
- [ ] 6.4 GitHub Actions CI/CD 구축
- [ ] 6.5 테스트 자동 실행 설정
- [ ] 6.6 API 문서 자동 생성 (FastAPI Swagger)
- [ ] 6.7 README.md 업데이트
- [ ] 6.8 개발 환경 설정 가이드 작성
- [ ] 6.9 전체 테스트 스위트 실행 및 커버리지 확인 (80%+)
- [ ] 6.10 수동 QA 체크리스트 완료

---

## 진행 상황

- **현재 단계**: Phase 2 진행 중
- **다음 테스트**: Phase 2.16 - test_cannot_access_other_users_diary (권한 검증)
- **완료된 테스트**: 26개 / 총 100+개
- **테스트 커버리지**:
  - Backend: 95.17%
  - Mobile: 0%

---

## 커밋 로그

(커밋 내역이 여기에 기록됩니다)

---

## 참고 사항

- 모든 커밋은 테스트가 통과하는 상태에서만 수행
- Behavioral changes와 Structural changes를 분리하여 커밋
- 각 테스트는 하나의 작은 기능만 검증
- 테스트 이름은 동작을 명확히 설명
