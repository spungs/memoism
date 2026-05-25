# Memoism — 2차 마일스톤 (재기획 후 베타까지)

- **작성일**: 2026-05-19
- **출처**:
  - 기획서: `Planning/ideate_decision_combined.html`
  - 자산 인벤토리: `MidtermEvaluation/asset_inventory.html`
- **이전 마일스톤**: `Milestone/first_milestone.md` (재기획 *전* 작성된 것 — archive)
- **베타 목표**: "AI 일기 도우미" 정체성으로 *지인 5~10명 베타 테스트 가능* 상태 도달
- **PG 결정**: 옵션 (나) — 베타 사용자 전원 Basic 자동 부여, 결제 시스템은 V2 미룸

---

## 0. 마일스톤 원칙

1. **핵심 기능 완성을 최우선으로.** 사진/텍스트 → AI 자동 생성 + 검토 + RAG 검색이 동작하지 않는 한 다른 모든 폴리시는 의미 없음.
2. **결제·법적 동선·외부 공개 준비는 베타에서 제외.** V2에서 광고·결제·코인 시스템 도입과 함께.
3. **자산 인벤토리의 4분류를 따른다.** ✅KEEP은 손대지 말고, 🔄MIGRATE는 인터페이스 보존하며 내부 교체, 🆕NEW는 새로 작성, ❌DROP은 베타 진입 전 깨끗이 제거.
4. **각 Phase는 verifiable acceptance를 갖는다.** "동작한다"가 아니라 "X 했을 때 Y가 보인다"로.
5. **데이터 손실은 한계선.** 베타 사용자(지인)라도 일기 손실은 안 됨. 마이그레이션은 항상 dry-run + 백업.

---

## 1. 단계 개요

| Phase | 목표 | 풀타임 견적 | 위험 보정 | 차단 의존성 |
|---|---|---|---|---|
| **Phase 0** | 인프라 준비 (외부 키·버킷·확장) | 3~5일 | 4~7일 | 없음 |
| **Phase 1** | 데이터 모델 마이그 + 폐기 정리 | 7~10일 | 9~13일 | Phase 0 (pgvector·Storage) |
| **Phase 2** | Storage·LLM 인프라 이관 | 5~7일 | 7~9일 | Phase 1 (DB 모델) |
| **Phase 3** | **Diary 자동 생성 척추** (F1·F2·F4·F5·F6·F9) | 10~14일 | 13~18일 | Phase 2 |
| **Phase 4** | RAG 검색 + 캐릭터 친구 (F3·F7) | 7~10일 | 9~13일 | Phase 2 |
| **Phase 5** | 비즈니스/정책 (결제·약관 제외) | 3~5일 | 4~7일 | Phase 1 |
| **Phase 6** | 안정성 다지기 (보안·rate limit) | 5~7일 | 7~9일 | Phase 3·4 |

**총 견적**: 40~58 인일 (≈ 8~12주) · **위험 보정 후 53~76 인일 (≈ 11~15주, 2.5~3.5개월)**.

---

## 2. Phase 0 — 인프라 준비 (1주, 차단 작업)

> 코드 작업 없이 외부 의존성 활성화. 1주차에 끝나지 않으면 Phase 2 이후가 모두 지연됨.

### 2.1 외부 키·버킷·확장

| 작업 | 내용 |
|---|---|
| **Gemini API 키 발급** | Google AI Studio에서 키 생성, 결제 수단 등록, 일일 예산 알람($10) 설정 |
| **Supabase Storage 버킷** | `diary-images` private 버킷 생성. RLS 정책: 본인만 읽기/쓰기 |
| **Supabase pgvector 확장** | `CREATE EXTENSION vector` (콘솔 1-click) |
| **Supabase pg_cron 확장** | 24h 채팅 정리 + V2 푸시 예약용 |
| **VAPID 키 생성** | Web Push용. `npx web-push generate-vapid-keys` |
| **JWT_SECRET 회전** | `openssl rand -base64 32` → Vercel 환경변수 |

### 2.2 환경 변수 정리

- `GEMINI_API_KEY` (신규)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY` (Storage용)
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (신규)
- `JWT_SECRET` (회전)
- `OLLAMA_URL` (삭제 예정)

### 2.3 Acceptance

- [ ] 로컬·Vercel 모두 환경 변수 세팅 완료
- [ ] Supabase 콘솔에서 버킷·pgvector·pg_cron 확인 가능
- [ ] `curl` 또는 Postman으로 Gemini API 단순 호출 성공
- [ ] JWT_SECRET 회전 후 기존 세션 모두 무효화됨 (의도된 동작)

---

## 3. Phase 1 — 데이터 모델 마이그레이션 + 폐기 정리 (1.5주)

> schema.prisma를 새 베타 형태로 정착. 폐기 코드 제거. **이 Phase가 가장 위험** (데이터 손실 가능성).

### 3.1 신규/변경 엔티티 (자산 인벤토리 §②)

```prisma
// User (MIG-4) — trialEndDate 제거 결정 반영
model User {
  ...
  externalLLMConsent Boolean @default(false)
  // trialEndDate 제거 — 트라이얼 개념 자체 폐기
}

