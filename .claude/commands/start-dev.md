---
description: 개발 서버 시작 가이드 (백엔드 + 프론트엔드)
---

개발 환경을 시작합니다:

1. **백엔드 서버 실행**:
   ```bash
   cd apps/backend && uvicorn main:app --reload --port 8000
   ```

2. **프론트엔드 실행** (별도 터미널):
   ```bash
   cd apps/mobile && npx expo start
   ```

3. **데이터베이스 확인**:
   - PostgreSQL이 실행 중인지 확인: `psql -U sonkyoungho -d memoism -c "SELECT version();"`

4. **API 문서 확인**:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

어떤 서버를 시작할까요?
