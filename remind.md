# Memoism 개발 작업 중단 지점 (2025-05-24)

## 🎯 현재 상황 요약

### 작업 중이던 문제들
1. **닉네임 설정 문제** ✅ **해결 완료**
   - 설정 메뉴에서 데이터베이스와 다른 닉네임이 표시되던 문제
   - 로그인 시 사용자 정보가 authStore에 제대로 저장되지 않는 문제
   
2. **Android 에뮬레이터 에러** ❌ **미해결**
   - `DETECT_SCREEN_CAPTURE` 권한 거부 에러
   - `"main" has not been registered` Invariant Violation

---

## 📋 해결한 닉네임 문제 상세

### 문제 상황
- 로그인 후 설정 화면에서 이전 계정의 닉네임이 표시됨
- 실제 데이터베이스와 다른 정보가 클라이언트에 캐시됨

### 해결 방법
1. **백엔드 API 추가**
   ```typescript
   // apps/backend/auth/router.py
   @router.get("/me", response_model=UserResponse)
   async def get_current_user_info(current_user: Profile = Depends(get_current_user))
   ```

2. **프론트엔드 훅 추가**
   ```typescript
   // apps/mobile/api/authApi.ts
   export const useCurrentUser = () => { ... }
   ```

3. **로그인 시 사용자 정보 자동 가져오기**
   ```typescript
   // apps/mobile/screens/AuthLoginScreen.tsx
   // 로그인 성공 후 /auth/me 호출하여 사용자 정보 저장
   ```

4. **설정 화면에서 실시간 정보 사용**
   ```typescript
   // apps/mobile/screens/SettingsScreen.tsx
   const { data: currentUserData } = useCurrentUser();
   const displayUser = currentUserData || user;
   ```

---

## ❌ 미해결 Android 에뮬레이터 문제

### 에러 내용
```
ERROR: Exception in HostObject::get for prop 'NativeUnimoduleProxy': 
java.lang.SecurityException: Permission Denial: registerScreenCaptureObserver 
from pid=9856, uid=10212 requires android.permission.DETECT_SCREEN_CAPTURE

ERROR: Invariant Violation: "main" has not been registered. 
This can happen if:
* Metro (the local dev server) is run from the wrong folder
* A module failed to load due to an error and `AppRegistry.registerComponent` wasn't called
```

### 시도한 해결책
1. AndroidManifest.xml에서 DETECT_SCREEN_CAPTURE 권한 제거 (이미 제거됨)
2. Expo 캐시 완전 정리: `rm -rf node_modules/.cache && rm -rf .expo`
3. 의존성 재설치: `npx expo install --fix`
4. 새 세션으로 Expo 재시작

### 상태
- iOS 에뮬레이터는 정상 작동
- Android 에뮬레이터만 지속적으로 실패
- 권한 에러와 앱 등록 에러가 동시 발생

---

## 🔧 다음 작업 시 해야 할 일

### 1. 즉시 해결해야 할 문제들

#### Android 에뮬레이터 문제 해결
```bash
# 1. 기존 프로세스 완전 종료
pkill -f expo
pkill -f node
pkill -f metro

# 2. Android 에뮬레이터 재생성 시도
# Android Studio에서 새 AVD 생성

# 3. Expo SDK 버전 확인 및 호환성 점검
cd apps/mobile
npx expo doctor

# 4. 의존성 문제가 있다면 package.json 재검토
npm ls expo
```

#### 포트 충돌 해결
```bash
# 포트 8000 사용 중인 프로세스 확인 및 종료
lsof -ti:8000 | xargs kill -9

# 백엔드 서버 재시작
cd apps/backend
PYTHONPATH=. python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. 테스트해야 할 기능

#### 닉네임 시스템 검증
1. 로그인 → 설정 화면에서 올바른 닉네임 표시 확인
2. 닉네임 변경 → 즉시 반영 확인
3. 로그아웃 → 재로그인 → 변경된 닉네임 유지 확인

#### 기존 기능 회귀 테스트
1. 일기 작성/수정/삭제
2. 공유 피드에서 좋아요/댓글
3. 팔로우/언팔로우 기능
4. 스토리 필터링

### 3. 다음 단계 개발 계획

#### Phase 1: 안정성 개선
- [ ] Android 호환성 문제 완전 해결
- [ ] 에러 핸들링 강화
- [ ] 오프라인 동작 구현

#### Phase 2: AI 캐릭터 시스템
- [ ] OpenAI API 연동
- [ ] 캐릭터 채팅 인터페이스
- [ ] 일기 검색 기능

#### Phase 3: 구독/결제 시스템
- [ ] App Store/Play Store IAP 연동
- [ ] 구독 상태 관리
- [ ] 30일 무료 체험

---

## 📁 중요 파일 위치

### 수정된 파일들
```
apps/backend/auth/router.py         # /auth/me 엔드포인트 추가
apps/mobile/api/authApi.ts          # useCurrentUser 훅 추가
apps/mobile/screens/AuthLoginScreen.tsx  # 로그인 시 사용자 정보 가져오기
apps/mobile/screens/SettingsScreen.tsx   # 실시간 사용자 정보 표시
```

### 안드로이드 관련 파일들
```
apps/mobile/android/app/src/main/AndroidManifest.xml
apps/mobile/android/app/src/main/res/xml/network_security_config.xml
```

---

## 🚀 빠른 재시작 가이드

### 개발 환경 복구
```bash
# 1. 프로젝트 루트로 이동
cd /Users/sonkyoungho/esc/Memoism

# 2. 백엔드 서버 시작
cd apps/backend
PYTHONPATH=. python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &

# 3. 모바일 앱 시작 (새 터미널)
cd apps/mobile
npx expo start --clear

# 4. iOS에서 테스트 (Android 에러 해결 후)
# QR 코드 스캔 또는 'i' 키 누르기
```

### 현재 네트워크 설정
- **백엔드**: http://localhost:8000
- **프론트엔드**: localhost 기반 (플랫폼별 자동 설정)
- **데이터베이스**: 로컬 SQLite (apps/backend/database.db)

---

## 📝 참고사항

- **iOS**: 정상 작동 중, 모든 기능 테스트 가능
- **네트워크**: 모든 인터페이스(0.0.0.0) 바인딩으로 모바일에서 접근 가능
- **데이터베이스**: SQLModel로 자동 마이그레이션, 수동 스키마 변경 불필요
- **API 문서**: http://192.168.219.112:8000/docs 에서 확인 가능

---

*작업 중단: 2025-05-24*
*다음 작업 시 이 파일을 먼저 확인하세요.* 