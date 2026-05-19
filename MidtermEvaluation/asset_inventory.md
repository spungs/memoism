# Memoism 자산 인벤토리 — 베타 기획서 대비

- **작성일**: 2026-05-17
- **범위**: Memoism 리포지토리 전체 (`src/`, `prisma/`, `next.config.ts`, `package.json`, 인프라 설정)
- **기준 기획서**: `Planning/ideate_decision_combined.html` (IDEATE + DECISION 통합본, 베타 출시용 1차 합의)
- **참고**: `MidtermEvaluation/first_qa_planner.md` (1차 QA·기획 평가), `Milestone/first_milestone.md`, `task.md`
- **기존 코드 기준**: `main` 브랜치, 최근 커밋 `218a0154 fix: remove white border from PWA home-screen icon`

---

## ① 요약 (Executive Summary)

### 전체 자산 분포

총 자산 **52개** 식별 (DB 모델, 도메인 모듈, API/페이지 라우트, UI 컴포넌트 그룹, 외부 의존성, 인프라 결정 합산).

| 분류 | 개수 | 비중 |
|---|---:|---:|
| ✅ **KEEP** (그대로 활용) | 18 | 35% |
| 🔄 **MIGRATE** (마이그레이션 후 활용) | 13 | 25% |
| 🆕 **NEW** (신규 작성) | 14 | 27% |
| ❌ **DROP** (폐기) | 7 | 13% |

### Top 5 발견 (가장 영향 큰 변경)

1. **캐릭터 정체성 전환 (재포지셔닝, 부분 폐기)** — 코인·구독·스킨·외형 커스텀·성장 게임화는 폐기(기획서 ⑨ 데이터 모델 `~Character, CoinTransaction, CharacterOutfitOwned~`, ⑬ D16). `Character` row 자체는 **친구 페르소나**로 유지(Basic+ RAG 채팅 인터페이스용). 기존 `growth.ts`·`skin-actions.ts`·`character-companion.tsx`·`character-card.tsx`·캐릭터 SVG 변형 3종·상점 페이지·코인 잔액 UI 등 *상당량의 UI/도메인 코드* 가 폐기되거나 대폭 단순화됨.
2. **Diary 데이터 모델 전면 마이그레이션 (1:1 → 1:N + 7개 신규 필드)** — `Diary.images: String[]` 단일 이미지 → `DiaryImage` 1:N (EXIF 필드 포함). `previousContent`/`previousChangedAt`/`source`/`aiGenerationVersion`/`updatedAt`/`contentEditedAt` 신규 필드(기획서 ⑨, ⑪ E2 백업 스왑). 기존 단일 이미지 데이터 변환 스크립트 필요. `Diary.location: Json?` 은 베타에서 `DiaryImage.exifLat/Lng`에 흡수되며 deprecated 처리.
3. **AI 인프라 완전 교체 (Ollama → Gemini 2.5 Flash + pgvector 임베딩)** — 기존 `/api/chat`은 Ollama 의존(`OLLAMA_URL`)이라 배포 환경 미작동(`task.md §2`). 베타 척추인 **F1 자동 본문 생성**(모드 A/B/C 멀티모달)과 **F3 RAG 검색**(`text-embedding-004` + pgvector) 둘 다 *신규*. 기존 채팅 라우트는 인증·DB 조회·시스템 프롬프트 골격은 재사용하되 본문 로직은 모두 새로 작성.
4. **이미지 스토리지 이관 (Local FS → Supabase Storage Private + Signed URL)** — 기존 `src/lib/storage/index.ts`는 `public/uploads/<userId>/`에 `writeFile`하므로 Vercel serverless에서 동작 불가(QA `H-2`). 베타는 사진 5장 + 1024px 자동 압축 + Signed URL 필수(기획서 ⑪ 프라이버시, ⑧ In-Scope). `(file, ownerId) → URL` 인터페이스는 보존하므로 콜사이트 변경 최소.
5. **UsageLog · UserPersona · DiaryEmbedding 3개 신규 엔티티 + 결제·푸시·동의·트라이얼 정책 변경** — 기존 30일 캐릭터 트라이얼 → 베타 3일 트라이얼(기획서 ⑬ D22). 코인·스킨 결제 → Basic ₩2,900 단일 구독(D18, D21). 22:00 KST 공감형 리마인드 푸시(F는 미정의지만 ⑧ In-Scope). 외부 LLM 동의 체크박스(⑪ 프라이버시). 모두 *신규 인프라*.

### 전체 작업량 견적

- **마이그레이션 13건**: S=4, M=5, L=3, XL=1 → 약 **22~28 인일**
- **신규 작성 14건**: S=2, M=4, L=5, XL=3 → 약 **40~55 인일**
- **폐기/정리 7건**: 평균 S → 약 **3~5 인일**
- **합계 (1인 풀타임 기준)**: 약 **65~88 인일** (≈ 13~18주). 위험 보정 1.3배 적용 시 **85~115 인일** (≈ 17~23주, 약 4~5개월). Phase 병렬화 시 단축 가능.

### 가장 큰 위험 3개

1. **데이터 마이그레이션 손실 (Diary.images → DiaryImage)** — 기존 사용자의 단일 이미지 URL이 새 1:N 테이블로 옮겨질 때 EXIF 부재(이미 업로드된 파일에서 EXIF 추출 불가) + 동시에 Local FS → Supabase Storage 파일 이전까지 겹치면 손실 가능. **완화**: 마이그레이션 전 dry-run + 백업 + EXIF 부재 시 NULL 허용(`B-1.smart` 정책 그대로 적용).
2. **외부 LLM 의존 및 비용 통제** — Gemini API 키 발급·결제 수단 등록·할당량 모니터링이 코드 외부 의존이라 작업 차단 가능. abuse cap(일 3/10회 + 재생성 5회) 누락 시 비용 폭주. **완화**: 1주차에 키 발급·결제 등록을 *모든 코드 작업보다 앞서* 완료. `UsageLog` 모델은 Gemini 통합과 같은 PR에 포함.
3. **캐릭터 정체성 전환 시 기존 사용자/데이터 영향** — 베타 시점에 사용자가 존재한다면 캐릭터 코인 잔액·스킨 보유 데이터·구독 상태(TRIAL/ACTIVE)가 의미를 잃음. **완화**: 베타 출시 = 데이터 리셋 가정(테스트 데이터만 존재한다고 가정). 실제 사용자가 있다면 마이그레이션 안내 + 데이터 export 1회 제공.

---

## ② 4분류 매핑 표 (전체)

