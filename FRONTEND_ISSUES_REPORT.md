# Frontend Issues Report - Memoism

> 생성일: 2025-11-05
> 분석 범위: apps/mobile/screens/ 전체 (8개 화면)
> 총 이슈: 24개 (Critical: 3, High: 2, Medium: 11, Low: 8)

---

## 🚨 Critical Issues (즉시 수정 필요)

### 1. DiaryEditScreen - 저장 버튼 중복 제출 방지 없음
**파일**: `apps/mobile/screens/DiaryEditScreen.tsx:108-110`
**문제**: 저장 버튼에 로딩 상태가 없어서 사용자가 여러 번 클릭 시 중복 제출 가능
**영향**: 동일한 일기가 여러 번 생성되거나 업데이트될 수 있음

**수정 코드**:
```typescript
<TouchableOpacity
  onPress={handleSave}
  style={styles.saveButton}
  disabled={createDiary.isPending || updateDiary.isPending}
>
  {(createDiary.isPending || updateDiary.isPending) ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={styles.saveButtonText}>저장</Text>
  )}
</TouchableOpacity>
```

---

### 2. ShareSelectScreen - 일괄 공유 진행률 표시 없음
**파일**: `apps/mobile/screens/ShareSelectScreen.tsx:30-42`
**문제**: 여러 일기를 순차적으로 공유할 때 진행률이 표시되지 않아 앱이 멈춘 것처럼 보임
**영향**: 10개 일기 공유 시 사용자는 얼마나 진행됐는지 알 수 없음

**수정 방법**:
```typescript
for (let i = 0; i < selectedDiaries.length; i++) {
  const diaryId = selectedDiaries[i];
  // 진행률 표시: `${i + 1}/${selectedDiaries.length} 공유 중...`
  await updateDiaryMutation.mutateAsync({
    id: diaryId,
    is_public: true
  });
}
```

---

### 3. ShareSelectScreen - 일괄 공유 에러 처리 미흡
**파일**: `apps/mobile/screens/ShareSelectScreen.tsx:30-42`
**문제**: 일괄 공유 중 하나가 실패해도 이미 공유된 일기는 롤백되지 않고, 어떤 일기가 공유됐는지 알 수 없음
**영향**: 부분 성공 시 사용자는 어떤 일기가 공유됐는지 확인 불가

**수정 방법**:
```typescript
const results = await Promise.allSettled(
  selectedDiaries.map(id =>
    updateDiaryMutation.mutateAsync({ id, is_public: true })
  )
);

const succeeded = results.filter(r => r.status === 'fulfilled').length;
const failed = results.filter(r => r.status === 'rejected').length;

Alert.alert(
  '공유 완료',
  `성공: ${succeeded}개, 실패: ${failed}개`
);
```

---

## ⚠️ High Priority Issues (높은 우선순위)

### 4. AuthLoginScreen - HTTP 응답 상태 체크 없음
**파일**: `apps/mobile/screens/AuthLoginScreen.tsx:84-102`
**문제**: 사용자 정보 fetch 시 `response.ok` 체크 없이 JSON 파싱하여 에러 시 앱 크래시
**수정**: `if (!userResponse.ok) throw new Error('Failed to fetch user')` 추가

---

### 5. DiaryEditScreen - 미저장 변경사항 경고 없음
**파일**: `apps/mobile/screens/DiaryEditScreen.tsx:104`
**문제**: 뒤로가기 버튼 클릭 시 작성 중인 내용이 저장되지 않고 사라짐
**수정**: 변경사항 추적 후 `Alert.alert` 로 확인 요청

---

## 📋 Medium Priority Issues (중간 우선순위)

### 6. AuthLoginScreen - navigate 대신 replace 사용 필요
**파일**: `apps/mobile/screens/AuthLoginScreen.tsx:111`
**문제**: 로그인 후 뒤로가기 버튼으로 로그인 화면 재진입 가능
**수정**: `navigation.replace('MainTabs')` 사용

---

### 7. AuthLoginScreen - 이메일 형식 검증 없음
**파일**: `apps/mobile/screens/AuthLoginScreen.tsx:69-76`
**문제**: "test" 같은 잘못된 이메일 형식도 입력 가능
**수정**: 이메일 정규식 검증 추가

