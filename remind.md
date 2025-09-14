# 🔔 Reminders (Updated: 2025-09-14)

## ✅ 완료된 작업 (Completed Work)

- **홈 화면 피드 개편**: 홈 화면에서 하루에 여러 일기를 시간순으로 볼 수 있도록 피드 방식으로 변경했습니다. (`.find()` -> `.filter()`, `ScrollView` -> `FlatList`)
- **Android 네이티브 오류 해결**: `DETECT_SCREEN_CAPTURE` 권한 누락으로 인한 앱 시작 충돌 문제를 `AndroidManifest.xml`에 권한을 추가하여 해결했습니다.
- **개발 환경 문제 해결**: `npm` 캐시 권한 문제 등 새로운 환경에서 발생했던 여러 빌드 오류들을 해결했습니다.
- **유실된 코드 복구**: `git restore`로 유실되었던 코드 변경사항을 복원했습니다.

---

## ❗ 해결 필요한 문제 (Issues to Solve)

- **보안 취약점**: `npm install` 실행 시 10개의 보안 취약점(critical 1, high 4, low 5)이 발견되었습니다. 빠른 시일 내에 `npm audit fix` 실행이 필요합니다.

---

## 🚀 다음 작업 계획 (Next Steps)

1.  **홈 화면 UI 개선**: 현재는 스크롤을 내려도 날짜가 바뀌는지 알기 어렵습니다. 일기 목록 사이에 날짜가 바뀔 때마다 '9월 15일'과 같은 날짜 구분선을 표시해주는 UI 개선이 필요합니다.
2.  **공유 피드 기능 구현**: 하단 탭의 '공유 피드'(`ShareFeedScreen.tsx`) 기능 구현을 시작합니다.
3.  **설정 화면 기능 구체화**: '설정'(`SettingsScreen.tsx`) 화면의 각 메뉴(알림 설정, 계정 관리 등)의 실제 기능을 구현합니다.
4.  **보안 취약점 해결**: `npm audit fix`를 실행하고, 혹시 모를 Breaking Change가 있는지 검토합니다.