| # | 자산명 | 경로 | 분류 | 근거 (기획서 §) | 공수 | 위험 |
|---|---|---|---|---|---|---|
| **DB 모델 (8)** | | | | | | |
| 1 | User | `prisma/schema.prisma:41` | 🔄 MIGRATE | ⑨: `trialEndDate`, `externalLLMConsent` 2 필드 추가. 트라이얼은 캐릭터→유저로 의미 이동 | S | 낮 |
| 2 | Diary | `prisma/schema.prisma:56` | 🔄 MIGRATE | ⑨: 다중 신규 필드 (`previousContent`, `previousChangedAt`, `source`, `aiGenerationVersion`, `updatedAt`, `contentEditedAt`). `images:String[]` 제거, `location:Json?` deprecated | L | 중 |
| 3 | DiaryImage | (신규) | 🆕 NEW | ⑨: 1:N 분리, EXIF 보존 (`exifTakenAt`, `exifLat`, `exifLng`, `orderIndex`) | M | 중 |
| 4 | DiaryEmbedding | (신규) | 🆕 NEW | ⑨: pgvector(768), F3 RAG | M | 중 (pgvector 확장 활성화) |
| 5 | UsageLog | (신규) | 🆕 NEW | ⑨, ⑪ 3중 abuse cap: 일일 AI 호출 cap 계산용 | S | 낮 |
| 6 | UserPersona | (신규) | 🆕 NEW | ⑨, ⑬ D14: 베타엔 기본값 row만, UI 미노출 | S | 낮 |
| 7 | ChatMessage | `prisma/schema.prisma:111` | 🔄 MIGRATE | ⑨: 캐릭터 RAG 채팅 인터페이스로 재활용. 24h 보존 정책 유지 | S | 낮 |
| 8 | Character | `prisma/schema.prisma:82` | 🔄 MIGRATE | ⑨, ⑬ D16: "친구" 페르소나로 재포지셔닝. `coinBalance`/`age`/`isAsleep`/구독 필드는 의미 상실 → row는 유지, 필드는 일부 사용 중지 | M | 중 (기존 row의 의미 변화) |
| 9 | CoinTransaction | `prisma/schema.prisma:180` | ❌ DROP | ⑨: 베타 미사용. 코인 정체성 제거 | S | 중 (cascade 시 데이터 손실) |
| 10 | CoinPackage | `prisma/schema.prisma:193` | ❌ DROP | ⑨: 베타 미사용 | S | 낮 |
| 11 | CharacterOutfit | `prisma/schema.prisma:131` | ❌ DROP | ⑨, ⑧ Out-of-Scope "캐릭터 스킨·외형 커스텀" | S | 낮 |
| 12 | CharacterOutfitOwned | `prisma/schema.prisma:145` | ❌ DROP | 동일 | S | 낮 |
| 13 | CharacterEquipped | `prisma/schema.prisma:161` | ❌ DROP | 동일 | S | 낮 |
| 14 | SubscriptionStatus (enum) | `prisma/schema.prisma:30` | 🔄 MIGRATE | ⑦ 베타: Free / Basic 2-tier. `NONE/TRIAL/ACTIVE/EXPIRED` 그대로 쓰되 의미 재정의 (TRIAL = 가입 시 캐릭터 3일 트라이얼, ACTIVE = Basic 구독) | S | 낮 |
| 15 | MessageRole (enum) | `prisma/schema.prisma:24` | ✅ KEEP | 변경 없음 | - | - |
| **도메인 모듈 (6)** | | | | | | |
| 16 | `src/lib/auth/*` (세션·액션·스키마·해시) | `src/lib/auth/` | ✅ KEEP | 인증 인프라는 베타 그대로 사용. JWT 쿠키 + 미들웨어 패턴 유지 | - | - |
| 17 | `signupAction` (auth/actions.ts) | `src/lib/auth/actions.ts:16` | 🔄 MIGRATE | ⑨, ⑪: 가입 시 `externalLLMConsent` 체크박스 필수, `UserPersona`/`UsageLog` row 생성, 캐릭터 트라이얼 3일 (현재 30일), `trialEndDate`를 User로 이동 | S | 낮 |
| 18 | `src/lib/diary/actions.ts` (CRUD) | `src/lib/diary/actions.ts` | 🔄 MIGRATE | ⑨, ⑪ E1/E2: 단일 이미지 → 다중 이미지(최대 5장), 백업 스왑(content↔previousContent), `source` 필드 세팅, `imageMode` 의미 확장 | L | 중 |
| 19 | `src/lib/diary/queries.ts` | `src/lib/diary/queries.ts` | 🔄 MIGRATE | DiaryImage 1:N 조인 추가, EXIF 헤더용 select | S | 낮 |
| 20 | `src/lib/diary/schemas.ts` | `src/lib/diary/schemas.ts` | 🔄 MIGRATE | 다중 이미지 스키마, `source` enum 추가. `mood`/`location` 베타 미사용 (DB 잔존, UI 제거) | S | 낮 |
| 21 | `src/lib/storage/index.ts` (Local FS) | `src/lib/storage/index.ts` | 🔄 MIGRATE | ⑪ 프라이버시 Supabase Storage Private + Signed URL. ⑦/⑧ 1024px 자동 압축. 인터페이스 `(file, ownerId)→URL` 유지 | M | 중 (외부 의존) |
| 22 | `src/lib/character/actions.ts` (이름 변경) | `src/lib/character/actions.ts` | ✅ KEEP | 캐릭터 이름은 친구 정체성에서도 유효 | - | - |
| 23 | `src/lib/character/utils.ts` (트라이얼) | `src/lib/character/utils.ts` | 🔄 MIGRATE | TRIAL_DURATION_DAYS 30 → 3 (D22). `shouldBeAsleep` → 친구 활성 여부로 의미 변경 | S | 낮 |
| 24 | `src/lib/character/growth.ts` (5단계 성장) | `src/lib/character/growth.ts` | ❌ DROP | ⑬ D16: 캐릭터 게임화 제거. 레벨·말풍선·진행바 모두 폐기 | S | 낮 |
| 25 | `src/lib/character/skins.ts` + `skin-actions.ts` | `src/lib/character/` | ❌ DROP | ⑧ Out-of-Scope "캐릭터 스킨·외형 커스텀" | S | 낮 |
| 26 | `src/lib/db.ts` (Prisma 싱글톤) | `src/lib/db.ts` | ✅ KEEP | 변경 없음 | - | - |
| 27 | `src/lib/utils.ts` (cn 유틸) | `src/lib/utils.ts` | ✅ KEEP | 변경 없음 | - | - |
| **신규 도메인 모듈 (6)** | | | | | | |
| 28 | `src/lib/ai/gemini.ts` | (신규) | 🆕 NEW | ④ F1, ⑩: Gemini 2.5 Flash 호출 래퍼 + 모드 A/B/C 시스템 프롬프트 + Zod 응답 검증 | L | 높 (외부 API) |
| 29 | `src/lib/ai/embedding.ts` | (신규) | 🆕 NEW | ④ F3, ⑩: text-embedding-004 호출 + pgvector insert | M | 중 |
| 30 | `src/lib/ai/rag.ts` (검색) | (신규) | 🆕 NEW | ④ F3: 자연어 → top-5 매칭. Basic+ 게이트 | L | 중 |
| 31 | `src/lib/ai/usage.ts` (cap 차감) | (신규) | 🆕 NEW | ⑪ 3중 abuse cap, ⑦ UI 정책 (일 3/10/100) | M | 중 |
| 32 | `src/lib/diary/auto-generate.ts` | (신규) | 🆕 NEW | ④ F1, F2, F9: 트리거 조건 + 모드 분기 + 검토 게이트용 임시 영역 | L | 중 |
| 33 | `src/lib/diary/exif.ts` | (신규) | 🆕 NEW | ④ F6, ⑪ B-1.smart: EXIF 추출 + 같은날 검증 + 자정 걸침 휴리스틱 | M | 중 |
| 34 | `src/lib/diary/image-compress.ts` | (신규) | 🆕 NEW | ⑪ 3중 abuse cap, ⑦ 1024px 자동 압축. 클라이언트 측 sharp/`browser-image-compression` | S | 낮 |
| 35 | `src/lib/billing/*` (Basic 구독) | (신규) | 🆕 NEW | ⑦ Basic ₩2,900. PG사 미정 (포트원/토스 PG) | XL | 높 (PG 통합) |
| 36 | `src/lib/push/notification.ts` | (신규) | 🆕 NEW | ⑧ In-Scope 22:00 KST 공감형 리마인드 푸시 (1종). PWA Web Push | M | 중 |
| 37 | `src/lib/account/export.ts` + `delete.ts` | (신규) | 🆕 NEW | ⑧ In-Scope 데이터 내보내기(JSON), 계정 탈퇴(Cascade) | S | 낮 |
| **API 라우트 (3)** | | | | | | |
| 38 | `/api/chat` (Ollama) | `src/app/api/chat/route.ts` | 🔄 MIGRATE | ④ F3 RAG + ⑨ Basic+ 게이트. 기존 인증·DB 조회 골격 재사용, LLM/메시지 빌드는 신규 모듈 호출로 교체 | M | 중 |
| 39 | `/api/diaries` (GET 목록) | `src/app/api/diaries/route.ts` | ✅ KEEP | 변경 거의 없음. select에 `images` 1:N 조인만 추가 | S | 낮 |
| 40 | `/api/diaries/auto-generate` (신규) | (신규) | 🆕 NEW | ④ F1, F2: 사진 업로드 + EXIF 추출 + LLM 호출 + 임시 저장 → 검토 게이트로 응답 | L | 높 |
| 41 | `/api/diaries/[id]/regenerate` (신규) | (신규) | 🆕 NEW | ⑪ E2 백업 스왑, 재생성 cap 5회 | M | 중 |
| 42 | `/api/diaries/search` (신규) | (신규) | 🆕 NEW | ④ F3: 무료=키워드, Basic+=RAG. 결과 사진 그리드 응답 | M | 중 |
| **페이지 라우트 (10)** | | | | | | |
| 43 | `/login`, `/signup` | `src/app/(auth)/` | 🔄 MIGRATE | ⑪ 외부 LLM 동의 체크박스 추가 (signup) | S | 낮 |
| 44 | `/` (홈) | `src/app/(protected)/page.tsx` | 🔄 MIGRATE | 캐릭터 중심 → AI 작성 진입 + 최근 일기 중심으로 재배치. 캐릭터 카드는 친구 페르소나로 축소 | M | 낮 |
| 45 | `/diary` (목록) | `src/app/(protected)/diary/page.tsx` | 🔄 MIGRATE | 검색 입력 추가, F7 결과 그리드 모드, F5/F6 EXIF 헤더 표기 | M | 낮 |
| 46 | `/diary/new` (새 일기) | `src/app/(protected)/diary/new/page.tsx` | 🔄 MIGRATE | "AI 정리" 탭 + 다중 사진 픽커 + F9 트리거 조건 + F2 검토 게이트로 진입 | L | 중 |
| 47 | `/diary/[id]` (상세) | `src/app/(protected)/diary/[id]/page.tsx` | 🔄 MIGRATE | F5 Fact/Story 분리, F6 EXIF 헤더, ✨ AI 마커, 다중 이미지 | M | 낮 |
| 48 | `/diary/[id]/edit` (수정) | `src/app/(protected)/diary/[id]/edit/page.tsx` | 🔄 MIGRATE | 다중 이미지, AI 재생성 버튼 (E1/E2/E5), cap UI | M | 중 |
| 49 | `/diary/review` (검토 게이트) | (신규) | 🆕 NEW | ④ F2: 생성 결과 미리보기 + 수정/승인/재생성 | M | 낮 |
| 50 | `/character` (대화) | `src/app/(protected)/character/page.tsx` | 🔄 MIGRATE | RAG 채팅 인터페이스로 단순화. 코인·트라이얼·구독 UI 제거, 친구 메시지 톤 | M | 낮 |
| 51 | `/character/shop` | `src/app/(protected)/character/shop/` | ❌ DROP | ⑧ Out-of-Scope. 스킨 카드·코인 잔액 UI 모두 제거 | S | 낮 |
| 52 | `/settings` | `src/app/(protected)/settings/page.tsx` | 🔄 MIGRATE | 구독 관리·데이터 내보내기·계정 탈퇴·동의 토글 추가. 캐릭터 이름 행 유지 | M | 낮 |
| 53 | `/design` | `src/app/(protected)/design/page.tsx` | ✅ KEEP (dev-only 게이트 권장) | 디자인 토큰 프리뷰. QA P2-6 dev-only 게이트만 권장 | - | - |
| **UI 컴포넌트 (10 그룹)** | | | | | | |
| 54 | `components/ui/*` (button, card, input, label, textarea, bottom-sheet, confirm-sheet) | `src/components/ui/` | ✅ KEEP | shadcn 베이스 프리미티브. 변경 없음 | - | - |
| 55 | `components/auth/auth-form.tsx` | `src/components/auth/auth-form.tsx` | 🔄 MIGRATE | signup 모드에 외부 LLM 동의 체크박스 + 카피 추가 | S | 낮 |
| 56 | `components/diary/diary-form.tsx` | `src/components/diary/diary-form.tsx` | 🔄 MIGRATE | 다중 사진 + AI 정리 진입 버튼 + F9 트리거 조건 비활성. mood·location UI 제거 | L | 중 |
| 57 | `components/diary/date-picker.tsx` | `src/components/diary/date-picker.tsx` | ✅ KEEP | 과거 일기 작성용 — ⑧ In-Scope 그대로 활용 | - | - |
| 58 | `components/diary/diary-card.tsx` + `diary-list.tsx` | `src/components/diary/` | 🔄 MIGRATE | 다중 이미지 썸네일, F6 EXIF 시간/장소 표기, ✨ AI 마커, mood 제거 | M | 낮 |
| 59 | `components/diary/diary-content.tsx` | `src/components/diary/diary-content.tsx` | 🔄 MIGRATE | F5 Fact/Story 영역 시각 분리 (옅은 배경색), AI 본문 마커 | S | 낮 |
| 60 | `components/diary/diary-detail-actions.tsx` | `src/components/diary/diary-detail-actions.tsx` | 🔄 MIGRATE | "AI로 다시 정리" 버튼 추가, 재생성 cap UI | S | 낮 |
| 61 | `components/diary/mood-picker.tsx` + `mood-badge.tsx` | `src/components/diary/` | ❌ DROP | ⑨ 베타 Diary 모델에서 mood 미언급. UI 제거 (DB 필드는 잔존 가능) | S | 낮 |
| 62 | `components/diary/review-gate.tsx` (신규) | (신규) | 🆕 NEW | ④ F2 검토 게이트 UI | L | 중 |
| 63 | `components/diary/image-grid.tsx` (신규) | (신규) | 🆕 NEW | ④ F7 검색 결과 사진 그리드 | M | 낮 |
| 64 | `components/character/character-chat-view.tsx` | `src/components/character/character-chat-view.tsx` | 🔄 MIGRATE | 코인·트라이얼·레벨/성장바 UI 제거, 친구 페르소나 헤더로 단순화. 채팅 UX는 유지 | M | 낮 |
| 65 | `components/character/character-card.tsx` | `src/components/character/character-card.tsx` | ❌ DROP | ⑬ D16 캐릭터 게임화 제거. 홈 화면의 캐릭터 중심 구조 재설계 | S | 낮 |
| 66 | `components/character/character-companion.tsx` (쓰다듬기 인터랙션) | `src/components/character/character-companion.tsx` | ❌ DROP | 동일 — 친구 페르소나에선 쓰다듬기/미세동작 의미 약함. 채팅에 흡수 | S | 낮 |
| 67 | `components/character/character-svg.tsx` + `skins/*` (chick/mochi/classic 3종) | `src/components/character/` | ❌ DROP | ⑧ Out-of-Scope "캐릭터 스킨·외형 커스텀". SVG 1종(기본)으로 단순화 또는 친구 아바타로 교체 | M | 낮 |
| 68 | `components/nav/bottom-nav.tsx` | `src/components/nav/bottom-nav.tsx` | 🔄 MIGRATE | 5탭(홈/일기/+ /캐릭터/설정) 구조 유지. "캐릭터" 라벨이 친구/RAG 의미로 변경됨 | S | 낮 |
| 69 | `components/settings/settings-view.tsx` | `src/components/settings/settings-view.tsx` | 🔄 MIGRATE | 구독 관리·데이터 내보내기·계정 탈퇴·동의 토글 행 추가 | M | 낮 |
| **외부 의존성 / 인프라 (8)** | | | | | | |
| 70 | Next.js 15 App Router + React 19 | `package.json` | ✅ KEEP | 변경 없음 | - | - |
| 71 | Prisma 6 + Postgres | `prisma/`, `src/lib/db.ts` | ✅ KEEP | + pgvector 확장 활성화 (Supabase에서 1-click) | S | 낮 |
| 72 | `@ducanh2912/next-pwa` | `next.config.ts` | ✅ KEEP | Web Push 추가 가능 | - | - |
| 73 | TanStack Query | `src/providers/query-provider.tsx` | ✅ KEEP | 변경 없음 | - | - |
| 74 | shadcn + Tailwind v4 + Base UI | `components.json`, `globals.css` | ✅ KEEP | 변경 없음 | - | - |
| 75 | jose (JWT) + bcryptjs | `src/lib/auth/` | ✅ KEEP | 변경 없음 | - | - |
| 76 | zod + react-hook-form | `package.json` | ✅ KEEP | 변경 없음 | - | - |
| 77 | Ollama (`OLLAMA_URL`) | `src/app/api/chat/route.ts:5` | ❌ DROP | ④ F1/F3: Gemini로 교체 | S | 낮 |
| 78 | `@google/genai` (또는 `@google/generative-ai`) | (신규) | 🆕 NEW | ④ F1: Gemini 2.5 Flash + text-embedding-004 | S | 중 |
| 79 | `@supabase/supabase-js` (Storage) | (신규) | 🆕 NEW | ⑪ 프라이버시. Signed URL 발급 | S | 중 |
| 80 | `exifr` (또는 `piexifjs`) | (신규) | 🆕 NEW | ⑪ B-1.smart EXIF 추출 | S | 낮 |
| 81 | `browser-image-compression` 또는 `sharp` | (신규) | 🆕 NEW | ⑦ 1024px 자동 압축 | S | 낮 |
| 82 | Web Push 라이브러리 (`web-push`) | (신규) | 🆕 NEW | ⑧ 22:00 KST 푸시 | M | 중 |
| 83 | PG사 SDK (포트원/토스 페이먼츠) | (신규) | 🆕 NEW | ⑦ Basic ₩2,900 구독 | XL | 높 |
| 84 | `react-markdown` + `remark-gfm` | `package.json` | ❌ DROP (가능) | ⑧ Out-of-Scope "마크다운 렌더링". 베타에서 사용 안 함. `DiaryContent`도 plaintext로 단순화 | S | 낮 |