// UserPersona (NEW-10) — 베타엔 기본값만, UI 미노출
model UserPersona {
  userId         String   @id
  presetKey      String   @default("factual")
  tone           String   @default("warm")
  formality      String   @default("casual")
  sentenceLength String   @default("medium")
  perspective    String   @default("first")
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Diary (MIG-2) — 신규 필드 6개, images/location 제거
model Diary {
  ...
  previousContent      String?
  previousChangedAt    DateTime?
  source               String   @default("manual")  // auto_a / auto_b / auto_c / manual
  aiGenerationVersion  Int      @default(0)
  contentEditedAt      DateTime?
  // images: String[] 제거 → DiaryImage 1:N
  // location: Json? 제거 → DiaryImage.exifLat/Lng로 흡수
  // mood: String? 제거 (V2 재활성 가능성에 컬럼만 유지)
  images               DiaryImage[]
  embedding            DiaryEmbedding?
}

// DiaryImage (NEW-3, MIG-1) — 1:N 분리
model DiaryImage {
  id           String   @id @default(cuid())
  diaryId      String
  storagePath  String   // Supabase Storage 경로
  exifTakenAt  DateTime?
  exifLat      Float?
  exifLng      Float?
  orderIndex   Int      @default(0)
  diary        Diary    @relation(fields: [diaryId], references: [id], onDelete: Cascade)
  @@index([diaryId, orderIndex])
}

// DiaryEmbedding (NEW-4) — pgvector 768
model DiaryEmbedding {
  diaryId   String   @id
  vector    Unsupported("vector(768)")
  updatedAt DateTime @updatedAt
  diary     Diary    @relation(fields: [diaryId], references: [id], onDelete: Cascade)
}

// UsageLog (NEW-5, NEW-8) — 일일 abuse cap
model UsageLog {
  id              String   @id @default(cuid())
  userId          String
  date            DateTime @db.Date
  aiCallCount     Int      @default(0)
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, date])
  @@index([userId, date])
}
```

### 3.2 폐기 (자산 인벤토리 §③)

베타 진입 전 깨끗이 제거:

| ID | 자산 | 처리 |
|---|---|---|
| D-1 | `character/growth.ts` + `character-card.tsx` + `character-companion.tsx` | 파일 삭제, 모든 import 정리 |
| D-2 | `CoinTransaction`, `CoinPackage` 모델 + `Character.coinBalance` 필드 | drop migration. *V2에서 앱테크 모델로 재설계 예정 — 그 때 새 스키마* |
| D-3 | `CharacterOutfit`/`Owned`/`Equipped` + `skins.ts` + `skin-actions.ts` + 캐릭터 SVG 3종 + `/character/shop` | drop. SVG 1종(`chick`)만 보존 또는 친구 아바타로 교체. *V2 재설계 예정* |
| D-4 | `mood-picker.tsx`, `mood-badge.tsx`, MOOD_COLOR 토큰 | UI 제거. `Diary.mood` 컬럼은 유지 (V2 재활성 가능성) |
| D-5 | `OLLAMA_URL` + Ollama fetch 로직 | `/api/chat`에서 제거 (Phase 2에서 Gemini 대체) |
| D-7 | `TRIAL_DURATION_DAYS = 30` + 트라이얼 개념 전체 | 트라이얼 제거 완료. `Character.trialStartedAt` 컬럼 drop, `subscriptionExpiresAt`만 유지 |

### 3.3 PR 단위 권장

1. **PR #1 — schema.prisma + 마이그레이션 SQL** (Diary 신규 필드 + DiaryImage + DiaryEmbedding + UserPersona + UsageLog + User 변경)
2. **PR #2 — 데이터 마이그레이션 스크립트** (`Diary.images[]` → `DiaryImage` 1:N. dry-run 옵션 필수)
3. **PR #3 — 캐릭터 게임화 코드 폐기** (D-1, D-2, D-3 일괄)
4. **PR #4 — mood UI 제거** (D-4)
5. **PR #5 — UserPersona 기본값 row 생성** (가입 트랜잭션, NEW-10)

### 3.4 Acceptance

- [ ] `pnpm db:migrate` 성공, `pnpm build` 통과
- [ ] 기존 일기 데이터가 새 모델에서 조회 가능 (다중 이미지 조인)
- [ ] `character` 폴더에서 `growth.ts`·`skins.ts`·`skin-actions.ts` 삭제됨
- [ ] `/character/shop` 라우트 404
- [ ] 가입 직후 UserPersona row가 자동 생성됨 (기본값)
- [ ] `prisma studio`에서 DiaryImage 테이블에 행이 보임 (마이그 후)
- [ ] Row count: 기존 일기 N개 → 마이그 후 일기 N개, DiaryImage M개 (M ≥ 기존 이미지 첨부 row 수)

### 3.5 위험 / 완화

- **R-1 데이터 손실**: 마이그 전 `pg_dump` 백업 + 마이그 후 row count diff 검증 + EXIF NULL 허용
- **R-5 캐릭터 폐기 시 의미 상실**: 베타 시점 사용자 없다고 가정. 있다면 데이터 export 1회 제공

---

## 4. Phase 2 — Storage·LLM 인프라 이관 (1주)

> 외부 서비스 코드 통합. Phase 3 진입 전제.

### 4.1 작업 항목

| 작업 | ID | 내용 |
|---|---|---|
| Supabase Storage 클라이언트 통합 | MIG-5 | `src/lib/storage/index.ts` 내부를 Supabase API로. `saveImage(file, ownerId): Promise<string>` 인터페이스 보존. 반환은 storagePath. |
| `getSignedUrl` 헬퍼 | MIG-5 | RSC에서 미리 발급 (1h TTL). 컴포넌트는 signed URL을 props로 받음 |
| 기존 `/public/uploads/` 파일 일괄 이전 스크립트 | MIG-5 | 일회성, idempotent. 마이그 후 모든 storagePath에 대해 Supabase HEAD 검증 |
| Gemini 클라이언트 | NEW-1 | `src/lib/ai/gemini.ts` — `@google/genai` SDK. `generateDiary(input): GenerateOutput` + `chat(...)` 함수 |
| `/api/chat` Ollama → Gemini 교체 | MIG-7, D-5 | Ollama fetch 제거, Gemini chat 호출. **RAG 통합은 Phase 4** — 일단 기존 stuff 방식으로 동작 |
| UsageLog cap 도입 | NEW-8 | `src/lib/ai/usage.ts` — `checkAndIncrement(userId, kind)`. 무료 3 / Basic 10 / Pro 100 |

### 4.2 PR 단위

1. **PR #6 — Supabase Storage 클라이언트** (`@supabase/supabase-js` 추가, `saveImage` 내부 교체)
2. **PR #7 — 데이터 이전 스크립트 + 실행**
3. **PR #8 — Gemini 클라이언트 모듈** (`@google/genai` 추가, 단위 테스트)
4. **PR #9 — UsageLog cap 모듈** (NEW-8 + UsageLog 사용)
5. **PR #10 — `/api/chat` Gemini 전환 + cap 적용**

### 4.3 Acceptance

- [ ] Vercel 배포에서 신규 이미지 업로드 → Supabase Storage에 저장됨
- [ ] 일기 detail 페이지에서 사진이 Supabase signed URL로 표시됨
- [ ] 기존 채팅 입력 → Gemini 응답 (Ollama 없이 동작)
- [ ] 무료 사용자가 일 4번째 AI 호출 시 cap 도달 메시지
- [ ] Basic 사용자가 일 11번째 호출 시 cap 도달
- [ ] Gemini 콘솔에서 일일 사용량 모니터링 가능

### 4.4 위험 / 완화

- **R-2 파일 이전 누락**: 스크립트 idempotent 보장 + 마이그 후 HEAD 검증
- **R-3 LLM 비용 폭주**: NEW-8 cap을 같은 PR(#10)에 포함. Gemini 콘솔 일일 예산 알람($10)
- **R-12 Gemini 응답 형식 변화**: Zod 검증 + 재시도 1회

---

## 5. Phase 3 — Diary 자동 생성 척추 (2주, 베타 핵심)

> 베타의 *핵심 차별화 기능*. F1, F2, F4, F5, F6, F9 모두 포함.

### 5.1 작업 항목

| 작업 | ID | 내용 |
|---|---|---|
| EXIF 추출 모듈 | NEW-2 | `src/lib/diary/exif.ts` — `extractExif(file)`, `validateSameDayKST(metas)`. B-1.smart 정책 |
| 이미지 압축 모듈 | NEW-3 | `src/lib/diary/image-compress.ts` — `browser-image-compression` 클라이언트 측. 1024px max |
| 자동 생성 오케스트레이션 | NEW-4 | `src/lib/diary/auto-generate.ts` — cap → 압축 → Storage → EXIF → 모드 분기(A/B/C) → Gemini → draft |
| 자동 생성 API | NEW-40 | `/api/diaries/auto-generate` POST. draft 반환 (DB 저장 X) |
| 검토 게이트 페이지 | NEW-5 | `/diary/review` + `components/diary/review-gate.tsx`. AI draft + EXIF 헤더 + ✨ AI 마커 + 수정/승인/재생성 |
| Diary CRUD 다중 이미지 | MIG-3 | `lib/diary/actions.ts` — 파일 배열 처리, source 세팅, 백업 스왑 |
| Diary 카드/목록/상세 다중 이미지 | MIG (#58, #59) | 썸네일 캐러셀, EXIF 시간/장소 헤더, ✨ AI 마커 |
| Diary form 재작성 | MIG (#56) | "AI 정리" 탭 + 다중 사진 픽커 + F9 트리거 조건 (사진 1+ OR 텍스트 비어있지 않음) |
| 홈 화면 재배치 | MIG-11 | 캐릭터 카드 제거 → AI 작성 진입 CTA + "오늘의 일기" 위젯 + 최근 일기 |
| 재생성 API + 백업 스왑 | NEW-7 | `/api/diaries/[id]/regenerate` — content↔previousContent 스왑, 재생성 cap 5회 |

### 5.2 핵심 인터페이스

```ts
// src/lib/diary/auto-generate.ts
async function autoGenerateDiary(input: {
  userId: string;
  photoFiles: File[];     // 0~5장
  text?: string;
  date: Date;
}): Promise<
  | { ok: true; draft: { title; content; suggestedMood }; storagePaths: string[]; exifs: ExifMeta[] }
  | { ok: false; reason: string }
