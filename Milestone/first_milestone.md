# Memoism — 1차 마일스톤 (지인 베타 테스트까지)

- **작성일:** 2026-05-09
- **출처 평가:** `MidtermEvaluation/first_qa_planner.md`
- **현 단계 목표:** 결제·법적 동선·외부 출시 준비는 보류. **핵심 기능 완성**과 **지인 베타 테스트 가능한 안정성** 도달이 유일한 성공 조건.

---

## 0. 마일스톤 원칙

1. **핵심 기능 완성을 가장 먼저, 마지막까지 우선한다.** 일기 작성·AI 검색(RAG)·AI 리액션·**사진 메타데이터 → 자동 일기 생성**(가장 핵심)이 동작하지 않는 한 다른 모든 폴리시는 의미 없음.
2. **결제·구독·코인 IAP·약관·미성년자 정책은 본 마일스톤에서 제외.** 데이터 모델은 그대로 두고, 만료 cron / 결제 화면 / 동의 체크박스 등은 손대지 않는다.
3. **지인 베타라도 "데이터 손실은 절대 안 된다"가 한계선.** 비밀번호 재설정·계정 삭제·데이터 내보내기는 테스터 운영 편의성으로 포함.
4. **각 단계는 verifiable acceptance를 갖는다.** "동작한다"가 아니라 "X를 했을 때 Y가 보인다"로 기술.
5. **Surgical changes.** 기존 코드 스타일 유지. 새 도메인은 `src/lib/<domain>/{schemas,actions,queries}.ts` 패턴 그대로.

---

## 1. 단계 개요

| 단계 | 목표 | 예상 작업량 | 차단 의존성 |
|---|---|---|---|
| **Phase 0** | 인프라 위생 — 시크릿 회전, Storage 이관, 입력 검증 (이후 모든 작업의 전제) | 2~3일 | 없음 |
| **Phase 1** | AI 채팅을 살아있는 상태로 — 외부 LLM 전환 + 리액션 코멘트 | 3~4일 | Phase 0 |
| **Phase 2** | RAG 기반 일기 검색 — pgvector + 임베딩 파이프라인 + UI | 5~7일 | Phase 1 |
| **Phase 3** | **사진 메타데이터 → 자동 일기 생성 (핵심 기능)** | 7~10일 | Phase 0(Storage), Phase 1(LLM) |
| **Phase 4** | 코어 루프 강화 — 보상 피드백, 작명, 오늘의 일기, 검색 UI | 3~4일 | Phase 1, 2 |
| **Phase 5** | 베타 테스트 운영 위생 — 비번 재설정, 계정 탈퇴, 데이터 내보내기 | 2~3일 | 없음 (병렬 가능) |
| **Phase 6** | 데이터 무결성·안정성 마감 — 보상 트랜잭션, 정렬, 세션 무효화 | 2일 | 없음 (병렬 가능) |

총 예상: **약 4~5주** (1인 풀타임 기준, 디자인 변경 없는 가정)

---

## 2. Phase 0 — 인프라 위생

> 다음 모든 단계의 전제. 시크릿이 살아있고 Storage가 read-only면 Phase 1~3 의미 없음.

### 0.1 시크릿 회전 + Vercel 환경 변수 이전