> 일부 자산은 1행으로 묶었음(예: `components/ui/*` 7개 파일 → 1줄). 실제 자산 개수는 80+이지만 인벤토리 가독성을 위해 의미 단위로 합산.

---

## ③ ❌ 폐기 후보 상세

### D-1. 캐릭터 게임화 시스템 (성장 레벨 / 말풍선 / 진행바)

- **자산**: `src/lib/character/growth.ts` (GROWTH_LEVELS 5단계, calcGrowthPoints, getBubbleMessage), `components/character/character-card.tsx` (말풍선 + 진행바 + 코인 + 대화 CTA), `components/character/character-companion.tsx` (쓰다듬기·미세동작 스케줄러)
- **폐기 이유 (기획서 §)**: ⑬ D16 "캐릭터 = 친구 재포지셔닝, Basic+ 한정". 게임화 → 친구 페르소나 전환으로 성장·쓰다듬기·코인 보상 루프 모두 의미 상실. ⑧ Out-of-Scope "캐릭터 스킨·외형 커스텀"으로 외형 변형도 폐기.
- **데이터 처리**: `Character.age`, `Character.bornAt`은 row 보존하되 UI에서 미사용. `Character.coinBalance`는 항상 0 유지 (관련 트랜잭션 모두 폐기).
- **영향**:
  - 홈 화면(`(protected)/page.tsx`) 전체 레이아웃 재설계 필요 (현재 화면의 중심이 캐릭터 카드).
  - `/character` 페이지의 헤더(`character-chat-view.tsx` 상단)에 성장바/코인/탄생일 모두 제거 → 친구 페르소나 헤더로 재작성.
  - 기존 사용자가 있다면 "내 캐릭터가 성장하던 시스템"의 정서적 손실. 베타 출시 시점에 사용자 미존재 가정.