>;
```

draft는 **DB 저장 X** — sessionStorage로 검토 게이트에 전달. 사용자가 승인하면 그때 `createDiaryAction` 호출.

### 5.3 PR 단위

1. **PR #11 — EXIF + 이미지 압축 유틸** (NEW-2 + NEW-3)
2. **PR #12 — 자동 생성 오케스트레이션 + API** (NEW-4 + NEW-40)
3. **PR #13 — 검토 게이트 페이지** (NEW-5)
4. **PR #14 — Diary CRUD 다중 이미지** (MIG-3) — *데이터 마이그 PR과 분리*
5. **PR #15 — Diary form "AI 정리" 탭 + 트리거 조건** (MIG #56)
6. **PR #16 — Diary 카드/목록/상세 다중 이미지** (MIG #58, #59)
7. **PR #17 — 홈 화면 재배치** (MIG-11)
8. **PR #18 — 재생성 API + 백업 스왑** (NEW-7)

### 5.4 Acceptance

- [ ] 사진 4장 업로드 + "AI 정리" → 15초 내 검토 게이트 도달
- [ ] 검토 게이트에 EXIF 시간(상단 헤더) + AI 본문(✨ 마커 + 옅은 노란 배경) 표시
- [ ] "후식"을 "디저트"로 수정 → 승인 → 저장 → 일기 detail에서 수정 반영 확인
- [ ] 텍스트만 입력 (모드 B) → "AI 정리" 작동, 오탈자·문맥 정리됨
- [ ] 사진 + 텍스트 동시 (모드 C) → 두 입력 모두 반영된 본문
- [ ] 사진 0장 + 텍스트 0자 → "AI 정리" 버튼 비활성
- [ ] EXIF 다른 날 사진 5장 섞임 → reject + 한국어 안내 (B-1.smart)
- [ ] EXIF 없는 사진(스크린샷) → 허용 + 사용자 입력 날짜 사용
- [ ] 일기 detail에서 "AI로 다시 정리" 누름 → 재생성 → previousContent 자동 백업 → "되돌리기" 버튼 표시
- [ ] 재생성 5회 도달 시 cap 메시지
- [ ] 홈 화면에 캐릭터 카드 없음, "오늘의 일기" 카드 + 최근 일기 표시

### 5.5 위험 / 완화

- **R-9 검토 게이트 임시 draft 손실**: sessionStorage + 5분 TTL + 뒤로가기 confirm
- **R-12 Gemini 환각·길이 초과**: NEW-1 Zod 검증 + 재시도 1회 + 시각 강조 (D13)
- **부분 실패 (5장 중 1장 업로드 실패)**: NEW-4에서 보상 트랜잭션 — 실패 시 이미 업로드된 파일 정리

---

## 6. Phase 4 — RAG 검색 + 캐릭터 친구 (1.5주)

> F3 자연어 검색 + F7 사진 그리드 + 친구 채팅 (광고 unlock 모델).

### 6.1 작업 항목

| 작업 | ID | 내용 |
|---|---|---|
| 임베딩 모듈 | NEW-29 | `src/lib/ai/embedding.ts` — `embedDiary(diaryId, text)`, `backfillEmbeddings(userId)` |
| RAG 검색 모듈 | NEW-6 | `src/lib/ai/rag.ts` — `searchDiaries(userId, query)`. cosine similarity top-5 |
| 백그라운드 임베딩 hook | NEW-6 | `createDiaryAction`/`updateDiaryAction` 성공 후 비동기 임베딩 |
| 검색 API | NEW-16 | `/api/diaries/search` — 무료=ILIKE 키워드, Basic+=RAG, 무료가 광고 본 후=RAG 1회 |
| 사진 그리드 컴포넌트 | NEW-63 | `components/diary/image-grid.tsx` — 검색 결과를 카드가 아닌 그리드로 |
| `/character` 페이지 단순화 | MIG-8 | 코인/트라이얼/성장 헤더 제거, 친구 페르소나 헤더 + RAG 채팅 UI |
| `/api/chat` RAG 통합 | MIG-7 (완성) | Phase 2에서 만든 chat에 RAG 검색 추가. top-5 일기 컨텍스트로 stuff |
| ChatMessage 재활용 | MIG-6 | 스키마 변경 X, ASSISTANT 응답에 참조 일기 ID 포함 |
| 일기 목록 검색 입력 | MIG-11 (확장) | `/diary` 상단에 검색 입력, 디바운스 300ms |
| 광고 unlock 시뮬레이션 | (베타용 모의) | 무료 사용자가 RAG 호출 시 "광고 시청 (모의)" 버튼 → 클릭 시 1회 unlock. *베타엔 실제 광고 X, UX만 검증* |

### 6.2 핵심 인터페이스

```ts
// src/lib/ai/rag.ts
async function searchDiaries(
  userId: string,
  query: string,
  opts?: { topK?: number }
): Promise<{ diaries: DiaryListItem[]; queryVector: number[] }>;