**작업:**
- Supabase 콘솔에서 DB 비밀번호 회전
- `openssl rand -base64 32`로 새 `JWT_SECRET` 생성
- Vercel 프로젝트에 환경 변수 등록 (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`)
- 로컬 `.env.local`은 새 값으로 갱신 (또는 1Password CLI로 셸 주입)
- `.env.local.example`에 새 변수 키만 표기

**Acceptance:**
- [ ] Vercel 배포 환경에서 로그인이 동작한다
- [ ] 로컬 `pnpm dev` 후 로그인이 동작한다
- [ ] 회전 직후 기존 세션이 모두 401 처리된다 (의도된 무효화)
- [ ] git status에 `.env.local` 변경이 안 보인다 (이미 gitignore)

### 0.2 이미지 스토리지를 Supabase Storage로 이관

**작업:**
- Supabase Storage 버킷 생성 (`diary-images`, private)
- `src/lib/storage/index.ts` 재작성:
  - `saveImage(userId, file)` → Supabase Storage upload, signed URL 반환 (TTL 7일 또는 매 조회 시 재서명)
  - `deleteImage(path)` → Storage delete
  - 파일 경로에서 `userId` 노출 제거 → `<bucketRoot>/<uuid>.<ext>` 또는 별도 매핑 테이블
- `next.config.ts`의 `images.remotePatterns`에 Supabase Storage 호스트가 이미 포함되어 있는지 확인
- 다이어리 카드/상세에서 이미지 URL 사용처 점검 (`<Image src=...>`)
- 매직 바이트 검증 추가 (`file-type` 패키지) — H-6과 함께
- SVG 차단

**Acceptance:**
- [ ] Vercel 배포에서 다이어리 이미지 업로드 → 저장 → 표시가 모두 성공
- [ ] DB에 저장된 URL이 Supabase Storage signed URL이다
- [ ] `.png` 위장한 `.svg` 파일은 reject된다 (한국어 에러 메시지)
- [ ] 기존 `/public/uploads/` 코드 삭제, 빌드 성공

### 0.3 `/api/chat` 입력 검증 + 길이 캡

**작업:**
- `src/app/api/chat/route.ts`에 Zod 스키마 추가 — `message: z.string().trim().min(1).max(2000)`
- 검증 실패 시 400 + 한국어 에러 메시지
- (레이트 리밋은 외부 공개 직전 단계로 미룸 — 지인 테스트 범위에서는 불필요)

**Acceptance:**
- [ ] 5000자 메시지 POST → 400 응답
- [ ] 빈 문자열 → 400 응답
- [ ] 정상 메시지 → 200 응답

### 0.4 `parseLocation` strict 모드

**작업:**
- `src/lib/diary/schemas.ts`의 `locationSchema`를 `.strict()`로
- `src/lib/diary/actions.ts:33-40`의 `parseLocation`이 직접 `safeParse` 후 실패 시 null 반환

**Acceptance:**
- [ ] `{lat: 999, lng: -9999}` 입력 → 검증 실패로 null 저장
- [ ] 추가 키 포함된 location 객체 → reject

---

## 3. Phase 1 — AI 채팅 살리기 + 리액션 코멘트

> 사용자 정의 핵심 기능 #2 (대화). RAG 없이도 코어 루프가 닫혀야 한다 — AI가 안 돌아도 일기-캐릭터는 살아 있어야 함.

### 1.1 외부 LLM 어댑터로 교체

**의사결정 필요:**
- Gemini 2.x Flash (무료 티어 RPM 충분, 한국어 양호) vs Groq (저렴·매우 빠름·Llama/Mixtral) — 추천: **Gemini Flash** (멀티모달이라 Phase 3에서 Vision도 같은 SDK로 재사용 가능)
- 모델 응답 토큰 max 캡 (예: 600 토큰)

**작업:**
- `src/lib/ai/` 신규 도메인 생성:
  - `client.ts` — LLM 클라이언트 추상화 (`generateText`, `generateWithImages`, `generateEmbedding` 인터페이스)
  - `gemini.ts` — Gemini 구현체
  - `prompts.ts` — system prompt 모음
- `src/app/api/chat/route.ts`가 `client.generateText`만 호출하도록 변경
- `OLLAMA_URL` 환경 변수 제거, `GEMINI_API_KEY` 환경 변수 추가
- 재시도(1회), 타임아웃(20초), 에러 시 한국어 안내 메시지 fallback

**Acceptance:**
- [ ] Vercel 배포에서 채팅 응답이 정상적으로 표시된다
- [ ] LLM 타임아웃 시 "지금은 메모가 멍하네요. 다시 말 걸어줘" 같은 한국어 fallback 표시
- [ ] 응답 토큰이 600을 넘지 않는다

### 1.2 일기 저장 직후 AI 리액션 코멘트

**작업:**
- `createDiaryAction` 성공 후 백그라운드에서 LLM에 1~2문장 코멘트 요청 (실패해도 일기 저장은 성공으로 마무리)
- 새 컬럼 `Diary.characterReaction: String?` (Prisma migration)
- 다이어리 detail 페이지에 캐릭터 말풍선으로 reaction 표시
- 기존 일기는 reaction null → "메모가 이 일기를 아직 못 봤어요" 같은 placeholder 또는 단순 미표시

**Acceptance:**
- [ ] 새 일기 작성 → detail 페이지에 캐릭터 코멘트 1~2초 후 등장
- [ ] LLM 실패해도 일기 저장은 성공 + reaction은 null로 남음
- [ ] 일기 update 시에도 reaction 갱신

### 1.3 (선택) 캐릭터 채팅을 detail 페이지 컨텍스트와 연결

**작업:**
- detail 페이지에서 "이 일기에 대해 메모와 이야기" 버튼 → 채팅 화면 진입 시 해당 diary id를 system prompt 컨텍스트로 주입
- 후속 단계에서 RAG와 자연스럽게 합쳐짐

**Acceptance:**
- [ ] detail에서 채팅 진입 시 첫 메시지가 해당 일기 컨텍스트를 인지한 응답이다

---

## 4. Phase 2 — RAG 기반 일기 검색

> 사용자 정의 핵심 기능 #3 (검색). 30개 stuff의 역PMF 구조를 끊는다.

### 2.1 pgvector 활성화 + 임베딩 컬럼

**작업:**
- Supabase 콘솔(또는 SQL)에서 `vector` extension 활성화
- `prisma/schema.prisma`에 `Diary.embedding Unsupported("vector(768)")?` 추가 (또는 별도 `DiaryEmbedding` 테이블 — Diary 1:1)
- 마이그레이션 정책 결정: `prisma/migrations/` 디렉터리 도입 또는 `supabase/migrations/` 일원화
- `task.md`의 pg_cron 24h 정리 SQL도 같은 마이그레이션 폴더로 이전

**Acceptance:**
- [ ] `\d diaries` 했을 때 embedding 컬럼이 보인다
- [ ] 마이그레이션이 `pnpm db:migrate` 또는 Supabase CLI로 재현 가능

### 2.2 임베딩 파이프라인

**작업:**
- `src/lib/ai/embeddings.ts` — Gemini text-embedding-004 (768 dim) 또는 OpenAI `text-embedding-3-small` (1536 dim)
  - **추천: Gemini text-embedding-004** (Phase 1과 동일 SDK, 무료 티어)
- `createDiaryAction`/`updateDiaryAction` 후 백그라운드에서 임베딩 생성·저장 (제목 + 본문 concat)
- 기존 일기 backfill 스크립트: `pnpm tsx scripts/backfill-embeddings.ts` (rate limit 고려, 배치 처리)
- 임베딩 실패 시 일기 저장은 성공, 추후 재시도 큐 (단순화: null로 두고 다음 update 시 재시도)

**Acceptance:**
- [ ] 새 일기 저장 → 5초 내에 embedding이 채워짐
- [ ] backfill 스크립트 실행 → 모든 기존 일기에 embedding 채워짐
- [ ] 임베딩 실패 시 일기 저장은 정상

### 2.3 검색 Server Action + UI

**작업:**
- `src/lib/diary/search.ts` 신규 — 코사인 유사도 top-K 조회
  - 옵션 1: Prisma `$queryRaw` + `<=>` 연산자
  - 옵션 2: Supabase RPC 함수 (성능 더 좋음, IVFFlat 인덱스)
  - **추천: Supabase RPC + IVFFlat 인덱스** (`docs.supabase.com`의 vector search 가이드)
- 일기 목록 페이지(`src/app/(protected)/diary/page.tsx`) 상단에 검색 입력창
- 검색 모드 2종:
  - **A. 키워드 모드** — Fuse.js 클라이언트 fuzzy (즉시 결과, 빠른 회상용)
  - **B. AI 모드** — embedding 검색 + LLM이 결과 요약 ("작년 봄에 갔던 카페 어디였더라" 같은 자연어)
- AI 모드 결과 = 관련 일기 카드 리스트 + 상단에 LLM 요약 1~2문장

**Acceptance:**
- [ ] "여행" 검색 → 키워드 모드는 즉시 매칭 일기 노출
- [ ] "작년 봄에 갔던 카페" 같은 자연어 → AI 모드가 관련 일기 3~5개 + 요약
- [ ] 검색 결과 카드 클릭 → 해당 일기 detail 이동

### 2.4 캐릭터 채팅의 검색 능력 통합

**작업:**
- `/api/chat` 라우트가 사용자 질문을 임베딩 → top-K 일기 retrieve → LLM context로 stuff
- 30개 stuff 방식 폐기 → top-5 관련 일기만 stuff (장기 사용자에서도 일관 품질)

**Acceptance:**
- [ ] 일기 100개 있는 사용자가 채팅에서 "지난여름에 뭐 했었지" 질문 → 관련 일기를 인용한 답변
- [ ] 일기 0개 사용자도 정상 응답 ("아직 작성된 일기가 없어요" 처리)

---

## 5. Phase 3 — 사진 메타데이터 → 자동 일기 생성 (핵심 기능)

> **사용자 정의 가장 핵심적인 차별화 기능.** 메모이즘이 다른 일기 앱과 구별되는 이유.

### 3.1 컨셉 정의 (구현 전 한 번 더 확정 필요)

**최소 정의 (1차 구현):**
- 사용자가 1~10장 사진 첨부
- 각 사진에서 추출:
  - **EXIF**: 촬영 시각(`DateTimeOriginal`), 위치(`GPSLatitude/Longitude`), 카메라 정보, 방향
  - **Vision (Gemini Flash multimodal)**: 사진 내용 묘사 (장소·인물·물건·분위기·날씨)
- 추출된 메타데이터 + 사용자 선택 mood + (선택) 한 줄 메모 → LLM이 자연스러운 한국어 일기 초안 생성
- 사용자가 검토/수정 후 저장

**의사결정 필요:**
- 사진 EXIF 시각이 여러 개일 때 일기 날짜 결정: 가장 이른 시각? 평균? 사용자 선택? → **추천: 가장 이른 시각 default + 사용자 변경 가능**
- 사진 위치가 여러 개일 때: 가장 이른 시각의 위치? → **추천: 동일 원칙**
- 일기 mood가 사진에서 추론 가능한가? → **추천: LLM에게 추천 mood만 제안받고, 최종은 사용자 선택**
- 자동 생성된 일기와 직접 작성 일기를 구분할 필요? → **추천: `Diary.source: enum("manual","photo_auto")` 컬럼 추가, UI에 작은 마커**

### 3.2 EXIF 추출

**작업:**
- 패키지 선택: `exifr` (가볍고 GPS 지원 좋음, 클라이언트/서버 양쪽)
- 클라이언트에서 추출 (서버 비용 절감) — 사용자 PC에서 한 번에 다중 사진 처리
- 추출 결과 타입: `PhotoMetadata { takenAt?: Date, location?: {lat, lng}, camera?: string, orientation?: number }`

**Acceptance:**
- [ ] 아이폰에서 찍은 사진 업로드 → EXIF 시각·위치 정확히 추출
- [ ] EXIF가 없는 사진 → 메타데이터 null로 처리, 후속 단계 진행

### 3.3 Vision 분석

**작업:**
- `src/lib/ai/vision.ts` 신규 — `analyzePhotos(images: File[]): Promise<PhotoAnalysis[]>`
- Gemini Flash multimodal로 각 사진에 다음 정보 요청 (한국어 응답):
  - 장면 묘사 (1~2문장)
  - 핵심 객체/인물 (예: "강아지", "카페 라떼", "한강", "친구 두 명")
  - 분위기 키워드 (예: "포근한", "활기찬", "조용한")
  - 추천 mood (6종 중 하나)
- 사진이 많으면 batch 처리 (병렬 호출, 동시성 3~5)
- 응답 캐싱: 같은 사진 hash로 재요청 시 캐시 (Phase 5에서 결정)

**Acceptance:**
- [ ] 카페 사진 1장 → "조용한 분위기의 카페에서 라떼 한 잔" 같은 묘사 반환
- [ ] 사진 5장 → 병렬 분석, 10초 이내 모두 완료
- [ ] Vision 실패 시 EXIF만으로도 다음 단계 진행

### 3.4 일기 초안 생성 LLM 프롬프트

**작업:**
- `src/lib/ai/prompts.ts`에 `generateDiaryDraftPrompt({ photoAnalyses, exif, userHint, mood, characterPersonality })` 함수
- 출력 형식 강제:
  ```json
  {
    "title": "한 줄 제목",
    "content": "본문 (한국어, 1인칭, 자연스러운 일기 톤, 200~600자)",
    "suggestedMood": "...",
    "suggestedDate": "ISO datetime"
  }
  ```
- LLM 응답을 Zod로 검증 후 사용자 검토 화면에 prefill

**Acceptance:**
- [ ] 사진 3장 + mood "happy" + 한 줄 메모 "친구랑 카페" → 자연스러운 1인칭 일기 초안 생성
- [ ] 동일 입력 두 번 → 약간 다른 표현 (LLM nondeterminism, OK)
- [ ] LLM 응답 형식 깨짐 → fallback 처리 (제목 = "오늘", 본문 = 사진 묘사 단순 나열)

### 3.5 자동 일기 생성 UI 플로우

**작업:**
- 일기 작성 화면에 두 모드 토글: **"직접 쓰기"** vs **"사진으로 자동 생성"**
- 자동 생성 모드:
  1. 사진 1~10장 업로드 (드래그앤드롭 또는 갤러리)
  2. (선택) 한 줄 힌트 입력: "친구랑 점심", "혼자 산책" 등
  3. (선택) mood 선택 (LLM이 사진 분석 후 추천도 가능)
  4. "초안 만들기" 버튼 → 로딩 (3~10초) → 자동 생성된 일기가 일반 작성 화면에 prefill
  5. 사용자가 검토/수정 후 평소처럼 저장 (이때 사진들도 함께 첨부 — 다중 이미지 지원 필요)

**의사결정 필요:**
- 현재 `Diary.imageUrl: String?`은 단일 이미지 — **다중 이미지 지원 필요?** 자동 일기는 다중 사진 전제. → **추천: `Diary.images: Json` (URL 배열)으로 마이그레이션, 또는 별도 `DiaryImage` 테이블**. 다중 지원이 핵심 기능에 필수라면 schema 변경 필수.

**작업 (다중 이미지 지원 결정 시 추가):**
- Schema 마이그레이션: `Diary.images String[]` 또는 `DiaryImage` 1:N
- 기존 `imageUrl`은 deprecate, backfill로 `images[0]`에 이전
- DiaryCard / DiaryDetail UI에 다중 이미지 표시 (캐러셀 또는 그리드)

**Acceptance:**
- [ ] 사진 3장 + 힌트 → 30초 이내 일기 초안 + 사진 3장 모두 첨부된 상태로 작성 화면 prefill
- [ ] 사용자가 본문 수정 후 저장 → 정상 저장
- [ ] detail 화면에서 사진 3장 모두 표시 (스와이프 또는 그리드)
- [ ] 자동 생성 일기에 작은 마커 ("✨ 사진으로 생성" 같은)

### 3.6 비용·레이트 가드

**작업:**
- 자동 생성 1회 = Vision N회 + LLM 1회. 비용 추적 필요.
- 사용자별 일일 자동 생성 횟수 캡 (예: 무료 트라이얼 동안 일 5회) — 코드는 추가하되 트라이얼 자체는 후순위라 일단 모두 무제한 또는 100회 같은 안전 캡

**Acceptance:**
- [ ] 일일 100회 초과 → 한국어 안내 + 실패 (지인 테스트 범위에서는 거의 발생 안 함)

---

## 6. Phase 4 — 코어 루프 강화

> 글쓰기 → 보상 피드백, 검색 UI 마감, 작명, 오늘의 일기. 작은 변경들로 D7 리텐션 잡기.

### 4.1 글쓰기 후 보상 피드백
- 일기 저장 직후 토스트: "+3 성장 포인트" + 캐릭터 카드 살짝 흔들림
- 레벨업 도달 시 모달 + 새 말풍선 카피 잠금 해제
- `growth.ts`의 `currentLevel` 변경 감지 로직 추가

**Acceptance:**
- [ ] 새 일기 저장 → 토스트 보임, 캐릭터 카드 애니메이션
- [ ] 레벨 4 → 5 도달 → 축하 모달 1회 표시

### 4.2 캐릭터 작명 의식
- 가입 후 첫 진입 시 1회 차단 모달: "이 친구의 이름을 지어주세요"
- 입력 또는 skip 가능
- localStorage 또는 `User.onboardingCompleted: Boolean` 플래그로 1회 보장

**Acceptance:**
- [ ] 신규 가입 → 첫 화면에서 작명 모달
- [ ] skip 또는 입력 후 → 다시 안 보임
- [ ] 기존 사용자는 영향 없음

### 4.3 "오늘의 일기" 위젯
- 홈 캐릭터 카드 아래 "오늘 N월 N일" 카드:
  - 비어있으면 → "오늘 첫 줄을 시작해 볼까?" CTA
  - 있으면 → 제목 + 썸네일 + 캐릭터 reaction 미리보기
- 자정 기준 KST

**Acceptance:**
- [ ] 오늘 일기 미작성 → CTA 카드
- [ ] 오늘 일기 작성됨 → 카드에 제목 + 썸네일

### 4.4 검색 UI 마감 (Phase 2의 후속)
- 일기 목록 검색 입력에 디바운스 300ms
- 검색 결과 페이지에서 "AI 모드"/"키워드 모드" 토글 명확히
- 0건 결과 시 한국어 안내

---

## 7. Phase 5 — 베타 테스트 운영 위생

> 지인 테스트 운영 중 발생할 수 있는 사고(비번 분실, 데이터 wipe 요청)를 미리 차단.

### 5.1 비밀번호 재설정
- Supabase Auth로 갈아탈지, 자체 구현할지 결정
- **추천:** 자체 구현 (1주 작업 vs Auth 마이그레이션 2주+) — 베타 단계는 자체 구현으로 충분
- 흐름: 이메일 입력 → 토큰 생성 → 이메일 발송 (Resend.com 무료 티어) → 토큰 검증 → 새 비번 입력

**Acceptance:**
- [ ] 비번 잊어버린 테스터가 이메일로 재설정 가능
- [ ] 토큰 1시간 후 만료

### 5.2 계정 탈퇴 + 데이터 내보내기
- 설정 → 위험 영역 → "계정 삭제" + "내 데이터 다운로드 (JSON)"
- 삭제는 Cascade로 자동 (Prisma `onDelete: Cascade`)
- 내보내기는 다이어리 + 캐릭터 + 채팅 이력 JSON

**Acceptance:**
- [ ] 탈퇴 버튼 클릭 → 확인 모달 → 즉시 삭제 + 로그아웃
- [ ] 내보내기 → JSON 파일 다운로드, 모든 일기 내용 포함

---

## 8. Phase 6 — 데이터 무결성·안정성 마감

### 6.1 보상 트랜잭션
- `createDiaryAction`: 이미지 업로드 후 DB insert 실패 시 `deleteImage(uploadedUrl)` 보상
- `updateDiaryAction`: 옛 이미지 삭제 실패 시 (네트워크 오류 등) 로깅 후 정상 처리 — 가비지 컬렉터 cron은 후순위

### 6.2 정렬 일관성
- `getRecentDiaries`도 `[{createdAt:desc},{id:desc}]`로 통일

### 6.3 비번 변경 시 세션 무효화
- `User.tokenVersion: Int` 추가
- JWT payload에 포함, middleware 검증 시 비교
- `changePasswordAction` 성공 시 increment

### 6.4 미들웨어 PUBLIC 매칭 정확화
- `pathname.startsWith(\`${p}/\`)` → 정확 일치 + whitelist (`/login`, `/signup` 두 개만)

### 6.5 `/design` 라우트 dev-only
- `process.env.NODE_ENV !== 'production'`일 때만 렌더, 아니면 404

---

## 9. 본 마일스톤에서 의도적으로 제외한 항목

다음은 **다음 마일스톤(`second_milestone.md`) 또는 출시 직전**으로 미룬다:

- 결제/구독 인프라 (포트원/토스 페이먼츠)
- 트라이얼 만료 cron (`subscriptionStatus` 자동 전환, `isAsleep` 갱신, D-N 알림)
- 코인 IAP / 코인 보상 / 스킨 가격 책정
- 약관/개인정보처리방침 정적 페이지 + 가입 동의 체크박스 + 14세 미만 보호자 동의
- 가입/로그인 레이트 리밋 (외부 공개 직전)
- CSP·X-Frame-Options 등 보안 헤더 (외부 공개 직전)
- 마크다운 렌더링
- 일기 공유 (US-07, OS share sheet + 카드 이미지 생성)
- 오프라인 캐시 / 동기화
- 다국어
- 푸시 알림 (PWA Push API, iOS 16.4+)
- 다이어리 update 가비지 컬렉터 cron (이미지 고아 정리)
- WCAG 2.1 AA 정량 검증

---

## 10. 마일스톤 완료 정의 (Definition of Done)

본 마일스톤이 끝났다고 선언할 수 있는 조건:

1. [ ] Vercel 배포 환경에서 회원가입 → 일기 작성(텍스트만) → 사진 업로드 일기 → 사진으로 자동 생성 일기 → 캐릭터 채팅(검색) → 비번 재설정 → 계정 탈퇴까지 한 번도 끊기지 않고 동작
2. [ ] 같은 흐름을 본인이 직접 PWA install 후 모바일에서 5일 연속 사용해 큰 결함 없음
3. [ ] 지인 3~5명에게 가입 링크를 보낼 수 있는 상태 (비밀번호 재설정·탈퇴·내보내기 모두 동작)
4. [ ] 임의의 일기 100개 시드 후 RAG 검색이 합리적 결과 반환
5. [ ] 자동 일기 생성을 사진 1·3·5·10장 케이스 모두 30초 이내 완료
6. [ ] 평가 리포트의 P0·P1·P2 체크리스트 (Phase 0~6 도합) 모두 체크됨

---

## 11. 진행 추적

각 Phase 완료 시 본 문서 하단에 짧게 기록:

```
### Phase 0 — 완료 (YYYY-MM-DD)
- 완료 항목: ...
- 변경 결정: ...
- 다음 Phase 진입 전 확인: ...
```

---

> 본 마일스톤은 사용자가 "당장 출시 안 함, 핵심 기능 완성 우선, 결제 후순위, 사진→자동 일기가 핵심"이라고 명시한 우선순위에 직접 기반함. 우선순위가 바뀌면 본 문서를 먼저 갱신하고 작업을 진행할 것.