- **완화 방안**: (1) 캐릭터 row와 이름은 유지하므로 "친구 이름"으로 정체성 이어짐. (2) "메모"라는 기본 이름·아바타는 유지하되 SVG는 1종으로 통합 또는 새 친구 아바타로 교체.

### D-2. 코인 경제 시스템

- **자산**: `prisma`의 `CoinTransaction`, `CoinPackage` 모델, `Character.coinBalance` 필드, 모든 코인 잔액 표기 UI
- **폐기 이유**: ⑨ 데이터 모델 `~Character, CoinTransaction, CharacterOutfitOwned~` 베타 미사용 명시. ⑬ D18 "구독료 ₩2,900 (Basic)" — 단일 구독으로 코인 IAP 대체.
- **데이터 처리**: 테이블 drop (마이그레이션). FK가 User에 cascade로 묶여있어 row 삭제는 자동.
- **영향**: 코인 잔액 표기 UI 4개 위치(`/`, `/character`, `/character/shop`, 헤더) 제거.
- **완화 방안**: 베타에서 사용자 데이터 없다고 가정. 만약 있다면 export로 백업 후 drop.

### D-3. 캐릭터 외형 / 스킨 / 상점

- **자산**: `prisma`의 `CharacterOutfit`, `CharacterOutfitOwned`, `CharacterEquipped` 모델. `src/lib/character/skins.ts`, `skin-actions.ts`. `components/character/skins/{chick,mochi,classic}.tsx`, `character-svg.tsx`. `/character/shop/page.tsx`, `skin-card.tsx`.
- **폐기 이유**: ⑧ Out-of-Scope "캐릭터 스킨·외형 커스텀 (V2 이후)". ⑬ D16.
- **데이터 처리**: 테이블 drop. SVG 3종 중 1종(기본)만 보존 또는 새 친구 아바타 SVG로 교체.
- **영향**: bottom-nav에서 캐릭터 → 상점 진입 경로 제거. `/character/shop` 라우트 자체 제거.
- **완화 방안**: `character-svg.tsx`는 기본 1종(`chick`)만 남기고 단순화 — 친구 페르소나의 시각 자산으로 활용.

### D-4. 일기 mood (감정 태그)

- **자산**: `components/diary/mood-picker.tsx`, `mood-badge.tsx`, `Diary.mood` 필드, MOOD_COLOR 토큰 6종
- **폐기 이유**: ⑨ 데이터 모델 베타 Diary 필드 목록에 `mood` 없음. 베타는 EXIF 시간·장소 중심으로 사실 강조 (F5/F6).
- **데이터 처리**: 컬럼 보존 가능 (drop 안 해도 무방, UI만 제거). DROP 칼럼 시 기존 mood 값 손실.
- **영향**: 일기 카드/상세에서 mood 뱃지 제거. mood로 그룹화하는 화면 없음 → 안전.
- **완화 방안**: V2에서 다시 활성화할 가능성을 고려해 컬럼은 유지하고 UI만 제거하는 것을 권장.

### D-5. Ollama 기반 채팅 (`/api/chat`의 LLM 호출부)

- **자산**: `src/app/api/chat/route.ts:5,87-122` (OLLAMA_URL fetch 부분 + 30개 stuff 컨텍스트)
- **폐기 이유**: 배포 환경 미작동 (QA H-2). ④ F1/F3은 Gemini 2.5 Flash 멀티모달 단일 엔진 명시 (⑩).
- **데이터 처리**: 없음. 기존 ChatMessage row는 유지.
- **영향**: `task.md §2` "AI API 전환 (Ollama → 무료/저렴한 외부 API)" 미해결 항목이 이 작업에서 해소.
- **완화 방안**: 라우트 골격(인증·DB select·트랜잭션)은 보존하고 LLM 호출만 신규 `lib/ai/` 모듈로 위임.

### D-6. `react-markdown` + `remark-gfm` (마크다운 렌더링)

- **자산**: `package.json` 의존, `components/diary/diary-content.tsx`
- **폐기 이유**: ⑧ Out-of-Scope "마크다운 렌더링". 베타는 1인칭 150~250자 plaintext 본문 (⑬ D12).
- **데이터 처리**: 없음.
- **영향**: 일기 본문 렌더링 단순화. `diary-card.tsx`의 `snippet` 함수에서 마크다운 stripper 코드 정리.
- **완화 방안**: 의존성은 유지하고 컴포넌트만 plaintext로 단순화하는 보수적 옵션도 가능.

### D-7. 캐릭터 트라이얼 30일 (현재 코드의 의미)

- **자산**: `src/lib/character/utils.ts:10` `TRIAL_DURATION_DAYS = 30`
- **폐기 이유**: ⑬ D22 "트라이얼 3일 (캐릭터)" — 30일 → 3일로 단축.
- **데이터 처리**: 기존 `Character.trialStartedAt`/`subscriptionExpiresAt` 값은 의미 변경. 베타 출시 시점에 모든 사용자에게 `trialStartedAt = now`로 reset 권장.
- **영향**: `signupAction`의 `trialEndDate(trialStart)` 호출 결과가 짧아짐. 트라이얼 만료 처리 잡(M-5)을 신규 작성하는 작업과 함께.
- **완화 방안**: 베타 출시 = 데이터 reset 가정.

---

## ④ 🔄 마이그레이션 작업 분해

### MIG-1. Diary 1:N 이미지 모델 마이그레이션

- **AS-IS**: `Diary.images: String[]` (Postgres array of URLs), 단일 이미지 위주 UI/액션. `Diary.location: Json?` 별도.
- **TO-BE**: `DiaryImage` 1:N 테이블 (`id, diaryId, storagePath, exifTakenAt, exifLat, exifLng, orderIndex`). 최대 5장 (⑦/⑪). `Diary.images` 제거. `Diary.location` deprecated.
- **단계**:
  1. `schema.prisma`에 `DiaryImage` 모델 추가 + Diary에 relation 추가.
  2. `pnpm db:migrate --name add-diary-images` (Prisma 마이그레이션 SQL 파일 생성).
  3. 데이터 마이그레이션 SQL: 기존 각 `Diary.images[i]` → `DiaryImage` row 생성 (EXIF 필드 NULL). `orderIndex = i`.
  4. `Diary.images` 컬럼 drop (별도 마이그레이션, 코드 deploy 이후).
  5. `lib/diary/queries.ts`, `lib/diary/actions.ts`, `components/diary/*` 콜사이트 전부 다중 이미지 처리로 수정.
- **선행 의존**: 없음. 단, **MIG-5 Supabase Storage 이관** 이후 진행이 안전 (storagePath 형식 통일).
- **후속 의존**: NEW-2 (EXIF 추출), NEW-3 (이미지 압축), MIG-3 (Diary CRUD).
- **공수**: L (3~5일). DB·코드·UI 전반 영향.
- **위험**: 중. 기존 데이터에서 EXIF 부재 + 단일 이미지를 다중 슬롯으로 옮길 때 orderIndex 정렬 검증 필요.
- **데이터 마이그레이션 SQL**: 필요. dry-run 환경에서 검증 후 실행.

