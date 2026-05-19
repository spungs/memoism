# Memoism — 1차 중간평가 (QA + 기획/설계)

- **평가일:** 2026-05-09
- **평가 단계:** 출시 전 — 핵심 기능 완성기 (지인 베타 테스트 직전)
- **평가자:** QA 시니어 엔지니어 페르소나 + 시니어 PM/PD 페르소나 (각각 독립 감사 후 통합)
- **평가 범위:** Next.js 15 App Router PWA, Prisma + Postgres, JWT 쿠키 세션, Server Actions, Local FS 이미지 스토리지, Ollama 기반 AI 채팅
- **평가 방법:** 정적 코드 분석(읽기 전용), README/PRD ↔ 구현 갭 분석, 코어 루프 일관성 검토

> **사용 맥락 메모:** 이 평가는 "당장 상용 출시 가능한가?"가 아니라 "지인 테스트 가능한 기능 완성도와 안정성에 도달했는가?"의 관점에서 재해석되어야 한다. 결제·법적 동선·App Store 정책 관련 항목은 *참고용* 으로만 남기고, 실제 액션 우선순위는 `Milestone/first_milestone.md` 참고.

---

## Part 1. QA 감사 결과

### 1.1 요약 (Top 5 — 테스트 차단 우선순위 기준)

1. **[BLOCKER for prod test]** 운영 환경에서 이미지 업로드 자체가 동작 불가 — `/public/uploads/`에 `writeFile`. Vercel 서버리스는 read-only FS. 지인 테스트가 Vercel 배포에서 진행된다면 이미지 첨부 모든 케이스 실패. (`src/lib/storage/index.ts:44-60`, `next.config.ts:18-25`)
2. **[BLOCKER for AI test]** AI 채팅이 `OLLAMA_URL=http://localhost:11434` 의존이라 배포 환경에서 503/네트워크 에러. 핵심 기능(대화·검색·자동 일기) 모두 죽어 있는 상태. (`src/app/api/chat/route.ts:5`, `task.md:14`)
3. **[CRITICAL]** `.env.local`에 Supabase Postgres 비밀번호와 JWT 서명 키 평문. 디스크 접근 한 번이면 DB 전체·세션 위조 가능. (`.env.local:4-5,11`)
4. **[HIGH]** `/api/chat` 입력 검증·길이 제한·레이트 리밋 모두 부재. 길이 100KB 메시지를 그대로 받아 LLM에 포워드. 외부 LLM 전환 시 비용 직격. (`src/app/api/chat/route.ts:50-53`)
5. **[HIGH]** 업로드 이미지가 `/public/uploads/<userId>/...`로 인증 없이 직접 서빙됨 + URL에 userId 노출. URL 누설 시 IDOR. (`src/lib/storage/index.ts:16-17,59`)

### 1.2 Critical (데이터 손상·보안 침해·불변식 파괴)

#### C-1. 시크릿 평문 보관
- **증상:** `.env.local`에 Supabase Postgres 비밀번호(`KH8NtcLaQAnJ4Y3u`), 32바이트 JWT 서명 키 평문. `.env`에 Supabase anon/service key 평문(주석 처리된 SERVICE_KEY 포함).
- **근거:** `.env.local:4,5,11`, `.env:1-3`. git에는 추적되지 않음(`.gitignore` OK).
- **영향:** Critical / 보안. 디스크 접근만 있으면 DB 전체 + 모든 사용자 세션 위조 가능. JWT_SECRET 변경 안 하면 과거 누설된 토큰 영구 유효.
- **권고:** (1) Supabase 콘솔에서 DB 비번 즉시 회전, (2) `openssl rand -base64 32`로 새 JWT_SECRET 생성, (3) Vercel 환경 변수로 이동, 로컬은 `direnv` 또는 1Password CLI 셸 주입.

