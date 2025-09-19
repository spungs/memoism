# Memoism 개발 서버 실행 가이드

## 🚀 빠른 시작 명령어 (프로젝트 루트에서 실행)

### 📍 현재 위치 확인
```bash
pwd
# 결과: /Users/sonkyoungho/esc/Memoism
```

---

## 🔧 백엔드 서버 시작

### 1. 기존 포트 사용 프로세스 정리 (필요시)
```bash
# 포트 8000 사용 중인 프로세스 확인
lsof -ti:8000

# 포트 8000 사용 프로세스 종료
lsof -ti:8000 | xargs kill -9
```

### 2. 백엔드 서버 실행
```bash
# 백엔드 디렉터리로 이동 후 서버 시작 (localhost 사용)
cd apps/backend
PYTHONPATH=. /Users/sonkyoungho/esc/Memoism/.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# 또는 백그라운드 실행
cd apps/backend
PYTHONPATH=. /Users/sonkyoungho/esc/Memoism/.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
```

### 3. 백엔드 서버 확인
- **API 문서**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## 📱 Expo 개발 서버 시작

### 1. 모바일 앱 디렉터리로 이동 후 실행
```bash
# 새 터미널에서 실행
cd apps/mobile
npx expo start

# 캐시 정리 후 실행 (문제 발생시)
cd apps/mobile
npx expo start --clear

# 개발 빌드 모드 (권장)
cd apps/mobile
npx expo start --dev-client
```

### 2. 터널 모드 사용 (네트워크 문제시)
```bash
cd apps/mobile
npx expo start --tunnel
```

---

## 📲 iOS 시뮬레이터 시작

### 1. iOS 시뮬레이터 직접 실행
```bash
# iOS 시뮬레이터 열기
open -a Simulator

# 또는 Xcode 명령어 도구 사용
xcrun simctl list devices
xcrun simctl boot "iPhone 15 Pro"  # 원하는 디바이스 이름
```

### 2. Expo에서 iOS 시뮬레이터 실행
```bash
# Expo 서버 실행 중 상태에서
# 터미널에서 'i' 키 입력
# 또는 QR 코드 스캔
```

### 3. 원라이너 (프로젝트 루트에서)
```bash
cd apps/mobile && npx expo start --ios
```

---

## 🤖 Android 에뮬레이터 시작

### 1. Android 에뮬레이터 직접 실행
```bash
# Android Studio AVD Manager에서 시작
# 또는 명령어로 실행
emulator -list-avds
emulator -avd Pixel_7_API_34  # AVD 이름에 맞게 변경
```

### 2. Expo에서 Android 에뮬레이터 실행
```bash
# Expo 서버 실행 중 상태에서
# 터미널에서 'a' 키 입력
```

### 3. 원라이너 (프로젝트 루트에서)
```bash
# package.json에 정의된 스크립트 사용
npm run android --prefix apps/mobile
```

### ⚠️ Android 문제 해결 (현재 이슈)
```bash
# 캐시 정리
cd apps/mobile
rm -rf node_modules/.cache
rm -rf .expo
npx expo install --fix

# Expo Doctor 실행
npx expo doctor

# 새 Android AVD 생성 권장 (Android Studio에서)
```

---

## 🔄 전체 개발 환경 한번에 시작하기

### 스크립트 방식 (백그라운드 실행)
```bash
#!/bin/bash
# 프로젝트 루트에서 실행

echo "🔧 백엔드 서버 시작 중..."
cd apps/backend
PYTHONPATH=. python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

echo "📱 Expo 개발 서버 시작 중..."
cd ../mobile
npx expo start &
EXPO_PID=$!

echo "✅ 개발 서버들이 시작되었습니다!"
echo "백엔드: http://localhost:8000"
echo "Expo: QR 코드 스캔 또는 터미널에서 i/a 키 입력"
echo ""
echo "종료하려면 Ctrl+C를 누르세요"

# Ctrl+C 시 모든 프로세스 종료
trap "kill $BACKEND_PID $EXPO_PID" EXIT
wait
```

### 터미널 분할 실행 (tmux 사용)
```bash
# tmux 세션 생성
tmux new-session -d -s memoism

# 백엔드 실행 윈도우
tmux send-keys -t memoism "cd apps/backend && PYTHONPATH=. python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload" Enter

# 새 윈도우 생성 후 Expo 실행
tmux new-window -t memoism
tmux send-keys -t memoism "cd apps/mobile && npx expo start" Enter

# tmux 세션 연결
tmux attach-session -t memoism
```

---

## 📋 유용한 개발 명령어

### 로그 확인
```bash
# 백엔드 로그 (uvicorn 실행 중인 터미널에서 확인)
# Expo 로그 (expo start 실행 중인 터미널에서 확인)

# 디바이스 로그 (iOS)
xcrun simctl spawn booted log stream --predicate 'process == "Expo Go"'

# 디바이스 로그 (Android)
adb logcat | grep -i expo
```

### 캐시 정리
```bash
# Expo 캐시 정리
cd apps/mobile
npx expo start --clear

# Node.js 캐시 정리
npm cache clean --force

# 전체 정리 (node_modules 재설치)
cd apps/mobile
rm -rf node_modules
npm install
```

### 프로세스 종료
```bash
# 모든 Expo 프로세스 종료
pkill -f expo

# 모든 Node 프로세스 종료
pkill -f node

# 모든 Metro 프로세스 종료
pkill -f metro

# Python uvicorn 프로세스 종료
pkill -f uvicorn
```

---

## 🌐 현재 네트워크 설정

- **백엔드 서버**: http://localhost:8000
- **Expo Dev Server**: localhost 기반 (플랫폼별 자동 설정)
- **API 문서**: http://localhost:8000/docs
- **데이터베이스**: SQLite (apps/backend/database.db)

---

## ⚡ 빠른 참조

| 명령어                                                                                                                   | 설명 |
|------------------------------------------------------------------------------------------------------------------------|------|
| `PYTHONPATH=. /Users/sonkyoungho/esc/Memoism/.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload`| 백엔드 시작 |
| `npx expo start`                                                                                                       | Expo 시작 |
| `npx expo start --ios`                                                                                                 | iOS 시뮬레이터에서 앱 실행 |
| `npm run android`                                                                                                      | Android 에뮬레이터에서 앱 실행 |
| `lsof -ti:8000 \| xargs kill -9`                                                                                       | 포트 8000 정리 |
| `npx expo start --clear`                                                                                               | 캐시 정리 후 Expo 시작 |
| `curl -v http://localhost:8000/`                                                                                       | 접속 확인 |
| ifconfig                                                                                                               | grep -E "inet.*broadcast" | awk '{print $2}' | 현재 ip 확인, config.ts에서 ip 확인하기

---

*업데이트: 2025-09-19* 