### MIG-2. Diary 신규 필드 추가 (백업 스왑 + source + AI 메타)

- **AS-IS**: `Diary { id, userId, title, content, images, location, mood, createdAt, updatedAt }`
- **TO-BE**: + `previousContent: String?`, `previousChangedAt: DateTime?`, `source: String("auto_a"|"auto_b"|"auto_c"|"manual")`, `aiGenerationVersion: Int?`, `contentEditedAt: DateTime?`
- **단계**:
  1. schema.prisma 필드 추가 + 마이그레이션.
  2. `createDiaryAction`에 `source` 세팅 (현재는 모두 "manual").
  3. `updateDiaryAction` 백업 스왑 로직 추가 (E2): AI 재생성 시 `previousContent = old content, previousChangedAt = now`.
- **선행 의존**: 없음.
- **후속 의존**: NEW-4 (AI 자동 생성), NEW-7 (재생성 라우트).
- **공수**: S (0.5일).
- **위험**: 낮.
- **데이터 마이그레이션 SQL**: 기존 row는 NULL/기본값으로 backfill.

### MIG-3. Diary CRUD 액션 다중 이미지 + AI source 대응

- **AS-IS**: `imageMode` enum {absent, `__keep__`, `remove`, file} 단일 이미지.
- **TO-BE**: 다중 이미지 배열 처리, `source` 필드 세팅, 백업 스왑 (E2).
- **단계**: 파일 배열 파싱 → 각 이미지 압축(NEW-3) → EXIF 추출(NEW-2) → Supabase Storage 업로드(MIG-5) → DiaryImage row 생성. 본문은 AI 검토 게이트 통과 시점에 저장.
- **선행 의존**: MIG-1, MIG-2, MIG-5, NEW-2, NEW-3.
- **공수**: L (3~5일).
- **위험**: 중. 트랜잭션 외 보상 로직 (M-11, M-12 QA 지적 사항)도 함께 처리 권장.

### MIG-4. User 모델 확장 (`trialEndDate`, `externalLLMConsent`)

- **AS-IS**: User에 트라이얼 필드 없음 (Character가 보유).
- **TO-BE**: User에 `trialEndDate: DateTime?`, `externalLLMConsent: Boolean @default(false)` 추가.
- **단계**:
  1. schema.prisma 수정 + 마이그레이션.
  2. 기존 사용자의 `Character.subscriptionExpiresAt`을 `User.trialEndDate`로 복사 (3일 reset 정책이면 모두 `now + 3day`).
  3. `signupAction`에 동의 체크박스 필수화 (MIG-9 함께).
  4. `Character.trialStartedAt/subscriptionExpiresAt` 의미 변경 (트라이얼 → 캐릭터 친구 활성 윈도) 또는 향후 drop.
- **선행 의존**: 없음.
- **후속 의존**: NEW-9 (트라이얼 만료 처리 잡), MIG-9 (signup 동의).
- **공수**: S (0.5~1일).
- **위험**: 낮.

### MIG-5. 이미지 스토리지 이관 (Local FS → Supabase Storage Private + Signed URL)

- **AS-IS**: `lib/storage/index.ts`가 `public/uploads/<userId>/`에 `writeFile`. Vercel에서 동작 불가 (QA H-2). userId 노출 (QA H-1).
- **TO-BE**: `@supabase/supabase-js` storage client로 private 버킷에 업로드. 조회 시 Signed URL 발급 (1시간 TTL 권장).
- **단계**:
  1. Supabase 콘솔에서 `diary-images` 버킷 생성 (private).
  2. RLS 정책 또는 service role로 업로드.
  3. `saveImage(file, ownerId): Promise<string>` 인터페이스 유지하되 내부를 Supabase API로 교체. 반환은 storagePath(`<owner>/<uuid>.jpg`)로 변경.
  4. 조회 측에 `getSignedUrl(storagePath): Promise<string>` 헬퍼 추가, 컴포넌트는 RSC에서 미리 발급.
  5. 기존 `/public/uploads/*` 파일을 Supabase로 일괄 업로드하는 일회성 스크립트.
  6. `next.config.ts` `remotePatterns`에 Supabase 호스트 추가 (이미 `**.supabase.co` 등록됨).
- **선행 의존**: 없음. 단, NEW-3 (이미지 압축)과 같은 시점에.
- **후속 의존**: MIG-1, MIG-3, NEW-4 (자동 생성), NEW-5 (검토 게이트의 미리보기).
- **공수**: M (1~2일) + 데이터 이전 0.5일.
- **위험**: 중. Signed URL TTL 관리, 클라이언트 측 Image 캐시 무효화, RSC 직렬화.
- **데이터 마이그레이션 SQL**: 기존 `Diary.images` URL → storagePath 변환 (URL prefix 제거 + 파일은 별도 업로드).

### MIG-6. ChatMessage 재활용 (RAG 채팅 인터페이스)

- **AS-IS**: 캐릭터와의 자유 대화. ChatMessage 1:1 with Character.
- **TO-BE**: Basic+ 사용자의 RAG 검색 결과를 채팅 형식으로 표현 (F3, ⑬ D17). 24h 보존 정책 유지 (이미 pg_cron 적용됨, `task.md §4`).
- **단계**:
  1. ChatMessage 스키마는 그대로.
  2. `/api/chat` 라우트가 RAG 검색 결과를 ASSISTANT 메시지로 변환해 저장.
  3. `character-chat-view.tsx`의 UI는 친구 페르소나로 카피 변경. 코인·트라이얼·성장 헤더 제거.
- **선행 의존**: NEW-1 (Gemini), NEW-6 (RAG 검색), MIG-8 (캐릭터 페이지).
- **공수**: S (1일) — 스키마 변경 없음.
- **위험**: 낮.

### MIG-7. `/api/chat` 라우트 (Ollama → Gemini + RAG)

- **AS-IS**: Ollama fetch + 30개 일기 stuff.
- **TO-BE**: 사용자 메시지 → RAG 검색 (top-5 임베딩 매칭) → Gemini 호출 → 응답 + 참조 일기 ID 반환.
- **단계**:
  1. 입력 Zod 검증 (QA H-3): `message: z.string().trim().min(1).max(2000)`.
  2. `lib/ai/usage.ts`로 일일 cap 차감 검증.
  3. `lib/ai/rag.ts.search(query, userId)` → top-5 일기.
  4. `lib/ai/gemini.ts.chat(systemPrompt, history, query, contextDiaries)` 호출.
  5. ChatMessage 트랜잭션 insert.
  6. Basic+ 게이트 (구독 검증).
- **선행 의존**: NEW-1, NEW-6, NEW-8 (cap), MIG-4 (구독 상태).
- **공수**: M (1~2일).
- **위험**: 중. abuse cap·rate limit 부재 시 비용 폭주.

### MIG-8. `/character` 페이지 단순화 (친구 페르소나)

- **AS-IS**: 캐릭터 게임화 헤더(레벨/성장바/코인/트라이얼/탄생일) + 채팅.
- **TO-BE**: 친구 페르소나 헤더 (이름 + 짧은 인사) + RAG 채팅. Basic+ 전용 안내 (Free는 키워드 검색 화면으로 안내).
- **단계**: `character-chat-view.tsx` 헤더 섹션 제거/재작성. `character-companion.tsx` 의존 제거.
- **선행 의존**: D-1 (캐릭터 게임화 폐기 결정).
- **공수**: M (1~2일).
- **위험**: 낮.

### MIG-9. `signupAction` + 가입 폼 확장 (LLM 동의 + 3일 트라이얼)

- **AS-IS**: email/password만, 30일 트라이얼.
- **TO-BE**: + `externalLLMConsent` 체크박스 (필수), 3일 트라이얼, UserPersona/UsageLog row 생성.
- **단계**:
  1. `signupSchema`에 `consent: z.literal(true)` 추가.
  2. `auth-form.tsx` (signup 모드)에 체크박스 + 카피.
  3. `signupAction`의 트랜잭션에서 User.trialEndDate 세팅 + UserPersona + UsageLog 초기 row 생성.
- **선행 의존**: MIG-4, NEW-10 (UserPersona), NEW-11 (UsageLog).
- **공수**: S (0.5~1일).
- **위험**: 낮.

### MIG-10. `/settings` 확장 (구독·내보내기·탈퇴·동의 토글)