#### C-2. 코인 잔액 음수 진입 가능 (동시성)
- **증상:** 같은 사용자가 다른 탭/디바이스에서 거의 동시에 두 스킨 구매 → 두 트랜잭션 모두 잔액 검증 통과 후 둘 다 `decrement` 실행 → 잔액 < 0 가능.
- **근거:** `src/lib/character/skin-actions.ts:27-49`. 트랜잭션 안에서 `findUnique`로 잔액 검증 후 `update({ data: { coinBalance: { decrement: ... } } })`만 실행, **잔액 조건을 `update`의 `WHERE`에 포함하지 않음**. Postgres 기본 격리 `READ COMMITTED`라 두 트랜잭션 모두 통과 가능. `Character.coinBalance`는 `CoinTransaction.amount` 합의 캐시라는 schema 주석(`prisma/schema.prisma:79`)과 정면충돌.
- **영향:** Critical / 데이터 무결성·경제 시스템 신뢰 붕괴.
- **권고:** `update({ where: { id: character.id, coinBalance: { gte: skin.coinPrice } }, data: { coinBalance: { decrement: skin.coinPrice } } })` 형태 조건부 차감. 또는 `tx.$queryRaw\`SELECT ... FOR UPDATE\``.
- **현 단계 우선순위:** 코인 시스템 자체가 비활성(스킨 가격 모두 0)이라 실제 발현 가능성 낮음 → 코인 활성화 전에만 잡으면 충분.

### 1.3 High (주요 기능 불능·권한 우회·일관성 깨짐)

#### H-1. 업로드 이미지 인증 없이 직접 서빙 (IDOR)
- **증상:** `/public/uploads/<userId>/<uuid>.<ext>` 경로로 저장. Next.js 정적 자산 → 인증 없이 누구나 다운 가능. URL UUIDv4 추측 어려움이 유일한 보호막. SW가 `image-assets` 캐시에 30일 보관(`public/sw.js`).
- **근거:** `src/lib/storage/index.ts:16-17,59` — `UPLOAD_PUBLIC_PREFIX = "/uploads"`, 반환 URL에 `ownerId` 포함. 다이어리 상세에 `<Image src={cover}>`로 그대로 들어감(`src/app/(protected)/diary/[id]/page.tsx:148`).
- **영향:** High / 보안·프라이버시.
- **권고:** Supabase Storage + signed URL 이관, 파일명·디렉터리에서 `userId` 제거.

#### H-2. 운영 환경에서 이미지 업로드 동작 불가
- **증상:** 로컬 FS(`/public/uploads/`)에 저장. Vercel 서버리스는 read-only이고 인스턴스 간 디스크 공유 안 됨.
- **근거:** `src/lib/storage/index.ts:44-60` — `mkdir`/`writeFile`로 `process.cwd()/public/uploads` 직접 기록. `next.config.ts:18-25`의 `images.remotePatterns`은 `**.supabase.co`만 허용 — 정작 사용 안 함.
- **영향:** High / 기능 불능. 프로덕션에서 모든 이미지 첨부가 500/EROFS.
- **권고:** `saveImage`/`deleteImage`를 Supabase Storage(`@supabase/supabase-js`)로 교체. `remotePatterns`에 실제 스토리지 호스트 추가.
- **현 단계 우선순위:** 자동 일기 생성 기능이 사진 의존이므로 **반드시 자동 일기 작업 시작 전에** 해결.

#### H-3. `/api/chat` 입력 검증·길이·레이트 리밋 부재
- **증상:** `userMessage` 길이 검증 없음. 100KB 메시지 그대로 DB·LLM 전달. 인증 사용자라면 `for(;;)` POST로 비용 폭주.
- **근거:** `src/app/api/chat/route.ts:49-53` — `body?.message?.trim() ?? ""` 후 빈 문자열 체크만.
- **영향:** High / 비용·안정성·보안. 외부 LLM 전환되면 비용 직격.
- **권고:** Zod로 `message: z.string().trim().min(1).max(2000)`. IP+userId 기반 sliding window 레이트 리밋(분당 10회).

#### H-4. 가입/로그인 레이트 리밋 부재
- **증상:** `loginAction`은 더미 해시 + bcrypt로 타이밍 공격은 막았지만 시도 횟수 제한 없음.
- **근거:** `src/lib/auth/actions.ts:72-108`.
- **영향:** High / 보안. 사전 공격 그대로 가능.
- **권고:** Upstash Redis sliding window. 로그인 실패 5회/15분 lockout. 회원가입 IP당 분당 3회.
- **현 단계 우선순위:** 지인 테스트만 한다면 위험 노출 작음, 외부 공개 직전에 잡아도 OK.

#### H-5. 비밀번호 정책 약함
- **증상:** `signupSchema.password.min(8).max(72)`만. 복잡도·노출 비번 검사 없음.
- **근거:** `src/lib/auth/schemas.ts:5-8`.
- **권고:** `zxcvbn` 점수 ≥ 3 강제, 또는 HIBP k-anonymity 차단.

