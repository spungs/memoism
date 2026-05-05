# Memoism 개선 태스크

## 1. Vercel 라우트 성능 느림 ✅
- **현상**: 배포 후 메뉴 이동만 해도 느린 응답
- **완료 내용**:
  - `vercel.json` 추가 — `"regions": ["sin1"]`으로 Supabase(싱가포르)와 리전 일치, DB 레이턴시 대폭 감소
  - `loading.tsx` 4개 추가 (홈, 일기 목록, 캐릭터, 상점) — 내비게이션 즉시 스켈레톤 표시, 체감 속도 개선
  - `globals.css`에 `.skeleton` + `@keyframes skeleton-pulse` 추가
- **잔여**: 미들웨어 이중 JWT 검증 제거 (선택, 소폭 개선)
- **상태**: 완료

## 2. AI API 전환 (Ollama → 무료/저렴한 외부 API)
- **현상**: 배포 환경에서 localhost:11434 Ollama 사용 불가, AI 채팅 완전히 동작 안 함
- **파일**: `src/app/api/chat/route.ts`
- **할 일**: Gemini 또는 Groq API로 교체
- **상태**: 미착수

## 3. 채팅 입력창 스크롤 배경색 노출 버그 ✅
- **현상**: 채팅 입력 textarea 스크롤 시 다른 색의 배경이 보임
- **원인**: textarea `background: var(--bg)` vs 부모 `background: var(--surface-raised)` 불일치
- **파일**: `src/components/character/character-chat-view.tsx`
- **상태**: 완료

## 4. 채팅 데이터 24시간 제한 ✅
- **현상**: ChatMessage 테이블에 무한정 데이터 쌓임
- **스펙 결정**: 24시간 이내 메시지만 표시 + 오래된 메시지 자동 삭제
- **완료 내용**:
  - `src/app/(protected)/character/page.tsx` — 초기 메시지 로드 시 24h 필터 적용
  - `src/app/api/chat/route.ts` — AI 컨텍스트 히스토리 조회 시 24h 필터 적용
  - Supabase pg_cron — 매 시간 정각마다 24시간 이상 된 메시지 자동 삭제
- **상태**: 완료