- **AS-IS**: 비밀번호 변경, 캐릭터 이름, 탄생일, 로그아웃.
- **TO-BE**: + 구독 상태(현재 티어, 갱신/해지), 데이터 내보내기 (JSON), 계정 탈퇴 (Cascade), 외부 LLM 동의 토글 (가입 후 변경 가능 여부는 제품 결정 필요).
- **단계**: SettingsView에 섹션 3개 추가 + 각 액션 신규 작성.
- **선행 의존**: NEW-12 (export), NEW-13 (delete), NEW-14 (billing UI).
- **공수**: M (1~2일).
- **위험**: 낮.

### MIG-11. 홈 화면 (`/`) 재배치

- **AS-IS**: 캐릭터 카드 중심 + 최근 일기 3개.
- **TO-BE**: AI 작성 진입 + 오늘의 일기 위젯(작성/미작성 시각 구분, ⑧ In-Scope) + 최근 일기 + 친구 진입 (Basic+).
- **단계**: `page.tsx` 레이아웃 재설계, 캐릭터 카드 제거, AI 작성 CTA 강조.
- **선행 의존**: D-1, MIG-3.
- **공수**: M (1~2일).
- **위험**: 낮.

### MIG-12. `signupAction`/`loginAction` 부수효과 (UserPersona·UsageLog 초기화)

- 위 MIG-9에 흡수됨. 별도 작업 아님.

### MIG-13. Character 모델 정리 (코인/스킨/성장 무관 필드 deprecated)

- **AS-IS**: 모든 게임화 필드 (`age`, `bornAt`, `isAsleep`, `coinBalance`, `subscriptionStatus`, `trialStartedAt`, `subscriptionExpiresAt`) 활성.
- **TO-BE**: `name`만 적극 사용. `subscriptionStatus`는 User로 이동 또는 의미 변경. 나머지 필드는 schema 유지하되 코드에서 미참조.
- **단계**: 코드 grep으로 모든 참조 위치 식별 → 제거 또는 conditional. 필드 자체의 drop은 V2로 미룸 (안전).
- **선행 의존**: D-1, D-2, D-3 폐기와 함께.
- **공수**: M (1~2일, grep + 제거 작업이 광범위).
- **위험**: 중. 누락 시 빌드 깨짐.

---

## ⑤ 🆕 신규 작성 작업 분해

### NEW-1. `src/lib/ai/gemini.ts` — Gemini 2.5 Flash 클라이언트 + 모드 A/B/C 프롬프트

- **기획서 §**: ④ F1, ⑩ Multi-Agent.
- **인터페이스**:
  ```ts
  type GenerateInput = {
    mode: "A" | "B" | "C";          // A=사진만, B=텍스트만, C=둘다
    photos?: { url: string; exif?: ExifMeta }[];  // signed URL
    text?: string;
    persona: UserPersona;            // 베타엔 기본값
  };
  type GenerateOutput = {
    title: string;
    content: string;                 // 1인칭 150~250자
    suggestedMood: string | null;
  };
  async function generateDiary(input: GenerateInput): Promise<GenerateOutput>;
  async function chat(systemPrompt, history, query, contextDiaries): Promise<string>;
  ```
- **의존**: `@google/genai` SDK, GEMINI_API_KEY 환경 변수.
- **공수**: L (3~5일). 프롬프트 설계·튜닝·환각 방지 검증 포함.
- **위험**: 높. 외부 API 응답 형식 변화, 비용 예측, 한국어 일기 톤 검증.

### NEW-2. `src/lib/diary/exif.ts` — EXIF 추출 + B-1.smart 정책

- **기획서 §**: ④ F6, ⑪ B-1.smart.
- **인터페이스**:
  ```ts
  type ExifMeta = { takenAt: Date | null; lat: number | null; lng: number | null };
  function extractExif(file: File): Promise<ExifMeta>;
  function validateSameDayKST(metas: ExifMeta[]): { ok: true; date: Date } | { ok: false; reason: string };
  ```
- **의존**: `exifr`.
- **공수**: M (1~2일). 자정 걸침 휴리스틱, KST 변환, EXIF 부재 케이스 모두 테스트.
- **위험**: 중. 사진별 EXIF 누락·timezone 누락 시 휴리스틱 정확도.

### NEW-3. `src/lib/diary/image-compress.ts` — 1024px 자동 압축

- **기획서 §**: ⑦/⑪ 1024px 압축.
- **인터페이스**: `compressImage(file: File): Promise<File>` (max 1024px, JPEG quality 0.85).
- **의존**: `browser-image-compression` (클라이언트 측). 서버에서 한 번 더 하려면 `sharp`.
- **공수**: S (0.5일).
- **위험**: 낮. 메모리 사용량 주의.

### NEW-4. `src/lib/diary/auto-generate.ts` — F1 자동 생성 오케스트레이션

- **기획서 §**: ④ F1, F9 트리거 조건, ⑩ 단일 엔진 모드 분기.
- **인터페이스**:
  ```ts
  async function autoGenerateDiary({
    userId, photoFiles, text, date,
  }): Promise<
    | { ok: true; draft: { title, content, suggestedMood }; storagePaths: string[]; exifs: ExifMeta[] }
    | { ok: false; reason: string }
  >;
  ```
- **단계**: cap 검증(NEW-8) → 이미지 압축(NEW-3) → Storage 업로드(MIG-5) → EXIF 추출(NEW-2) + B-1.smart 검증 → 모드 결정 → Gemini 호출(NEW-1) → draft 반환 (DB 저장 X, 검토 게이트로 위임).
- **의존**: NEW-1, NEW-2, NEW-3, NEW-8, MIG-5.
- **공수**: L (3~5일).
- **위험**: 중. 부분 실패 (3장 중 1장 업로드 실패) 처리, 임시 파일 정리(E8 LLM 실패 시 영구 저장 X).

### NEW-5. `/diary/review` 페이지 + `components/diary/review-gate.tsx`

- **기획서 §**: ④ F2 사용자 검토 게이트, ⑪ E8.
- **UI**: AI 생성 draft + EXIF 헤더(F6) + AI 마커(✨, F5) + 수정/승인/재생성 버튼.
- **단계**: draft를 sessionStorage 또는 임시 ID(`pendingDraftId`)로 전달 → 승인 시 `createDiaryAction` 호출.
- **의존**: NEW-4, MIG-3.
- **공수**: M (1~2일).
- **위험**: 낮.

### NEW-6. `src/lib/ai/rag.ts` + `src/lib/ai/embedding.ts` — 임베딩 + RAG 검색

- **기획서 §**: ④ F3, ⑩ 백그라운드 임베딩.
- **인터페이스**:
  ```ts
  // embedding.ts
  async function embedDiary(diaryId, text): Promise<void>;  // pgvector insert
  async function backfillEmbeddings(userId): Promise<number>;
  // rag.ts
  async function searchDiaries(userId, query): Promise<DiaryListItem[]>;
  ```
- **단계**: Supabase에 pgvector 확장 활성화 → DiaryEmbedding 테이블 생성 → `createDiaryAction`/`updateDiaryAction` 성공 직후 비동기 임베딩 → 검색 쿼리도 임베딩 → cosine similarity top-5.
- **의존**: NEW-1 (text-embedding-004 호출), pgvector.
- **공수**: L (3~5일). pgvector 인덱싱(IVFFlat), 동기/비동기 처리.
- **위험**: 중. 임베딩 비용 (저렴하지만 backfill 시 대량 호출).

### NEW-7. `/api/diaries/[id]/regenerate` — AI 재생성 + 백업 스왑

- **기획서 §**: ⑪ E2, E5, E6, E7. 재생성 cap 일기당 5회.
- **인터페이스**: `POST` → 새 본문 생성 → `content↔previousContent` 스왑 → `previousChangedAt = now` → `aiGenerationVersion++`.
- **의존**: NEW-1, NEW-8 (cap), MIG-2 (필드).
- **공수**: M (1~2일).
- **위험**: 중. 일기당 재생성 횟수 카운트 어디에 저장할지 (`Diary.aiGenerationVersion`이 정확히 그 역할).

### NEW-8. `src/lib/ai/usage.ts` — 일일 abuse cap

- **기획서 §**: ⑪ 3중 cap, ⑦ UI 정책.
- **인터페이스**:
  ```ts
  async function checkAndIncrement(userId, kind: "ai_call" | "regeneration"): Promise<{ allowed: boolean; remaining: number }>;
  async function todayUsage(userId): Promise<UsageLog>;
  ```