#### H-6. 이미지 업로드 magic-byte 검증 부재
- **증상:** `file.type` 문자열만 검사. 클라이언트 보고값 위조 가능. 매직 바이트 검사 없음.
- **근거:** `src/lib/storage/index.ts:45-50`.
- **권고:** `file-type` 패키지로 매직 바이트 검사. SVG 명시 차단.

#### H-7. `parseLocation`이 임의 JSON 통과
- **증상:** `JSON.parse` 결과를 Zod 검증 없이 캐스팅만. `locationSchema`는 추가 키 reject 안 함.
- **근거:** `src/lib/diary/actions.ts:33-40`.
- **권고:** `locationSchema.strict()`. `parseLocation`이 직접 `safeParse` 후 실패 시 null.

#### H-8. `ensureSkinsSeeded` 매 페이지 렌더마다 실행
- **증상:** `/character/shop` 진입 시마다 모든 스킨 `upsert` 병렬 실행.
- **근거:** `src/lib/character/skins.ts:58-80`, `src/app/(protected)/character/shop/page.tsx:17-18`.
- **권고:** `pnpm db:seed` 분리, 또는 `globalThis.__skinsSeeded` 캐시.

### 1.4 Medium

| ID | 이슈 | 근거 | 권고 |
|---|---|---|---|
| M-1 | JWT 단방향 만료 (7일, refresh 없음) | `src/lib/auth/session.ts:7,28-30` | Sliding window 갱신 |
| M-2 | 미들웨어 `from` 쿼리 무시 | `src/middleware.ts:28`, `src/lib/auth/actions.ts:107` | `from` 검증 후 사용 (open-redirect 방지로 `/`로 시작하는 internal만) |
| M-3 | JWT 이중 검증 잔재 (이미 정리됨, task.md만 stale) | — | task.md 항목 closed 표시 |
| M-4 | `Diary.location`이 free-form `Json?` | `prisma/schema.prisma:62` | 정규화 또는 CHECK 제약 |
| M-5 | 트라이얼/구독 만료 자동 처리 잡 부재 | `src/lib/character/utils.ts:42-50`, schema 주석 | pg_cron 또는 read-time lazy 갱신 |
| M-6 | `parseDiaryDate` UTC vs 로컬 타임존 혼동 | `src/lib/diary/actions.ts:25-31` | KST 고정 또는 명시적 타임존 처리 |
| M-7 | `getRecentDiaries` 정렬에 `id` tiebreaker 없음 | `src/lib/diary/queries.ts:64` | `[{createdAt:desc},{id:desc}]` 통일 |
| M-8 | ChatMessage 24h 자동 삭제 SQL이 코드에 없음 | `task.md:30-32`, `prisma/migrations/` 부재 | `prisma/sql/` 또는 `supabase/migrations/`에 커밋 |
| M-9 | 트라이얼 만료 후에도 채팅 활성 | `src/app/api/chat/route.ts:43-105`, `src/components/character/character-chat-view.tsx:343` | `/api/chat`에 구독 검증 추가 |
| M-10 | 비번 변경 후 다른 세션 무효화 X | `src/lib/auth/actions.ts:121-159` | `User.tokenVersion: Int` + JWT payload 포함 |
| M-11 | 다이어리 update 트랜잭션 절반만 (DB update 후 옛 이미지 삭제 실패 시 고아) | `src/lib/diary/actions.ts:155-186` | 보상 트랜잭션 또는 가비지 컬렉터 cron |
| M-12 | createDiary 이미지 업로드 후 DB insert 실패 시 고아 파일 | `src/lib/diary/actions.ts:88-114` | DB insert 실패 시 `deleteImage` 보상 |
| M-13 | 회원 탈퇴 부재 | `src/components/settings/settings-view.tsx:201-213` | `deleteAccountAction` (Cascade로 자동) |

### 1.5 Low / Nit

- **L-1** 미들웨어 PUBLIC 매칭 너무 느슨 (`startsWith(\`${p}/\`)`) → `src/middleware.ts:8-9`
- **L-2** CSP·X-Frame-Options 등 보안 헤더 부재 → `next.config.ts:16-26`
- **L-3** `userScalable=false`, `maximumScale=1` — 접근성(WCAG 1.4.4) 위반 → `src/app/layout.tsx:30`
- **L-4** `react-markdown`에 `rehype-sanitize` 부재 (현재는 안전, 주석으로 향후 차단) → `src/components/diary/diary-content.tsx:35`
- **L-5** 캐릭터 채팅 시스템 프롬프트에 Prompt Injection 노출 (자기 자신만 영향) → `src/app/api/chat/route.ts:8-26`
- **L-6** `/uploads/<userId>` 디렉터리에 사용자 ID 노출
- **L-7** `bottom-sheet`의 `body.style.overflow` 복원이 다중 시트에서 깨질 수 있음 → `src/components/ui/bottom-sheet.tsx:27-36`
- **L-9** 개인정보처리방침 dead link → `src/components/settings/settings-view.tsx:327-334`
- **L-11** `.supabase/` 디렉터리 untracked → `.gitignore` 추가 결정 필요

