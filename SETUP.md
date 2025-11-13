# Memoism 개발 환경 설정 가이드

이 문서는 Memoism 프로젝트를 로컬에서 개발하기 위한 환경 설정 가이드입니다.

---

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [저장소 클론](#저장소-클론)
3. [Backend 설정](#backend-설정)
4. [Mobile 설정](#mobile-설정)
5. [환경 변수 설정](#환경-변수-설정)
6. [데이터베이스 설정](#데이터베이스-설정)
7. [개발 서버 실행](#개발-서버-실행)
8. [테스트 실행](#테스트-실행)
9. [문제 해결](#문제-해결)

---

## 사전 요구사항

### 필수 설치 항목

#### Backend 개발
- **Python 3.12 이상** (권장: 3.14)
  ```bash
  python --version  # Python 3.12.0 이상 확인
  ```

- **PostgreSQL 14 이상**
  ```bash
  # macOS (Homebrew)
  brew install postgresql@16
  brew services start postgresql@16

  # Ubuntu/Debian
  sudo apt update
  sudo apt install postgresql postgresql-contrib
  sudo systemctl start postgresql

  # Windows
  # PostgreSQL 공식 사이트에서 설치: https://www.postgresql.org/download/windows/
  ```

#### Mobile 개발
- **Node.js 18 이상** (권장: LTS 버전)
  ```bash
  node --version  # v18.0.0 이상 확인
  npm --version   # 9.0.0 이상 확인
  ```

- **Expo CLI**
  ```bash
  npm install -g expo-cli
  ```

- **iOS 개발 (macOS만 해당)**
  - Xcode 14 이상
  - iOS Simulator

- **Android 개발**
  - Android Studio
  - Android SDK (API Level 33 이상)
  - Android Emulator

---

## 저장소 클론

```bash
# HTTPS
git clone https://github.com/your-org/Memoism.git

# SSH (권장)
git clone git@github.com:your-org/Memoism.git

cd Memoism
```

---

## Backend 설정

### 1. 가상 환경 생성 및 활성화

```bash
cd apps/backend

# 가상 환경 생성
python -m venv .venv

# 가상 환경 활성화
# macOS/Linux
source .venv/bin/activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (CMD)
.venv\Scripts\activate.bat
```

### 2. 의존성 설치

```bash
# 가상 환경이 활성화된 상태에서
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. 환경 변수 설정

```bash
# .env.example을 .env로 복사
cp .env.example .env

# .env 파일 편집
# 필수: DATABASE_URL, JWT_SECRET 설정
nano .env  # 또는 선호하는 에디터 사용
```

### 4. 데이터베이스 초기화

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE memoism;
CREATE USER memoism_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE memoism TO memoism_user;
\q

# 테이블 생성 (SQLModel을 통해 자동 생성)
# FastAPI 서버를 처음 실행하면 자동으로 테이블이 생성됩니다
```

---

## Mobile 설정

### 1. 의존성 설치

```bash
cd apps/mobile
npm install
```

### 2. 환경 변수 설정

```bash
# .env.example을 .env로 복사
cp .env.example .env

# .env 파일 편집
# API_URL을 로컬 백엔드 주소로 설정
nano .env
```

**iOS Simulator용 설정:**
```bash
# .env
API_URL=http://localhost:8000
```

**Android Emulator용 설정:**
```bash
# .env
API_URL=http://10.0.2.2:8000  # Android Emulator의 localhost
```

**실제 기기용 설정:**
```bash
# .env
API_URL=http://192.168.x.x:8000  # 로컬 네트워크 IP 주소
```

### 3. Expo 프로젝트 준비

```bash
# Expo 개발 서버 시작 (처음 실행)
npm run start
```

---

## 환경 변수 설정

### Backend (.env)

```bash
# ========================================
# ENVIRONMENT
# ========================================
ENVIRONMENT=development

# ========================================
# DATABASE (PostgreSQL)
# ========================================
DATABASE_URL=postgresql+psycopg://memoism_user:your_password@localhost:5432/memoism

# ========================================
# JWT
# ========================================
# 강력한 시크릿 키 생성:
# openssl rand -hex 32
JWT_SECRET=your-generated-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30

# ========================================
# CORS
# ========================================
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
```

### Mobile (.env)

```bash
# ========================================
# API CONFIGURATION
# ========================================
API_URL=http://localhost:8000

# ========================================
# ENVIRONMENT
# ========================================
ENVIRONMENT=development
```

---

## 데이터베이스 설정

### PostgreSQL 데이터베이스 생성

```bash
# PostgreSQL 시작 확인
pg_isready

# psql 접속
psql -U postgres

# 데이터베이스 및 사용자 생성
CREATE DATABASE memoism;
CREATE USER memoism_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE memoism TO memoism_user;

# PostgreSQL 15+ 추가 권한 설정
\c memoism
GRANT ALL ON SCHEMA public TO memoism_user;

# 종료
\q
```

### 연결 확인

```bash
# 연결 테스트
psql -U memoism_user -d memoism -h localhost

# 성공하면 프롬프트가 나타남
memoism=>
```

---

## 개발 서버 실행

### Backend 서버

```bash
cd apps/backend

# 가상 환경 활성화 (이미 활성화되지 않은 경우)
source .venv/bin/activate

# 개발 서버 실행
PYTHONPATH=. uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload

# 서버 실행 확인
# 브라우저에서 http://localhost:8000 접속
# API 문서: http://localhost:8000/docs
```

### Mobile 앱

```bash
cd apps/mobile

# Expo 개발 서버 실행
npm run start

# iOS Simulator 실행
npm run ios

# Android Emulator 실행
npm run android

# 캐시 클리어 후 재시작
npm run start -- --clear
```

---

## 테스트 실행

### Backend 테스트

```bash
cd apps/backend

# 모든 테스트 실행
pytest tests/ -v

# 커버리지 포함 테스트
pytest tests/ --cov=src --cov-report=html

# 특정 테스트 파일 실행
pytest tests/auth/test_auth.py -v

# 특정 테스트 케이스 실행
pytest tests/auth/test_auth.py::TestAuthentication::test_signup_success -v
```

### Mobile 테스트

```bash
cd apps/mobile

# 모든 테스트 실행
npm test

# 커버리지 포함 테스트
npm run test:coverage

# Watch 모드
npm test -- --watch

# 특정 테스트 파일 실행
npm test -- src/api/__tests__/authApi.test.tsx
```

---

## 문제 해결

### Backend 문제

#### 1. PostgreSQL 연결 실패

**문제:** `could not connect to server: Connection refused`

**해결:**
```bash
# PostgreSQL 실행 확인
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# PostgreSQL 시작
brew services start postgresql@16  # macOS
sudo systemctl start postgresql  # Linux
```

#### 2. 포트 충돌 (8000번 포트)

**문제:** `Address already in use`

**해결:**
```bash
# 8000번 포트 사용 프로세스 찾기
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# 프로세스 종료
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# 또는 다른 포트 사용
uvicorn src.main:app --port 8001 --reload
```

#### 3. 의존성 설치 오류

**문제:** `ERROR: Could not find a version that satisfies the requirement`

**해결:**
```bash
# pip 업그레이드
pip install --upgrade pip

# 캐시 삭제 후 재설치
pip cache purge
pip install -r requirements.txt --no-cache-dir
```

### Mobile 문제

#### 1. Expo 연결 실패

**문제:** `Unable to resolve module`

**해결:**
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# 캐시 클리어
npm run start -- --clear

# Watchman 캐시 클리어 (macOS)
watchman watch-del-all
```

#### 2. iOS Simulator 오류

**문제:** `Command PhaseScriptExecution failed`

**해결:**
```bash
# CocoaPods 재설치 (iOS)
cd ios
pod deintegrate
pod install
cd ..

# Xcode 캐시 클리어
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

#### 3. Android Emulator 연결 실패

**문제:** `adb: no devices/emulators found`

**해결:**
```bash
# ADB 재시작
adb kill-server
adb start-server

# 연결된 기기 확인
adb devices

# Emulator 재시작
```

#### 4. API 연결 실패

**문제:** `Network request failed`

**해결:**
- **iOS Simulator:** `API_URL=http://localhost:8000`
- **Android Emulator:** `API_URL=http://10.0.2.2:8000`
- **실제 기기:** 컴퓨터와 기기가 같은 Wi-Fi에 연결되어 있는지 확인
  ```bash
  # 로컬 IP 확인
  ifconfig | grep "inet "  # macOS/Linux
  ipconfig  # Windows
  ```

---

## 추가 리소스

- **프로젝트 계획:** [plan.md](plan.md)
- **Claude Code 가이드:** [CLAUDE.md](CLAUDE.md)
- **프로젝트 README:** [README.md](README.md)
- **FastAPI 문서:** https://fastapi.tiangolo.com/
- **Expo 문서:** https://docs.expo.dev/
- **SQLModel 문서:** https://sqlmodel.tiangolo.com/
- **React Query 문서:** https://tanstack.com/query/latest

---

## 개발 워크플로우

### 새로운 기능 추가 (TDD 방식)

1. **plan.md**에서 다음 테스트 확인
2. **RED**: 실패하는 테스트 작성
   ```bash
   pytest tests/your_test.py -v  # 실패 확인
   ```
3. **GREEN**: 최소한의 코드로 테스트 통과
   ```bash
   pytest tests/your_test.py -v  # 통과 확인
   ```
4. **REFACTOR**: 코드 개선 (테스트 통과 유지)
5. **커밋**: 모든 테스트 통과 후
   ```bash
   pytest tests/ -v  # 전체 테스트
   git add .
   git commit -m "feat: 기능 설명 (Phase X.Y)"
   ```

---

## 팀 협업

### Git 브랜치 전략

```bash
# 최신 코드 가져오기
git checkout main
git pull origin main

# 새 기능 브랜치 생성
git checkout -b feature/your-feature-name

# 작업 후 커밋
git add .
git commit -m "feat: 기능 설명"

# 푸시
git push origin feature/your-feature-name

# Pull Request 생성
```

### 코드 리뷰 체크리스트

- [ ] 모든 테스트가 통과하는가?
- [ ] 테스트 커버리지가 80% 이상인가?
- [ ] TDD Red → Green → Refactor 사이클을 따랐는가?
- [ ] 커밋 메시지가 명확한가?
- [ ] 환경 변수가 하드코딩되지 않았는가?
- [ ] API 문서가 자동 생성되는가?

---

## 도움이 필요하신가요?

- 이슈 트래커: [GitHub Issues](https://github.com/your-org/Memoism/issues)
- 프로젝트 Wiki: [GitHub Wiki](https://github.com/your-org/Memoism/wiki)
- 팀 슬랙: #memoism-dev 채널

**Happy Coding! 🚀**