- **단계**: 일별 UsageLog row upsert (`@@unique([userId, date])`). 무료 3 / Basic 10 / Pro 100 (Pro는 V2).
- **의존**: 새 UsageLog 모델.
- **공수**: M (1~2일).
- **위험**: 중. 동시성 (한 사용자가 동시 호출 시 cap 초과) — `update`에 조건부 increment 사용.

### NEW-9. 트라이얼/구독 만료 처리 잡 (QA M-5)

- **기획서 §**: ⑧ In-Scope (트라이얼 3일), ⑦.
- **인터페이스**: Supabase pg_cron 또는 read-time lazy 갱신. `User.trialEndDate < now AND subscriptionStatus=TRIAL` → EXPIRED.
- **공수**: S (0.5일).
- **위험**: 낮.

### NEW-10. `src/lib/persona/*` (UserPersona 기본값 row 관리)

- **기획서 §**: ⑨ UserPersona, ⑬ D14 (UI 미노출).
- **인터페이스**: `getOrCreateDefaultPersona(userId): Promise<UserPersona>`. 기본값 = `{ presetKey: "factual", tone: "warm", formality: "casual", sentenceLength: "medium", perspective: "first" }`.
- **공수**: S (0.5일).
- **위험**: 낮.

### NEW-11. UsageLog 모델 (NEW-8과 함께)

- 별도 모듈 아님. NEW-8에 흡수.

### NEW-12. `/api/account/export` — 데이터 내보내기 (JSON)

- **기획서 §**: ⑧ In-Scope.
- **인터페이스**: User + Diaries + DiaryImages signed URLs + ChatMessages → JSON 다운로드.
- **공수**: S (1일).
- **위험**: 낮.

### NEW-13. `/api/account/delete` — 계정 탈퇴 (Cascade)

- **기획서 §**: ⑧ In-Scope.
- **인터페이스**: 확인 모달 → User.delete (cascade로 모든 자식 row 삭제) + Storage 파일 일괄 삭제.
- **공수**: S (1일).
- **위험**: 중 (실수로 다른 사용자 데이터 영향 — 권한 검증 필수).

### NEW-14. 결제 시스템 (Basic ₩2,900 구독)

- **기획서 §**: ⑦ Basic ₩2,900.
- **인터페이스**: PG사 SDK (포트원 또는 토스 페이먼츠) + 정기결제 (월 자동 결제) + 영수증 검증 + Webhook으로 `User.subscriptionStatus` 갱신.
- **공수**: XL (1주+). PG 가맹 신청·심사 별도 (수주 ~ 수개월).
- **위험**: 높. 외부 의존·법적 절차·결제 보안 (PCI-DSS scope 회피하려면 PG 위임). **베타에서 결제를 진짜 받을지, 베타 기간은 free Basic으로 운영할지 제품 결정 필요.**

### NEW-15. 22:00 KST 리마인드 푸시

- **기획서 §**: ⑧ In-Scope, ⑫ 22:00 푸시.
- **인터페이스**: PWA Web Push (VAPID 키), Supabase pg_cron으로 매일 22:00 발송.
- **공수**: M (1~2일). VAPID 키 발급·구독 동의·플랫폼별 동작(iOS PWA 제약) 검증.
- **위험**: 중. iOS PWA Web Push는 16.4+ 필요, 사용자별 timezone 처리.

### NEW-16. `/api/diaries/search` — 키워드(무료) + RAG(Basic+)

- **기획서 §**: ④ F3, F7.
- **인터페이스**: `GET ?q=...` → 무료=ILIKE 키워드, Basic+=RAG. 결과는 사진 그리드 형식.
- **의존**: NEW-6, MIG-4 (구독 상태).
- **공수**: M (1~2일).
- **위험**: 중.

---

## ⑥ 의존성 그래프

```
[인프라 / 외부 의존]
GEMINI_API_KEY 발급 ─┐
                    ├→ NEW-1 (Gemini 클라이언트) ─┬→ NEW-4 (자동 생성)
Supabase pgvector ─┤                              │
                    └→ NEW-6 (RAG + 임베딩)       │
Supabase Storage 버킷 ─→ MIG-5 (Storage 이관) ─┐  │
                                                 │  │
[데이터 모델 변경]                                │  │
MIG-1 (DiaryImage 1:N) ←──── 데이터 마이그레이션 SQL
MIG-2 (Diary 신규 필드) ─┐
MIG-4 (User 트라이얼/동의 필드) ─┐
                                  ↓
NEW-10 (UserPersona) ─────→ MIG-9 (signupAction 확장)
NEW-11/8 (UsageLog + cap) ────→ NEW-7 (재생성), MIG-7 (chat), NEW-16 (search)

[Diary 코어 루프 — 자동 생성]
NEW-3 (이미지 압축) ──┐
NEW-2 (EXIF + B-1)  ──┼→ NEW-4 (자동 생성) ─→ NEW-5 (검토 게이트) ─→ MIG-3 (Diary CRUD)
MIG-5 (Storage)     ──┘                                                  │
                                                                          ↓
                                                                  NEW-6 (임베딩 백그라운드)

[캐릭터 / 채팅 / 검색]
D-1, D-2, D-3 (캐릭터 게임화/코인/스킨 폐기) ─→ MIG-13 (Character 정리)
                                                  ↓
                                                MIG-8 (/character 페이지 단순화)
                                                  ↓
NEW-1 (Gemini) + NEW-6 (RAG) ─→ MIG-7 (/api/chat 교체) ─→ MIG-6 (ChatMessage 재활용)
                                                            ↓
                                                          MIG-8 완성

[검색 UI]
NEW-6 (RAG) ─→ NEW-16 (/api/diaries/search) ─→ MIG-11 (/diary 검색 입력 추가)
                                                  ↓
                                                NEW-13' image-grid 컴포넌트

[정책 / 부가]
MIG-4 ─→ NEW-9 (트라이얼 만료 잡)
MIG-4 ─→ NEW-14 (결제) ─→ MIG-10 (/settings 구독)
        NEW-12 (export), NEW-13 (탈퇴) ─→ MIG-10 (/settings)
        NEW-15 (푸시) ─→ MIG-9 (가입 시 권한 요청 결정)

[홈 재배치]
D-1 (캐릭터 게임화 폐기) + MIG-3 (CRUD) ─→ MIG-11 (홈 화면)
```

---

## ⑦ Phase 순서 권고

### Phase 0 — 인프라 준비 (1주, 차단 작업 우선)

**목표**: 외부 의존을 모두 활성화. 코드 작업 없이 키/버킷/확장만.

- Gemini API 키 발급 + 결제 수단 등록 + 사용량 알람.
- Supabase Storage `diary-images` 버킷 생성 (private) + RLS 정책.
- Supabase pgvector 확장 활성화.
- Supabase pg_cron 확장 활성화 (24h 채팅 정리는 이미 있음, 트라이얼 만료·푸시 발송용).
- VAPID 키 생성 (Web Push).
- (선택) PG사 가맹 신청 시작 (심사 ~수주).
- JWT_SECRET 회전 (QA P1-5).

**완료 기준**: 모든 환경 변수가 Vercel·로컬에 세팅됨. Supabase 콘솔에서 버킷·확장 확인 가능.

### Phase 1 — 데이터 모델 마이그레이션 + 폐기 정리 (1.5주)

**목표**: schema.prisma를 새 베타 형태로 정착. 폐기 코드 제거.

- 병렬: MIG-1 (DiaryImage 1:N), MIG-2 (Diary 신규 필드), MIG-4 (User 트라이얼/동의), NEW-10 (UserPersona), NEW-11 (UsageLog), DiaryEmbedding 테이블 생성.
- 데이터 마이그레이션 SQL 실행 (dry-run → staging → prod).
- 병렬: D-1/D-2/D-3/D-7 (캐릭터 게임화·코인·스킨·트라이얼 30일 폐기) → MIG-13 (Character 코드 정리).
- D-4 (mood UI 제거), D-6 (마크다운 deps 정리 — 선택).

**완료 기준**: `pnpm db:migrate` + `pnpm build` 통과. 기존 일기 데이터가 새 모델에서 조회 가능.

### Phase 2 — 인프라 이관 (1주)

**목표**: Storage·LLM 외부 서비스 코드 통합.

- MIG-5 (Storage 이관) — Supabase Storage 클라이언트 통합 + 데이터 이전.
- NEW-1 (Gemini 클라이언트) — 단위 테스트.
- D-5 + MIG-7 (`/api/chat` Ollama → Gemini) — RAG는 Phase 4에 붙이고 일단 stuff 방식으로 동작.
- NEW-8 (UsageLog cap).