### 1.6 미검증 영역

- DB 마이그레이션 이력 (prisma/migrations/ 부재 → schema drift 위험)
- task.md의 pg_cron 24h 정리 작업 실제 적용 여부
- 이메일 verification / forgot-password 플로우 (코드 부재)
- PWA offline 동작 — SW의 `pages` 라우트가 `NetworkFirst`라 인증 페이지 캐시 위험
- CSRF (Server Actions은 Next.js 15에서 same-origin 강제 + Secure cookie + SameSite=Lax → 사실상 불가)
- 동시 다이어리 update 시 어떤 이미지가 살아남는지
- iOS PWA install 후 세션 쿠키 동작 (WebKit ITP)
- 트라이얼 만료 후 일기 작성 가능 여부 — `createDiaryAction`에 구독 검증 없음, 비즈니스 의도 확인 필요

---

## Part 2. 기획/설계 평가

### 2.1 요약

**의도된 코어 루프:** "오늘 일기를 쓰면 → 내 캐릭터가 자라고 말을 걸어주고 → 자라난 캐릭터를 꾸미고 싶어서 코인을 사고 → 캐릭터를 잠들지 않게 하려고 구독한다."

**현재 구현된 코어 루프:** "일기를 쓰면 → 캐릭터 레벨 progress 바가 채워지고 → 캐릭터가 말풍선에서 일기를 졸라준다. 코인은 어디서도 얻거나 살 수 없고, 구독 결제 동선은 존재하지 않는다."

**한 줄 진단:** 앞쪽 두 단계(일기→캐릭터 성장)는 살아있고, 뒤쪽 두 단계(코인→구독)는 데이터 모델만 있고 동선·결제·만료 처리가 비어 있다. 그러나 사용자가 명시한 현 단계 목표("핵심 기능 완성")에 비추면 뒤쪽 사슬은 후순위가 정상이며, 오히려 **"AI 채팅(검색·리액션)" 과 "사진 메타데이터 → 자동 일기 생성"** 두 핵심 기능이 미완 또는 부재라는 점이 더 큰 갭이다.

### 2.2 PRD 품질 점수표 — 종합 2.7 / 5

| 축 | 점수 | 근거 |
|---|---|---|
| 문제 정의 | 2 | 솔루션부터 시작, why/대체재 분석 없음 (`README.md:3-7`) |
| 타깃 사용자 | 1 | 페르소나·세그먼트 부재 |
| 성공 지표 | 1 | KPI·전환율·리텐션·ARPU 모두 부재 |
| 범위/비범위 | 3 | US-07 명시 좋음, 무료/유료 경계 흐릿 |
| 수용 기준 | 3 | §8 마일스톤 1줄 acceptance |
| 리스크 | 1 | 리스크/가정/dependency 섹션 자체 없음 |

**한 줄 평:** PRD라기보다는 빌드 지시서. 시니어 PM 기준 첫 페이지 반려.

### 2.3 비전 ↔ 구현 갭 매트릭스