---

### 8. AuthSignupScreen - 이메일 형식 검증 없음
**파일**: `apps/mobile/screens/AuthSignupScreen.tsx:13-24`
**문제**: 이메일 형식 검증 없음
**수정**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` 정규식으로 검증

---

### 9. AuthSignupScreen - 비밀번호 길이 검증 없음
**파일**: `apps/mobile/screens/AuthSignupScreen.tsx:21-24`
**문제**: 플레이스홀더에 "8자 이상"이라고 표시되지만 실제 검증 없음
**수정**: `if (password.length < 8)` 체크 추가

---

### 10. AuthSignupScreen - 사용자명 형식 검증 없음
**파일**: `apps/mobile/screens/AuthSignupScreen.tsx:17-20`
**문제**: "3-20자, 영문/숫자/_ 가능" 표시되지만 검증 없음
**수정**: `/^[a-zA-Z0-9_]{3,20}$/` 정규식으로 검증

---

### 11. DiaryListScreen - Pull-to-Refresh 기능 없음
**파일**: `apps/mobile/screens/DiaryListScreen.tsx:89-145`
**문제**: 일기 목록 새로고침을 위해 앱 재시작 필요
**수정**: ShareFeedScreen 처럼 RefreshControl 추가

---

### 12. DiaryListScreen - 에러 시 재시도 버튼 없음
**파일**: `apps/mobile/screens/DiaryListScreen.tsx:64-68`
**문제**: 에러 발생 시 재시도 방법이 없음
**수정**: "다시 시도" 버튼 추가

---

### 13. DiaryEditScreen - 카메라 권한 거부 시 설정 안내 없음
**파일**: `apps/mobile/screens/DiaryEditScreen.tsx:48-52`
**문제**: 권한 거부 후 다시 요청하는 방법을 모름
**수정**: Alert에 "설정으로 이동" 버튼 추가 (`Linking.openSettings()`)

---

### 14. ShareSelectScreen - 공유 버튼 로딩 상태 없음
**파일**: `apps/mobile/screens/ShareSelectScreen.tsx:98-106`
**문제**: 공유 중에도 버튼 클릭 가능
**수정**: `disabled={selectedDiaries.length === 0 || updateDiaryMutation.isPending}`

---

### 15. SettingsScreen - AsyncStorage 비동기 작업 미완료
**파일**: `apps/mobile/screens/SettingsScreen.tsx:73-82`
**문제**: `AsyncStorage.removeItem` 완료 전에 로그아웃 가능
**수정**: `await Promise.all([...])` 로 모든 작업 대기

---

### 16. SettingsScreen - 저장 버튼 로딩 인디케이터 없음
**파일**: `apps/mobile/screens/SettingsScreen.tsx:261`
**문제**: 저장 중 상태가 시각적으로 명확하지 않음
**수정**: ActivityIndicator 추가

---

## 🔧 Low Priority Issues (낮은 우선순위)

### 17. AuthLoginScreen - API Hook 대신 fetch 직접 사용
**파일**: `apps/mobile/screens/AuthLoginScreen.tsx:84-90`
**문제**: `useCurrentUser` hook이 있는데 직접 fetch 사용
**수정**: 일관성을 위해 hook 사용

---

### 18. DiaryListScreen - 로딩 상태가 텍스트로만 표시
**파일**: `apps/mobile/screens/DiaryListScreen.tsx:60`
**문제**: "로딩 중..." 텍스트만 표시
**수정**: `<ActivityIndicator size="large" />` 사용

---

### 19. DiaryDetailScreen - 이미지 확대/축소 기능 없음
**파일**: `apps/mobile/screens/DiaryDetailScreen.tsx:82-96`
**문제**: 이미지를 크게 볼 수 없음
**수정**: `react-native-image-viewing` 라이브러리 사용

---

### 20. DiaryDetailScreen - 로딩 상태가 텍스트로만 표시
**파일**: `apps/mobile/screens/DiaryDetailScreen.tsx:54`
**문제**: "로딩 중..." 텍스트만 표시
**수정**: ActivityIndicator 사용

---

### 21. DiaryEditScreen - 불필요한 API 호출
**파일**: `apps/mobile/screens/DiaryEditScreen.tsx:29`
**문제**: 새 일기 작성 시에도 빈 ID로 API 호출
**수정**: `enabled: !!diaryId` 옵션 추가

---

### 22. ShareFeedScreen - 과도한 Alert 사용
**파일**: `apps/mobile/screens/ShareFeedScreen.tsx:86-96`
**문제**: 팔로우/언팔로우마다 Alert 표시로 사용성 저하
**수정**: Toast 알림으로 변경

---

### 23. ShareFeedScreen - 댓글 실패 시 입력창 초기화 안됨
**파일**: `apps/mobile/screens/ShareFeedScreen.tsx:107-117`
**문제**: 댓글 제출 실패 시 입력 내용이 남아있음
**수정**: 에러 시 재시도 옵션 제공

---

### 24. ShareSelectScreen - 전체 일기 fetch 후 필터링
**파일**: `apps/mobile/screens/ShareSelectScreen.tsx:12`
**문제**: 백엔드에서 필터링하지 않고 클라이언트에서 필터링
**수정**: API에 `is_public=false` 파라미터 추가

---

## 📊 통계 요약

### 심각도별 분포
- **Critical**: 3개 (12.5%)
- **High**: 2개 (8.3%)
- **Medium**: 11개 (45.8%)
- **Low**: 8개 (33.3%)

### 카테고리별 분포
- **네비게이션**: 1개
- **사용자 액션**: 7개 (저장, 삭제, 취소, 공유)
- **상태 관리**: 8개 (로딩, 에러 처리)
- **UI/UX**: 10개 (인디케이터, 검증, 피드백)
- **데이터 플로우**: 4개 (API 호출, 훅 사용)

### 화면별 이슈 개수
1. **ShareSelectScreen**: 4개 (Critical 2개 포함)
2. **DiaryEditScreen**: 4개 (Critical 1개 포함)
3. **AuthLoginScreen**: 3개 (High 1개 포함)
4. **AuthSignupScreen**: 3개
5. **DiaryListScreen**: 3개
6. **ShareFeedScreen**: 3개
7. **SettingsScreen**: 3개
8. **DiaryDetailScreen**: 2개

---

## 🎯 우선 수정 권장 순서

### 1단계 (이번 주)
1. ✅ **DiaryEditScreen 저장 버튼** - 중복 제출 방지
2. ✅ **ShareSelectScreen 일괄 공유** - 진행률 & 에러 처리
3. ✅ **AuthLoginScreen 응답 체크** - 크래시 방지

### 2단계 (다음 주)
4. DiaryEditScreen 미저장 경고
5. AuthLoginScreen navigation.replace
6. 모든 화면 입력 검증 (이메일, 비밀번호, 사용자명)

### 3단계 (여유 있을 때)
7. Pull-to-Refresh 추가 (DiaryListScreen)
8. 로딩 인디케이터 개선
9. 이미지 뷰어 기능
10. Toast 알림 시스템 도입

---

## 📝 테스트 체크리스트

### 일기 작성/수정
- [ ] 저장 버튼 연속 클릭 시 중복 제출 방지 확인
- [ ] 뒤로가기 시 미저장 경고 확인
- [ ] 이미지 10장 제한 확인
- [ ] 카메라 권한 거부 후 설정 안내 확인

### 공유 기능
- [ ] 일괄 공유 진행률 표시 확인
- [ ] 일부 실패 시 성공/실패 개수 표시 확인
- [ ] 공유 중 버튼 비활성화 확인

### 인증
- [ ] 로그인 후 뒤로가기 동작 확인
- [ ] 잘못된 이메일 형식 검증 확인
- [ ] 짧은 비밀번호 검증 확인
- [ ] 잘못된 사용자명 형식 검증 확인

### 설정
- [ ] 로그아웃 전 AsyncStorage 정리 확인
- [ ] 프로필 수정 로딩 상태 확인

---

**마지막 업데이트**: 2025-11-05
**분석 도구**: Claude Code
**다음 리뷰 예정**: 수정 후 재테스트