**완료 기준**: 기존 채팅이 Gemini로 동작. 신규 이미지 업로드가 Supabase로 들어감.

### Phase 3 — Diary 자동 생성 (베타 척추, 2주)

**목표**: 베타의 핵심 차별화 기능 완성 (F1, F2, F6, F9).

- 병렬: NEW-2 (EXIF), NEW-3 (이미지 압축).
- NEW-4 (자동 생성 오케스트레이션).
- NEW-5 (검토 게이트 UI).
- MIG-3 (Diary CRUD 다중 이미지) + MIG-6 (Diary CRUD에 source 세팅).
- MIG-11 (홈 화면 재배치) + MIG-6 (일기 카드/상세 다중 이미지·EXIF 헤더).
- NEW-7 (재생성 + 백업 스왑).

**완료 기준**: 사용자가 사진 1~5장 던지면 → AI 생성 → 검토 → 저장. 5장·1024px 압축·EXIF 표기 동작.

### Phase 4 — RAG 검색 + 캐릭터 친구 (1.5주)

**목표**: F3 자연어 검색 + F7 사진 그리드 + 친구 채팅.

- NEW-6 (RAG + 임베딩) + 기존 일기 backfill 스크립트.
- NEW-16 (검색 API).
- MIG-11 (검색 입력 추가) + 신규 image-grid 컴포넌트 (F7).
- MIG-8 (`/character` 친구 페르소나 단순화) + MIG-7 완성 (RAG 결과를 채팅 메시지로).

**완료 기준**: "작년 봄 카페" 검색 → 사진 그리드 + 일기 카드. Basic+ 사용자는 캐릭터와 채팅으로도 접근.

### Phase 5 — 비즈니스/정책 (1.5~3주, PG 심사 별도)

**목표**: 베타를 사용자에게 공개하기 위한 정책·결제·운영 작업.

- MIG-9 (signup LLM 동의).
- NEW-9 (트라이얼 만료 잡).
- NEW-12 (export) + NEW-13 (계정 탈퇴) + MIG-10 (/settings 확장).
- NEW-15 (22:00 푸시).
- NEW-14 (Basic 구독 결제) — **PG 가맹 심사 통과 후 진행. 베타 초기에는 Free Basic으로 운영하는 옵션 검토.**

**완료 기준**: 가입·구독·탈퇴·내보내기·푸시 모두 동작. App Store 외부 공개 직전 마지막 점검 (보안 헤더·rate limit·약관 페이지)은 별도 출시 직전 작업으로.

### Phase 6 — 안정성 다지기 (1주, QA P2 항목)

- `/api/chat` 입력 검증·rate limit (QA H-3, H-4).
- Diary CRUD 보상 트랜잭션 (M-11, M-12).
- 이미지 magic-byte 검증 (H-6).
- 비밀번호 변경 후 세션 무효화 (M-10).
- 미들웨어 PUBLIC 매칭 정확화 (L-1).
- CSP·보안 헤더 (L-2).

### 병렬 가능 작업

- Phase 0과 Phase 1 일부 (DB 변경)는 병렬.
- Phase 3과 Phase 4의 일부 (RAG 임베딩 모듈)는 병렬.
- Phase 5의 export/탈퇴/푸시는 Phase 3/4와 병렬 가능.

---

## ⑧ 전체 작업량 견적

| Phase | 작업 묶음 | 1인 풀타임 견적 | 위험 보정 (×1.3) |
|---|---|---:|---:|
| Phase 0 | 인프라 준비 | 3~5일 | 4~7일 |
| Phase 1 | 데이터 모델 + 폐기 | 7~10일 | 9~13일 |
| Phase 2 | 인프라 이관 | 5~7일 | 7~9일 |
| Phase 3 | Diary 자동 생성 (척추) | 10~14일 | 13~18일 |
| Phase 4 | RAG 검색 + 친구 채팅 | 7~10일 | 9~13일 |
| Phase 5 | 비즈니스/정책 | 8~15일 (PG 제외) | 10~20일 |
| Phase 6 | 안정성 다지기 | 5~7일 | 7~9일 |
| **합계 (1인 풀타임)** | | **45~68일** | **59~89일** |
| | | **≈ 9~14주** | **≈ 12~18주 (3~4.5개월)** |

**해석**:
- 1인 풀타임 + 풀스택 능숙 기준 최소 **3개월**, 보수적으로 **4.5개월**.
- PG 가맹 심사 (수주~수개월)와 NEW-14 결제 구현은 *제품 결정에 따라 베타 범위에서 제외 가능* (Free Basic 운영).
- 병렬 자원 1명 추가 시 Phase 3과 4 분담으로 ~2~3주 단축 가능.

---

## ⑨ 위험 매트릭스

| ID | 위험 | 영향도 | 발생 가능성 | 완화 방안 |
|---|---|---|---|---|
| R-1 | Diary 단일 이미지 → 1:N 마이그레이션 시 데이터 손실/EXIF 부재 | 높 | 중 | dry-run + DB 백업 + EXIF NULL 허용 + orderIndex 정렬 검증. 마이그 전후 row count 비교. |
| R-2 | Local FS → Supabase Storage 파일 이전 시 누락 | 높 | 중 | 일회성 스크립트가 idempotent하게 동작. 마이그레이션 후 DB의 모든 storagePath에 대해 Supabase HEAD 검증. |
| R-3 | Gemini API 비용 폭주 (cap 누락) | 높 | 중 | NEW-8 (UsageLog cap)을 Gemini 통합과 같은 PR에 포함. Gemini 콘솔에서 일일 예산 알람 설정. |
| R-4 | PG사 가맹 심사 지연으로 결제 출시 차단 | 중 | 높 | 베타 초기를 Free Basic으로 운영 결정. NEW-14를 베타 출시 후 첫 업데이트로 미룸. |
| R-5 | 캐릭터 게임화 폐기로 기존 사용자 이탈 | 중 | 낮 (베타 시점 사용자 없다고 가정) | 가정 검증 후 진행. 사용자 있다면 마이그레이션 안내 + 데이터 export 1회 제공. |
| R-6 | RAG 임베딩 백필 비용 (전체 일기 재임베딩) | 중 | 중 | text-embedding-004는 저렴 (1M token당 ~$0.025). 1000개 일기 backfill ≈ $0.01. 사전 추산 후 진행. |
| R-7 | iOS PWA Web Push 호환성 (16.4+ 필요) | 중 | 중 | 사용자 안내 + Android 우선 배포 + iOS는 fallback (앱 진입 시 인앱 알림). |
| R-8 | pgvector 인덱싱(IVFFlat) 튜닝 미흡으로 검색 정확도 저하 | 중 | 중 | 초기에는 정확도 우선 (인덱스 없이 brute-force 768-dim) → 일기 수 1000개 넘으면 IVFFlat 도입. |
| R-9 | F2 검토 게이트의 임시 draft 저장 누락으로 사용자 데이터 손실 | 중 | 중 | sessionStorage + 5분 TTL + 백/뒤로가기 시 confirm 다이얼로그. |
| R-10 | 외부 LLM 동의 미체크 사용자가 AI 호출 → 정책 위반 | 높 | 낮 | 미들웨어 또는 `/api/diaries/auto-generate`에서 `User.externalLLMConsent` 강제 검증. |
| R-11 | 인증 미들웨어 변경 시 모든 보호 라우트 회귀 | 높 | 낮 | Phase 0/1에서 미들웨어 변경 없음. 변경 시 별도 PR로 격리 + E2E 회귀 테스트. |
| R-12 | Gemini 응답이 1인칭 150~250자 정책 위반 (환각·길이 초과) | 중 | 높 | NEW-1에서 Zod 응답 검증 + 재시도 1회. 환각 검증은 ⑬ D13에 따라 시각 강조로 위임. |
| R-13 | UsageLog 동시성 (한 사용자 동시 호출) cap 초과 | 중 | 낮 | upsert + 조건부 increment (`WHERE count < limit`). Postgres advisory lock 옵션. |
| R-14 | 베타 출시 시점에 결정 안 된 항목 (결제 ON/OFF, 푸시 ON/OFF, 동의 변경 가능 여부) | 중 | 높 | Phase 5 진입 전 제품 결정 1회 (1시간) 필수. |

---

> **다음 단계**: 본 인벤토리를 토대로 `Milestone/second_milestone.md` 작성. 권고 Phase 0~6 묶음을 그대로 마일스톤의 큰 흐름으로 가져가되, 각 작업의 acceptance criteria·PR 단위·테스트 시나리오를 구체화.
