#!/usr/bin/env python3
"""
기존 유저 정보 백업 스크립트

bcrypt 전환 전에 실행하여 평문 비밀번호를 백업합니다.
실행 방법:
    cd apps/backend
    python backup_users.py
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from sqlmodel import Session, create_engine, select
from models import Profile

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Error: DATABASE_URL not found in .env file")
    sys.exit(1)

def backup_users():
    """데이터베이스에서 유저 정보를 조회하고 백업 파일을 생성합니다."""
    try:
        # Create database engine
        engine = create_engine(DATABASE_URL)

        # Query all users
        with Session(engine) as session:
            users = session.exec(select(Profile)).all()

            if not users:
                print("ℹ️  데이터베이스에 유저가 없습니다.")
                return

            # Create backup markdown file
            backup_content = f"""# 테스트 계정 백업

> 생성일: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> 백업 사유: bcrypt 전환 전 평문 비밀번호 보관

⚠️ **보안 주의**: 이 파일은 평문 비밀번호를 포함하고 있습니다. 절대 Git에 커밋하지 마세요!

---

## 백업된 계정 ({len(users)}개)

"""

            for idx, user in enumerate(users, 1):
                backup_content += f"""### {idx}. {user.username}

```yaml
ID: {user.id}
Email: {user.email}
Username: {user.username}
Password: {user.hashed_password}  # ⚠️ 평문 (bcrypt 전환 전)
Created: {user.created_at.strftime('%Y-%m-%d %H:%M:%S')}
Character Age: {user.character_age}
Coins: {user.coins}
```

"""

            backup_content += """---

## 사용 방법

### 1. 데이터베이스 리셋 후
```bash
# PostgreSQL 리셋
psql -U postgres
DROP DATABASE memoism;
CREATE DATABASE memoism;
\\q

# 백엔드 재시작
cd apps/backend
uvicorn main:app --reload
```

### 2. 프론트엔드에서 회원가입
위 계정 정보를 참고하여 동일한 이메일/사용자명/비밀번호로 회원가입

### 3. 백업 파일 삭제
```bash
# 보안을 위해 사용 후 삭제 권장
rm TEST_ACCOUNTS_BACKUP.md
```

---

**⚠️ 중요**:
- 이 파일을 `.gitignore`에 추가하세요
- 사용 후 즉시 삭제하세요
- 프로덕션 환경에는 절대 사용하지 마세요
"""

            # Write to file
            output_file = "../../TEST_ACCOUNTS_BACKUP.md"
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(backup_content)

            print(f"✅ 백업 완료: {len(users)}개 계정")
            print(f"📄 파일: {output_file}")
            print()
            print("⚠️  보안 주의:")
            print("   1. TEST_ACCOUNTS_BACKUP.md를 .gitignore에 추가하세요")
            print("   2. 사용 후 즉시 삭제하세요")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        print()
        print("해결 방법:")
        print("1. PostgreSQL이 실행 중인지 확인")
        print("2. DATABASE_URL이 올바른지 확인 (.env 파일)")
        print("3. 데이터베이스가 존재하는지 확인")
        sys.exit(1)

if __name__ == "__main__":
    print("🔄 유저 정보 백업 중...")
    print()
    backup_users()