| 항목 | README 의도 | 실제 구현 | 상태 | 코멘트 |
|---|---|---|---|---|
| US-01 일기 CRUD + 마크다운 + 이미지 | 마크다운, 이미지 ≤10MB, 오프라인 | CRUD ✓, 1장 10MB ✓, **마크다운 미지원**, 오프라인 미지원 | 축소 | mood/위치/날짜 임의 지정 등 추가 |
| US-02 AI 빠른 검색 | 유료 사용자가 과거 일기를 AI에게 묻기 | ① "검색"이 아닌 일반 대화로 변형 ② Ollama 의존으로 **배포 환경 동작 안 함** ③ 30개 stuff(RAG·임베딩 없음) | 변형+누락 | **현 단계 핵심 작업 영역** |
| US-03 30일 무료 트라이얼 | 가입 시 1회 30일 | 가입 트랜잭션에서 TRIAL·30일 expiry ✓ | 일치 | 만료 감지 잡 부재(M-5) |
| US-04 캐릭터 수면 | 미구독 시 회색 + Zzz | `isAsleep` 필드·UI 처리 ✓, **갱신 잡 부재** | 변형 | UI는 stale 캐시 그대로 읽음 |
| US-05 코인 상점 | IAP 100/550/1200c 패키지 | `CoinPackage` 모델만, 화면·구매·시드 데이터 모두 부재 | 누락 | 모든 스킨 `coinPrice: 0` → 코인 경제 비활성. **현 단계 의도된 미구현** |
| US-06 의상 / age revert | 코인 의상 + age revert | 스킨 카탈로그·구매·장착 ✓, age revert 미구현. `Character.age` 필드는 dead column | 축소 | 5단계 성장 시스템이 age 메커닉 대체 — 좋은 변형 |
| US-07 일기 공유 | 카카오/인스타 카드 + OS share | **완전 부재** | 누락 | PWA `navigator.share`로 가능 |
| 30일 무료 + 월 ₩6,500 IAP | 결제 화면·SKU·영수증 검증 | **모두 부재** | 누락 | **현 단계 의도된 미구현** |
| 다이어리 위치 | (README 미언급) | Geolocation ✓ | 추가 | |
| 다이어리 mood | (README 미언급) | MoodPicker 6종 ✓ | 추가 | AI 안 돌면 활용 0 |
| 캐릭터 5단계 성장 | (README는 365일 1살) | 일수+일기수 합산 5레벨 ✓ | 변형 | 합리적 대체 |
| 채팅 24h 보존 | (README 미언급) | pg_cron 24h 정리 (task.md) | 추가 | 사용자에게 안내 X |
| 다이어리 검색 | §3.2 핵심 가치 | **검색 입력 자체 없음** — 월별 그룹만 | 누락 | **현 단계 핵심 작업 영역** |
| **사진 메타데이터 → 자동 일기 생성** | (README 미언급) | **완전 부재** | 누락 | **현 단계 가장 큰 누락 — 핵심 차별화 기능** |
| 약관/개인정보/탈퇴 | (한국 시장 필수) | 없음, dead link | 누락 | 출시 전 단계 — 본 평가 우선순위 밖 |

### 2.4 코어 루프 일관성 분석 — 끊긴 지점

> 결제·구독 동선 관련 P0 지적은 사용자 우선순위에 따라 후순위 처리. 본 단계에서 의미 있는 끊긴 지점만 추림.

1. **글쓰기 → 캐릭터 보상 피드백이 약함.** 일기 저장 후 detail 페이지로 이동(`src/components/diary/diary-form.tsx:171`)만 있고 캐릭터가 그 일기를 "본" 듯한 즉각 반응(레벨업 토스트, 새 말풍선, +N pt) 없음. 게임화 의도가 있는데 도파민 루프가 비어 있음.
2. **AI 응답 ↔ 일기 가치 사슬 끊김.** 30개 stuff 방식이라 장기 사용자일수록 가치가 감소(`src/app/api/chat/route.ts:55-72`). RAG 부재. AI를 "검색"이라고 약속했지만 실제론 "최근 30개 stuff 대화"임.
3. **사진 → 자동 일기**라는 차별화 메커닉이 존재하지 않음. 메모이즘이 다른 일기 앱과 구별되는 핵심 가치가 코드에 없다.
4. **다이어리 검색 부재.** 월별 그룹만(`src/components/diary/diary-list.tsx:90-135`). 60개째 일기부터 답답.
5. **캐릭터 이름 작명 의식 부재.** default "메모"로 시작(`prisma/schema.prisma:85`), 작명 모달 없음.

### 2.5 현 단계에 의미 있는 이슈만 우선순위로 (재정렬)

#### P0 — 핵심 기능 완성 차단

| # | 이슈 | 영향 | 권고 |
|---|---|---|---|
| P0-1 | 사진 메타데이터 → 자동 일기 생성 기능 부재 | 메모이즘의 핵심 차별화 가치 0 | 신규 도메인 `src/lib/diary/auto-generate/` + EXIF + Vision API 통합 |
| P0-2 | AI 채팅 배포 환경 미작동 (Ollama localhost) | 대화·검색 모두 죽음 | Gemini/Groq로 즉시 교체 |
| P0-3 | RAG 부재 — 30개 stuff로 검색 약속 위반 | 장기 사용자 가치 역구조 | pgvector + 임베딩 파이프라인 |
| P0-4 | 운영 환경 이미지 업로드 동작 불가 | 자동 일기 기능의 전제 조건 | Supabase Storage 이관 |
| P0-5 | `/api/chat` 입력 검증·레이트 리밋 부재 | 외부 LLM 전환 시 비용 폭주 | Zod + 레이트 리밋 |

