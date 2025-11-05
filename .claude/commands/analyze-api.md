---
description: API 엔드포인트 분석 및 문서화
---

현재 구현된 API 엔드포인트를 분석합니다.

## API 엔드포인트 목록

### 인증 API (`/auth`)
- `POST /auth/signup` - 회원가입
- `POST /auth/token` - 로그인 (JWT 발급)
- `GET /auth/me` - 현재 사용자 정보
- `PUT /auth/profile` - 프로필 업데이트

### 일기 API (`/diaries`)
- `GET /diaries` - 일기 목록 (내 일기 또는 공개 피드)
- `POST /diaries` - 일기 생성
- `GET /diaries/{id}` - 일기 상세
- `PUT /diaries/{id}` - 일기 수정
- `DELETE /diaries/{id}` - 일기 삭제
- `POST /diaries/{id}/like` - 좋아요 토글
- `POST /diaries/{id}/comments` - 댓글 작성
- `PUT /diaries/comments/{id}` - 댓글 수정
- `DELETE /diaries/comments/{id}` - 댓글 삭제
- `GET /diaries/{id}/comments` - 댓글 목록
- `POST /diaries/{id}/reactions` - 반응 추가
- `GET /diaries/{id}/reactions` - 반응 목록

### 팔로우 API (`/follow`)
- `POST /follow/{user_id}` - 팔로우
- `DELETE /follow/{user_id}` - 언팔로우
- `GET /follow/following` - 팔로잉 목록
- `GET /follow/followers` - 팔로워 목록
- `GET /follow/check/{user_id}` - 팔로우 상태 확인
- `GET /follow/notifications` - 알림 목록
- `PUT /follow/notifications/{id}/read` - 알림 읽음 처리

## 미구현 API

### AI 캐릭터 (계획)
- `POST /character/chat` - AI 캐릭터 대화
- `GET /character/info` - 캐릭터 정보 (나이, 레벨)

### 코인샵 (계획)
- `GET /store/items` - 아이템 목록
- `POST /store/purchase` - 아이템 구매
- `GET /store/inventory` - 내 아이템 목록

### 구독 (계획)
- `POST /subscription/subscribe` - 구독 시작
- `GET /subscription/status` - 구독 상태

어떤 API를 자세히 분석하거나 구현할까요?
