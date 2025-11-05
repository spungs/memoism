---
description: 보안 이슈 수정 (비밀번호 해싱, 환경변수 등)
---

현재 프로젝트의 보안 이슈를 수정합니다.

## 알려진 보안 문제

### 1. 비밀번호 평문 저장 ⚠️ 긴급
**위치**: `apps/backend/auth/utils.py:16-22`

**현재 코드**:
```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return plain_password == hashed_password  # FIXME: 임시
```

**수정 필요**:
- bcrypt 해싱 적용
- `get_password_hash()` 함수 구현
- 기존 사용자 비밀번호 마이그레이션

### 2. 데이터베이스 URL 하드코딩
**위치**: `apps/backend/database.py:6`

**현재 코드**:
```python
DATABASE_URL = "postgresql://sonkyoungho@localhost:5432/memoism"
```

**수정 필요**:
- `.env` 파일로 분리
- `python-dotenv` 설치
- 환경변수로 로드

### 3. CORS 와일드카드
**위치**: `apps/backend/main.py:13`

**현재 코드**:
```python
allow_origins=["*"]  # 프로덕션에서 제한 필요
```

**수정 필요**:
- 프로덕션 환경에서 특정 도메인만 허용
- 환경별 설정 분리

어떤 보안 이슈를 먼저 수정할까요?