#### P1 — 코어 루프 강화

| # | 이슈 | 영향 | 권고 |
|---|---|---|---|
| P1-1 | 글쓰기 ↔ 캐릭터 보상 루프 닫혀 있지 않음 | 게임화 약함, D7 이탈 | 저장 직후 토스트(+N pt), 레벨업 모달, 일별 캐릭터 메시지에 새 일기 끼워넣기 |
| P1-2 | 일기 검색 부재 | 60개째부터 답답 | (Phase A) Fuse.js 클라이언트 fuzzy → (Phase B) RAG와 통합 |
| P1-3 | 캐릭터 이름 작명 의식 부재 | 1일차 애착 약함 | 첫 진입 시 1회 모달, skip 가능 |
| P1-4 | "오늘의 일기" 위젯 부재 | 일상 의식 형성 약함 | 홈 캐릭터 카드 아래 today 마커 |
| P1-5 | 시크릿 평문 + JWT_SECRET 회전 필요 | 지인 테스트라도 위험 | 1회 회전 + Vercel 환경 변수 |

#### P2 — 안정성/UX 다지기

| # | 이슈 |
|---|---|
| P2-1 | 비밀번호 재설정 (테스터가 비번 잃으면 모든 일기 손실) |
| P2-2 | 계정 탈퇴 / 데이터 내보내기 (테스터가 wipe-and-restart 가능하게) |
| P2-3 | 다이어리 update/create 보상 트랜잭션 (M-11, M-12) |
| P2-4 | `getRecentDiaries` 정렬 tiebreaker (M-7) |
| P2-5 | 비밀번호 변경 후 세션 무효화 (M-10) |
| P2-6 | `/design` 라우트 dev-only 게이트 |
| P2-7 | 미들웨어 PUBLIC 매칭 정확화 (L-1) |
| P2-8 | 이미지 업로드 magic-byte 검증 (H-6) |
| P2-9 | `parseLocation` strict 모드 (H-7) |
| P2-10 | `ensureSkinsSeeded` 분리 (H-8) |

#### P3 — 출시 전 단계로 미룸 (현 평가 우선순위 밖)

- 결제/구독 동선 (포트원/토스 페이먼츠 통합)
- 트라이얼 만료 cron + D-N 알림 + 인앱 배너
- 코인 IAP 패키지·시드 데이터·상점 가격 책정
- 약관/개인정보처리방침 정적 페이지 + 가입 동의 체크박스 + 14세 미만 보호자 동의
- 가입/로그인 레이트 리밋 (외부 공개 직전)
- CSP·보안 헤더 (외부 공개 직전)
- 마크다운 렌더링
- 일기 공유 (US-07)
- 오프라인 캐시
- 다국어

---

## Part 3. 발견의 합집합 — 두 페르소나가 같은 결론에 도달한 항목

| 영역 | QA 관점 | 기획 관점 | 통합 결론 |
|---|---|---|---|
| AI 채팅 배포 미작동 | H-3 인프라 | P0-2/AI 재포지셔닝 | **P0 — 외부 LLM 전환 + 입력 검증 동시 처리** |
| 트라이얼 만료 처리 | M-5 cron 부재 | P0-2 만료 감지 | 현 단계 후순위 (코인/구독 자체가 후순위) |
| 채팅 권한 게이트 | M-9 구독 검증 | 코어 루프 끊김 | 코인/구독 활성화 시점에 함께 |
| 계정 탈퇴 | M-13 | P0-3 법적 인프라 | P2 — 테스트 편의성 관점에서 처리 |
| 이미지 스토리지 | H-1, H-2 | P0-3 데이터 위생 | **P0 — 자동 일기 작업 시작 전 반드시** |

---

## Part 4. 평가의 한계 (안 본 것)

- `src/components/character/character-svg.tsx`, skins 변형 디테일
- `src/app/globals.css` 디자인 토큰 정량 평가
- `next.config.ts`/`vercel.json` 인프라 결정의 적절성
- 실제 사용자 테스트·정량 데이터 (없음)
- 동적 동작 테스트 (정적 분석만 수행)
- iOS PWA install 후 쿠키 동작
- 동시 update 동작 검증
