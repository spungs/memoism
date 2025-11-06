# 비밀번호 해싱 마이그레이션 가이드

> 날짜: 2025-11-06
> 변경사항: 평문 비밀번호 → bcrypt 해싱

## 🔒 변경 내용

### Before (취약)
```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return plain_password == hashed_password  # ⚠️ 평문 비교

def get_password_hash(password: str) -> str:
    return password  # ⚠️ 평문 저장
```

### After (보안)
```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)  # ✅ bcrypt 검증

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)  # ✅ bcrypt 해싱
```

---

## ⚠️ 중요: 기존 사용자 데이터 처리

### 개발 환경 (권장)

**데이터베이스 리셋 필요**

기존에 평문으로 저장된 비밀번호는 bcrypt 해시와 호환되지 않습니다.

```bash
# PostgreSQL 데이터베이스 리셋
cd apps/backend

# 1. 기존 데이터베이스 삭제 (개발 환경만!)
psql -U postgres
DROP DATABASE memoism;
CREATE DATABASE memoism;
\q

# 2. 백엔드 재시작 (테이블 자동 생성)
uvicorn main:app --reload

# 3. 프론트엔드에서 새로 회원가입 필요
```

### 프로덕션 환경 (필요 시)

프로덕션에 이미 사용자가 있다면, 비밀번호 재설정 요청:

```python
# 옵션 1: 모든 사용자에게 비밀번호 재설정 요청
# - 비밀번호 재설정 이메일 발송
# - 임시 비밀번호 제공 후 변경 요구

# 옵션 2: 점진적 마이그레이션 (복잡)
# - 로그인 시 평문 확인 후 해싱된 비밀번호로 업데이트
# - 한계: 로그인하지 않는 사용자는 마이그레이션 안 됨
```

---

## ✅ 테스트 방법

### 1. 새 회원가입 테스트

```bash
# 백엔드 실행
cd apps/backend
uvicorn main:app --reload

# Swagger UI에서 테스트
open http://localhost:8000/docs

# POST /auth/signup
{
  "email": "test@example.com",
  "username": "testuser",
  "password": "password123"
}
```

**데이터베이스 확인**:
```sql
SELECT id, email, username, hashed_password FROM profile;
-- hashed_password가 "$2b$12$..." 형식으로 시작하면 bcrypt 해싱 성공
```

### 2. 로그인 테스트

```bash
# POST /auth/token
{
  "username": "test@example.com",  # OAuth2 form_data는 username 필드 사용
  "password": "password123"
}

# 응답
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 3. 잘못된 비밀번호 테스트

```bash
# POST /auth/token
{
  "username": "test@example.com",
  "password": "wrongpassword"
}

# 응답: 401 Unauthorized
{
  "detail": "Incorrect email or password"
}
```

---

## 🔐 bcrypt 해시 예시

```python
# 입력: "password123"
# bcrypt 해시: "$2b$12$KIXxJ3V7Z9vQ1Z7Z9vQ1Z.ABC123..."

# 특징:
# - $2b$: bcrypt 알고리즘
# - 12: cost factor (2^12 = 4096 rounds)
# - 다음 22자: salt
# - 나머지: 실제 해시
```

**같은 비밀번호도 매번 다른 해시 생성** (salt 랜덤)
```python
hash1 = get_password_hash("password123")
# "$2b$12$ABC..."

hash2 = get_password_hash("password123")
# "$2b$12$XYZ..."  # 다름!

# 하지만 둘 다 verify_password("password123", hash)는 True
```

---

## 📝 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `apps/backend/auth/utils.py` | 평문 비교/저장 → bcrypt 검증/해싱 |
| `apps/backend/setup.py` | ✅ 이미 passlib[bcrypt] 포함됨 |
| `apps/backend/auth/router.py` | ✅ 이미 get_password_hash 사용 중 |

---

## 🚀 다음 단계

1. ✅ **비밀번호 해싱 완료**
2. ⏭️ **데이터베이스 리셋** (개발 환경)
3. ⏭️ **새 회원가입 테스트**
4. ⏭️ **로그인 테스트**

---

**작성**: Claude Code
**날짜**: 2025-11-06