// 무료 사용자 RAG unlock 카운터 (UsageLog 확장)
async function unlockRagOnce(userId: string): Promise<boolean>;
```

### 6.3 PR 단위

1. **PR #19 — pgvector 임베딩 모듈** (NEW-29)
2. **PR #20 — 기존 일기 임베딩 backfill 스크립트 + 실행**
3. **PR #21 — RAG 검색 모듈 + API** (NEW-6 + NEW-16)
4. **PR #22 — 사진 그리드 컴포넌트 + 일기 목록 검색 UI** (NEW-63 + MIG-11 확장)
5. **PR #23 — `/character` 페이지 친구 단순화** (MIG-8)
6. **PR #24 — `/api/chat` RAG 통합** (MIG-7 완성 + MIG-6)
7. **PR #25 — 무료 사용자 RAG unlock 모의 UI** (베타용)

### 6.4 Acceptance

- [ ] 새 일기 저장 후 5초 내에 DiaryEmbedding row 생성됨
- [ ] backfill 스크립트 실행 → 기존 모든 일기에 embedding 채워짐
- [ ] Basic 사용자 검색 "작년 봄 카페" → 관련 일기 top-5 사진 그리드 표시
- [ ] 무료 사용자 검색 입력 → 키워드 매칭 결과 (RAG 아님)
- [ ] 무료 사용자가 "AI 검색 사용" 버튼 클릭 → 모의 광고 화면 → "광고 시청 완료" → RAG 검색 1회 사용 가능
- [ ] `/character` 페이지에 코인/성장바/트라이얼 UI 없음. 친구 인사 + 채팅 입력만
- [ ] Basic 사용자 채팅에서 "지난여름 뭐 했어?" → AI 응답에 관련 일기 인용
- [ ] 일기 0개 사용자도 채팅 정상 응답 ("아직 일기가 없어요" 처리)

### 6.5 위험 / 완화

- **R-6 임베딩 backfill 비용**: text-embedding-004 저렴 ($0.025/1M token). 1000개 일기 backfill ≈ $0.01. 사전 추산 후 실행
- **R-8 pgvector 인덱스 부재로 검색 정확도**: 초기는 brute-force (일기 1000개까지). 그 후 IVFFlat 인덱스 도입
- **R-13 UsageLog 동시성**: upsert + 조건부 increment (`WHERE count < limit`)

---

## 7. Phase 5 — 비즈니스/정책 (3~5일, 결제 제외)

> 베타 출시(지인 공유) 전 최소한의 운영 위생. **결제는 V2로 미룸 (옵션 나)**.

### 7.1 작업 항목

| 작업 | ID | 내용 |
|---|---|---|
| signup LLM 동의 체크박스 | MIG-9 | `auth-form.tsx`에 필수 체크박스 + 카피 ("AI가 사진·텍스트를 분석을 위해 Google Gemini로 전송합니다") |
| 외부 LLM 동의 미체크 차단 | MIG-9 | `signupSchema`에 `consent: z.literal(true)`. 미들웨어에서 `User.externalLLMConsent` 검증 |
| 데이터 내보내기 API + UI | NEW-12 | `/api/account/export` GET → User + Diaries + DiaryImages signed URLs + ChatMessages JSON 다운로드 |
| 계정 탈퇴 API + UI | NEW-13 | `/api/account/delete` POST → 확인 모달 → Cascade 삭제 + Supabase Storage 파일 일괄 삭제 |
| `/settings` 확장 | MIG-10 | 데이터 내보내기·계정 탈퇴·외부 LLM 동의 토글 행 추가 |
| **모든 베타 사용자 Basic 자동 부여** | (베타 정책) | `signupAction`에서 `Character.subscriptionStatus = ACTIVE` 자동 설정. 결제 검증 없음. *V2 결제 도입 시 이 정책 제거* |
| 22:00 KST 리마인드 푸시 | NEW-15 | Web Push (VAPID). pg_cron으로 매일 22:00 발송. 사용자 거주지 timezone 무시 (베타엔 한국 가정) |

### 7.2 의도적으로 제외 (V2 이상)

- ❌ NEW-14 결제 시스템 (옵션 나)
- ❌ 약관·개인정보처리방침 정적 페이지 (외부 공개 직전)
- ❌ 14세 미만 보호자 동의 (외부 공개 직전)
- ❌ 가입/로그인 rate limit (외부 공개 직전 — Phase 6에 일부)
- ❌ CSP·X-Frame-Options 헤더 (Phase 6)
- ❌ 광고 SDK 통합 (V2)
- ❌ 코인 적립·상점 (V2 앱테크 모델)

### 7.3 Acceptance

- [ ] 가입 시 외부 LLM 동의 체크박스 미체크 → 가입 실패
- [ ] 가입 직후 사용자가 자동으로 Basic 권한 (AI 일 10회, RAG 무제한, 캐릭터 활성)
- [ ] 설정에서 "데이터 내보내기" → JSON 파일 다운로드, 모든 일기·이미지 URL·채팅 포함
- [ ] 설정에서 "계정 탈퇴" → 확인 모달 → 즉시 삭제 + 로그아웃 + 모든 데이터 사라짐
- [ ] 매일 22:00 KST에 푸시 알림 도달 ("오늘 하루도 수고했어요. 1분만 남겨볼까요?")

---

## 8. Phase 6 — 안정성 다지기 (1주, QA P2 마무리)

> 베타 출시 전 마지막 점검. 1차 QA 평가의 P2 항목 마무리.

### 8.1 작업 항목

| 작업 | 출처 | 내용 |
|---|---|---|
| `/api/chat` Zod 검증 + 메시지 길이 cap | QA H-3 | `message: z.string().trim().min(1).max(2000)` |
| 로그인/회원가입 rate limit | QA H-4 | (베타엔 보류, 외부 공개 시 Upstash sliding window) — *작업 항목에서 제거 가능* |
| Diary CRUD 보상 트랜잭션 | QA M-11, M-12 | DB insert 실패 시 업로드된 이미지 정리 |
| 이미지 magic-byte 검증 | QA H-6 | `file-type` 패키지로 매직 바이트 검사. SVG 명시 차단 |
| `parseLocation` strict 모드 | QA H-7 | `locationSchema.strict()` + 직접 `safeParse` |
| 비밀번호 변경 시 다른 세션 무효화 | QA M-10 | `User.tokenVersion: Int` 추가, JWT payload에 포함, 미들웨어 검증 |
| 미들웨어 PUBLIC 매칭 정확화 | QA L-1 | 정확 일치 + whitelist (`/login`, `/signup`만) |
| `/design` 라우트 dev-only 게이트 | QA P2-6 | `process.env.NODE_ENV !== 'production'`일 때만 렌더 |

### 8.2 Acceptance

- [ ] `/api/chat`에 5000자 POST → 400 응답
- [ ] `.png` 위장한 `.svg` 파일 → reject
- [ ] 비밀번호 변경 후 다른 디바이스 세션 즉시 401
- [ ] 프로덕션 빌드에서 `/design` 접근 → 404

---

## 9. 베타 출시 정의 (Definition of Done)

본 마일스톤 완료 = 다음 시나리오가 끊김 없이 동작:

1. [ ] **신규 가입**: 이메일·비번 + LLM 동의 체크 → 자동 Basic 활성
2. [ ] **사진 첨부 일기 (모드 A)**: 사진 4장 → "AI 정리" → 검토 게이트 → 한 단어 수정 → 승인 → detail에서 EXIF 시간/장소 + AI 본문 마커 확인
3. [ ] **텍스트 정리 일기 (모드 B)**: 두서없는 텍스트 200자 → "AI 정리" → 깔끔하게 정리된 본문 → 승인
4. [ ] **사진+텍스트 일기 (모드 C)**: 사진 2장 + 한 줄 메모 → "AI 정리" → 통합 본문
5. [ ] **과거 날짜 일기**: 날짜 picker로 어제 선택 → 사진 1장 + 메모 → 자동 생성 → 저장
6. [ ] **재생성 + 되돌리기**: 일기 detail에서 "AI로 다시 정리" → 새 본문 → "되돌리기" → 이전 본문 복원
7. [ ] **자연어 검색 (Basic)**: 캐릭터 채팅에서 "지난 여름" → 관련 일기 인용 응답
8. [ ] **광고 unlock RAG (무료 모의)**: 무료 사용자가 RAG 시도 → 모의 광고 → 1회 unlock 동작
9. [ ] **사진 그리드 검색**: `/diary` 검색 입력 "카페" → 사진 그리드 결과
10. [ ] **22:00 푸시 수신**: PWA 설치된 디바이스에 매일 22:00 알림
11. [ ] **데이터 내보내기 + 계정 탈퇴**: 둘 다 동작
12. [ ] **5일 연속 본인 사용** (저녁 22:00 푸시 → 사진 던지기 → 30초 안에 저장) 중 큰 결함 없음
13. [ ] **지인 3~5명에게 가입 링크 공유 가능 상태** (비밀번호 재설정은 V2 이전에 추가 가능하나 베타엔 본인 수동 처리)

---

## 10. V2에서 다룰 항목 (베타에서 의도적 제외)

본 마일스톤이 끝나면 다음 V2 마일스톤(`third_milestone.md`)에서 다룸:

### 결제·법적 인프라
- 포트원/토스 페이먼츠 통합 (Basic ₩2,900 정기결제)
- 약관·개인정보처리방침 정적 페이지
- 14세 미만 보호자 동의
- 가입/로그인 rate limit (Upstash)
- CSP·보안 헤더
- 비밀번호 재설정 + 이메일 인증

### 광고 + 코인 시스템 (앱테크 모델)
- AdMob 통합 (보상형 비디오)
- 무료 사용자: 광고 1회 = AI 호출 +1 / RAG 1회
- 코인 적립: 광고 시청 (B) + 연속 출석 streak (C) + 친구 초대 (D)
- *일일 일기 작성 보상은 제외* (PoV "가벼운 방법"과 충돌)
- 코인 = 베리(Soft 통화, 환금성 0)
- 상점: 캐릭터 스킨·외형·홈 꾸미기·일기 테마·AI 페르소나 프리셋·추억 캡슐
- Pro 티어 ₩4,900 (일 100회, 광고 없음, 사진 10장, 페르소나 커스텀)

### 캐릭터 V2 재설계
- 캐릭터 스킨 (V2 코인으로 구매)
- 홈 꾸미기 (V2 신규)
- 캐릭터 페르소나 (UserPersona UI 노출 + 톤 선택)

### 그 외
- 일기 공유 (US-07 OS share + 카드 이미지)
- 마크다운 렌더링
- 오프라인 캐시·동기화
- 다국어
- DiaryRevision 1:N (전체 수정 이력)
- "N년 전 오늘" passive 회고 카드
- 음성 입력 (별도 UI — 키보드 STT는 베타에서 자연 활용)

---

## 11. 진행 추적 템플릿

각 Phase 완료 시 본 문서 하단에 다음 형식으로 기록:

```
### Phase 0 — 완료 (YYYY-MM-DD)
- PR: #1, #2, ...
- 완료 항목: ...
- 변경 결정: (예: Phase 1과 일부 병렬 진행, ...)
- 위험 발생 + 대응: ...
- 다음 Phase 진입 전 확인: ...
```

---

## 11.1 진행 현황 (2026-05-25, 코드 실측 기준)

> 문서 추적이 비어 있어 코드베이스를 직접 감사해 작성. "코드 완료"는 타입체크·lint·prod 빌드 통과를 의미하며, DB 반영·env 등록·배포 후 동작 확인은 별도 표기.

| Phase | 상태 | 메모 |
|---|---|---|
| **0** 인프라 | ✅ 완료 | Supabase Storage 이관, magic-byte 검증, SVG 차단 |
| **1** 데이터 모델 | ✅ 완료 | DiaryImage 1:N, DiaryEmbedding, UserPersona, source 컬럼 |
| **2** Storage·LLM | ✅ 완료 | Gemini 2.5 Flash 전환 (Ollama 제거) |
| **3** 자동 생성 척추 | ✅ 완료 | EXIF→Vision→모드 A/B/C→검토 게이트→재생성·되돌리기 |
| **4** RAG + 캐릭터 | ✅ 완료 | pgvector 검색, 채팅 RAG, 일기 그리드 검색, 메이 첫 인사 |
| **5** 비즈니스/정책 | 🟡 거의 | 동의 체크박스·데이터 내보내기·계정 탈퇴·자동 Basic ✅ / **22:00 리마인드 푸시 → 2026-05-25 코드 완료**(DB·env·배포 대기) |
| **6** 안정성 | 🟡 거의 | Zod 검증·미들웨어 정확 매칭·보상 트랜잭션 ✅ / **tokenVersion 세션 무효화 → 2026-05-25 코드 완료**(db:push 대기) / parseLocation strict·/design dev게이트 미확인(경미) |

### 2026-05-25 작업 (Phase 5·6 마감)
- **22:00 KST 리마인드 푸시 (NEW-15)** — Web Push. `PushSubscription` 모델, `src/lib/push/`, `/api/push/{subscribe,unsubscribe}`, `worker/index.ts`(custom SW), 설정 토글, `/api/cron/reminder` + `vercel.json` cron(`0 13 * * *`=22:00 KST). 발송은 `web-push` lib, Vercel Cron이 `CRON_SECRET`으로 호출. 만료 구독 자동 prune.
  - 결정: 기획서의 "pg_cron 발송"은 Postgres가 VAPID 서명·HTTP 발송을 못 하므로 **Vercel Cron + web-push로 대체**(기존 24h 정리용 pg_cron은 순수 SQL이라 유지).
- **tokenVersion 세션 무효화 (QA M-10)** — `User.tokenVersion` + JWT payload 포함. 비번 변경 시 increment(본인 기기는 쿠키 재발급으로 유지). **Edge 미들웨어에 Prisma가 끌려오지 않도록** jose 검증을 `src/lib/auth/jwt.ts`로 분리, DB 버전 비교는 `getSession()`(Node)에서 수행.
- 검증: `tsc --noEmit`·`eslint`·`next build` 모두 통과. custom worker가 `public/worker-*.js`로 컴파일 확인.

### 배포 전 필수 액션 (사용자)
1. `pnpm db:push` — `token_version` 컬럼 + `push_subscriptions` 테이블 반영. ⚠️ 배포 시 **기존 발급 토큰 전부 무효화**(전원 재로그인) — JWT_SECRET 회전과 동일한 1회성 동작, 의도됨.
2. env 등록 (`.env.local` + Vercel): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
3. prod 배포 후: 설정에서 푸시 구독 → 22:00(또는 cron 수동 트리거)에 알림 수신, 비번 변경 후 다른 기기 즉시 차단 확인.

### 베타 DoD 잔여 점검
- DoD #8 "무료 사용자 광고 RAG 모의 언락" — `usage.ts`는 일일 cap만 구현, 모의 광고 언락 플로우 **미확인**(별도 결정 필요).
- 나머지 DoD(#1~#7, #9~#13)는 코드상 충족, env·DB·배포 후 E2E 재검증 권장.

---

## 12. 결정 의존성 (변경 시 마일스톤 재검토 필요)

본 마일스톤이 *암묵적으로 가정*하는 결정들. 바뀌면 본 마일스톤도 갱신해야:

| 가정 | 출처 |
|---|---|
| PG 결제 옵션 (나) — 베타 사용자 전원 Basic 자동 부여 | 본 라운드 D-PG |
| 캐릭터 = 친구 재포지셔닝, Basic+ 한정 (무료는 보유만, RAG는 광고로) | 본 라운드 D-Char |
| 트라이얼 개념 자체 제거 | 본 라운드 D-Trial |
| 광고는 V2부터 (베타엔 모의 UI만) | 본 라운드 D-Ad |
| 코인·상점 = V2 앱테크 모델로 재설계 (베타 미포함) | 본 라운드 D-Coin |
| 환급 = V3 이후 검토 (사용자 1만+ 시) | 본 라운드 D-CashOut |
| 사진 5장 + 1024px 압축 + B-1.smart | 기획서 ⑪ |
| 백업 스왑 (직전 1개) | 기획서 ⑪ E2 |
| 베타엔 UserPersona 기본값 고정 (UI 미노출) | 기획서 ⑨, ⑬ D14 |

---

> 본 마일스톤은 사용자가 명시한 우선순위에 직접 기반함:
> "당장 출시 안 함, 지인 베타 테스트, 핵심 기능 완성 우선, 결제·법적 동선·광고 후순위, 사진→자동 일기가 핵심"
>
> 우선순위가 바뀌면 본 문서를 먼저 갱신하고 작업 진행할 것.
