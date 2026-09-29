# Memoism 코드 점검 보고서 (2026-09-29)

> 읽기 전용 점검 결과입니다. 이 문서를 만들 때 코드는 한 줄도 고치지 않았습니다.
> 고친 항목은 체크박스에 표시하고, 커밋 해시를 옆에 적어두세요.

## 점검 방법

| 영역 | 방법 | 범위 |
|---|---|---|
| 자동 검사 | `tsc --noEmit`, `eslint .`, `vitest run` | 전체 |
| API·인증 | 읽기 전용 리뷰어 | `src/app/api/**/route.ts` 22개, `src/middleware.ts`, `src/lib/auth/**` |
| 서버 로직 | 읽기 전용 리뷰어 | `src/lib/diary/**`, `src/lib/ai/**`, `src/lib/character/**`, `src/lib/storage/**`, `src/lib/push/**` |
| 화면 | 읽기 전용 리뷰어 | `src/components/**`, `src/app/(protected)/**`, `src/app/(auth)/**`, `src/providers/**` |
| 설정·DB·문서 | 직접 확인 | `prisma/`, `package.json`, `eslint.config.mjs`, `CLAUDE.md`, `DESIGN.md` |

**확인 수준 표시**
- **[직접 확인]**: 리뷰어가 찾은 것을 메인 세션에서 코드를 열어 다시 확인함
- **[리뷰어 확인]**: 리뷰어가 코드를 읽고 확인함 (메인 세션 재확인 전)
- **[추정]**: 기기·운영 환경에서 봐야 확정됨

## 자동 검사 결과

- 타입 오류 0건, 테스트 18개 파일 / 167개 통과
- 린트: 오류 0건, 경고 3건. 모두 빌드 산출물 `public/worker-*.js`에서 나옴 → D3 참고
- DB: 운영(서울)·로컬 DB 모두 `schema.prisma`와 정확히 일치 (`prisma migrate diff` 결과 빈 마이그레이션)
- 디자인: `DESIGN.md` 프론트매터 색상 15개가 모두 `globals.css`에 있음

## 요약

| 심각도 | 건수 | 한 줄 요약 |
|---|---|---|
| 높음 | 8 | 기록이 엉뚱한 날짜로 감, 입력 유실, 중복 일기, 사진 파일 공유로 인한 손상, 비용 남용, 사용 횟수 미반납, cron 인증 |
| 중간 | 23 | 회상이 조각을 못 봄, 소수를 날짜로 오인, 영어 오류 노출, 경쟁 상태, 푸시 구독 검증 부재 등 |
| 낮음 | 20 | 규약·문구·접근성·정리 |
| 설정·문서 | 4 | CLAUDE.md 낡음, 안 쓰는 의존성, 린트 설정, 마이그레이션 이력 |

**정해주셔야 할 것**
1. 하루에 일기를 하나만 둘지 (M5)
2. 메이·밀린 날 채우기로 생긴 일기의 감정을 평온으로 채울지 (M23)
3. 16px 미만 입력칸을 뷰포트 설정에 맡길지, 16px로 통일할지 (L19)

**추천 순서**
1. 높음 8건 (각각 재현 테스트 포함)
2. "화면에 영어 오류가 뜨는 문제" 묶음: M8(응답 처리 공용화) + M20(검색 원문) + M21(Unauthorized)
3. 메이 회상·날짜 판정: M1, M2, M3
4. 나머지 중간 → 낮음

---

## 높음

### - [x] H1. 밤 9시~자정에 메이에게 남긴 기록이 전날 일기로 들어감 [직접 확인] — 수정 `bb5e3ab5`
- **분류:** 버그
- **위치:** `src/lib/diary/capture-date.ts:52-61`
- **근거**
  ```ts
  const isNight = hour >= 21 || hour < 4;
  if (isNight) {
    return { kind: "resolved", dateKey: kstDateKey(new Date(now.getTime() - DAY_MS)), label: "어제", ... };
  ```
- **문제:** 스펙(파일 상단 주석 3번)은 "자기 전 몰아서 기록하다 자정을 넘겨도 오늘"로 보내려는 규칙입니다. 그런데 21~23시에도 24시간을 빼서, KST로 아직 같은 날인 기록이 전날로 갑니다.
- **시나리오:**
  - 9/29 22:00에 "저녁에 국수 먹었어"를 보내면 9/28 일기에 조각이 쌓이고, 칩에 "어제"가 뜹니다.
  - 날짜 정보(EXIF)가 없는 사진도 함께 전날로 갑니다.
  - 22시 리마인드 푸시 직후가 기록이 가장 몰리는 시간대입니다.
- **테스트 공백:** `capture-date.test.ts`는 01:00만 검증합니다.
- **고치는 방향:** 21~23시는 오늘, 0~3시만 전날로 보냅니다. 22:00과 23:59 테스트를 추가합니다.

### - [x] H2. 미래 날짜를 말하면 오늘 칸에 일기가 계속 새로 생김 [직접 확인] — 수정 `7af67a66` (해외여행 시간대 작업과 함께)
- **분류:** 데이터 정합성
- **위치**
  - `src/lib/diary/queries.ts:338-360` (`getOrCreateDiaryForDate`)
  - `src/lib/diary/kst.ts:59-64` (`diaryCreatedAtForDateKey`: 미래 날짜면 `now` 반환)
  - 들어오는 경로: `src/lib/diary/capture-date.ts:35-41`(미래 검사 없음), `src/lib/ai/rag.ts:157-161`(연도 없는 날짜를 올해로 해석), `src/app/api/diaries/backfill/photos/route.ts:13`(정규식만 검사)
- **문제:** 미래 날짜 범위를 조회해서 결과가 없으면 새 일기를 만듭니다. 그런데 생성 시각은 `now`, 즉 **오늘**입니다. 다음 호출도 미래 범위를 조회하니 다시 못 찾고, 또 만듭니다.
- **시나리오:** 9/29에 "10월 3일 등산 가기로 했어"가 기록으로 분류되면, 오늘 칸에 일기가 하나 더 생기고 칩에는 "10월 3일"이 뜹니다. 같은 말을 또 하면 세 번째 일기가 생깁니다. 조각이 여러 컨테이너로 흩어지고, 정리는 그중 하나만 됩니다.
- **고치는 방향**
  - `getOrCreateDiaryForDate`가 `dateKey > kstTodayKey()`를 거부합니다.
  - `resolveCaptureDate`는 미래 날짜를 명시 표현으로 인정하지 않습니다.
  - backfill 라우트에도 미래 검사를 넣습니다.

### - [x] H3. 검토 화면에서 저장 중 오류가 나면 고친 제목·본문이 사라짐 [직접 확인] — 수정 `ba524eed`
- **분류:** 버그
- **위치:** `src/components/diary/review-gate.tsx:229-243`
- **근거:** `const result = await createDiaryAction(fd);`를 try/catch 없이 호출합니다. 같은 상황을 `diary-form.tsx:526-533`은 잡아서 입력을 지킵니다.
- **문제:** 서버 액션이 예외를 던지면 에러 바운더리로 넘어갑니다. 이 화면은 감정과 날짜만 sessionStorage에 쓰고, 제목·본문 수정분은 state에만 들고 있습니다.
- **시나리오:** AI 초안을 몇 분 고친 뒤 저장합니다. "잠시 문제가 생겼어요"가 뜨고, 다시 시도하면 AI 원본으로 돌아가 있습니다.
- **고치는 방향:** diary-form처럼 catch로 잡아 화면 안에 오류를 표시합니다. 제목·본문도 sessionStorage에 반영합니다.

### - [x] H4. 검토 화면에서 저장해도 작성 화면 임시저장 초안이 남아 같은 일기가 두 번 저장될 수 있음 [직접 확인] — 수정 `ba524eed`
- **분류:** 버그
- **위치**
  - `src/components/diary/review-gate.tsx:245-248` (저장 성공 후 `sessionStorage`만 지움)
  - `src/components/diary/diary-form.tsx:31`, `344`, `396`, `522` (`memoism:draft:new`를 지우는 곳은 이 파일뿐)
- **문제:** 작성 화면은 AI 정리로 넘어갈 때 초안을 일부러 남깁니다(취소하고 돌아오면 복원하려고). 그런데 검토 화면에서 저장에 성공해도 이 키를 지우지 않습니다.
- **시나리오:** 같은 날 + 버튼을 누르면 "이전에 작성 중이던 내용이 있어요" 배너가 뜨고, 불러와 저장하면 같은 일기가 두 편 생깁니다.
- **고치는 방향:** 저장에 성공하면 `localStorage.removeItem("memoism:draft:new")`를 부릅니다. 키 상수는 공용 모듈로 옮깁니다.

### - [x] H5. 검토 화면 "다시 생성"이 사진 경로의 소유자와 장수를 검사하지 않음 [직접 확인] — 수정 `5135f858`
- **분류:** 보안 / 비용
- **위치**
  - `src/app/api/diaries/preview-regenerate/route.ts:22` (`storagePaths: z.array(z.string())`: `.max()` 없음)
  - `src/lib/diary/preview-generate.ts:92-94` (받은 경로를 그대로 다운로드)
  - `src/lib/storage/index.ts:344-350` (`downloadAsBase64`: `..`만 차단, service role 권한)
- **비교:** 같은 검토 화면에서 경로를 받는 다른 곳은 둘 다 막고 있습니다.
  - `src/lib/storage/actions.ts:33-40`: 10장 상한 + 소유자 확인
  - `src/lib/diary/actions.ts:103-107`: `${userId}/` 접두사 확인
- **시나리오**
  - [직접 확인] 내 경로 하나를 90번 반복해 보내면 사용 횟수 1회로 사진 90장짜리 AI 호출이 나갑니다. 비용과 함수 메모리가 급증합니다.
  - [추정] 다른 사용자의 `{userId}/{uuid}.jpg`를 알면 그 사진 내용이 AI 초안으로 나옵니다. uuid라서 추측은 어렵고, 경로 유출이 전제입니다.
- **고치는 방향:** 라우트에서 `.max(MAX_IMAGES_PER_REQUEST)`를 적용하고, 접두사가 `${session.userId}/`가 아닌 경로는 400으로 막습니다.

### - [x] H6. AI가 실패했는데 사용 횟수를 돌려주지 않는 경로 2곳 [직접 확인 · 리뷰어 2명 각각 발견] — 수정 `e220107f`
- **분류:** 규약 위반
- **위치**
  - 메이 회상: `src/app/api/chat/route.ts:525-565`. insight를 차감한 뒤 `chat()`이 실패하면 502만 반환합니다.
  - 사진 일기 정리: `src/lib/diary/auto-generate.ts:88-128`. 차감한 뒤 사진 업로드가 실패하면 반납 없이 반환합니다.
- **비교:** regenerate, organize, preview는 AI를 부르지 못했거나 실패하면 반납합니다(`src/lib/ai/usage.ts:115-128`의 정책).
- **시나리오:** FREE 사용자가 회상 질문을 보냈는데 Gemini 과부하로 재시도까지 모두 실패하면, 답은 못 받고 하루 3회 중 1회가 사라집니다.
- **부수 문제 (auto-generate)**
  - 오류 문구가 "이미지 업로드 실패: 이미지 업로드 실패: <Supabase 원문>"처럼 두 번 겹치고, 원문이 사용자에게 보입니다.
  - persona 조회나 `arrayBuffer()`에서 예외가 나도 반납 없이 500이 됩니다.
- **고치는 방향:** 두 곳의 catch에서 `releaseIncrement`를 부릅니다. auto-generate는 차감 시점을 업로드 **뒤**, `generateDiary` 직전으로 옮기는 게 근본적인 해결입니다. 오류 문구는 고정 한국어로 바꿉니다.

### - [x] H7. cron 비밀키가 비어 있는 배포에서는 누구나 cron을 부를 수 있음 [직접 확인] — 수정 `74dfbeb9`
- **분류:** 보안 (환경에 따라 발생)
- **위치:** `src/app/api/cron/reminder/route.ts:16`, `src/app/api/cron/gc-orphans/route.ts:59`, `src/middleware.ts:28`(`/api/cron/*`는 세션 검사 우회)
- **근거:** `if (auth !== \`Bearer ${process.env.CRON_SECRET}\`)`. 환경변수가 없으면 기준값이 `"Bearer undefined"`가 됩니다. 상수 시간 비교도 아닙니다.
- **시나리오:** CRON_SECRET이 없는 프리뷰·스테이징 배포에서 `Authorization: Bearer undefined`로 호출할 수 있습니다.
  - `gc-orphans?execute=true&force=true`: 스토리지 삭제가 실행됩니다.
  - `reminder`: 전 사용자에게 푸시가 나갑니다.
  - 그 배포가 운영 DB·스토리지를 가리키면 피해가 운영에 납니다.
  - 현재 운영에는 키가 설정돼 있습니다(`gc-orphans` 주석 기준).
- **고치는 방향:** 공용 `verifyCronAuth(req)`를 만들어 두 라우트가 같이 씁니다. 키가 없으면 무조건 거절하고, `timingSafeEqual`로 비교합니다. CLAUDE.md 필수 환경변수 목록에 CRON_SECRET을 추가합니다.

### - [x] H8. 같은 사진 파일을 일기 두 개가 나눠 가질 수 있음 → 한쪽을 지우면 다른 쪽 사진이 깨짐 [리뷰어 확인] — 수정 `142ac2d7`
- **분류:** 데이터 정합성
- **위치:** `src/lib/diary/actions.ts:95-113`, `184-188`, `234-255`, `520`
- **문제:** 미리 올려둔 사진 경로(검토 화면에서 저장할 때)를 받을 때, 경로 중복을 제거하지 않고 이미 다른 `DiaryImage`가 참조하는 경로인지도 확인하지 않습니다.
- **시나리오**
  - 검토 화면에서 저장했는데 응답이 유실됩니다. sessionStorage 초안이 남아 있으니 다시 저장합니다.
  - 같은 storagePath를 가진 일기가 두 개 생기고, `storageUsedBytes`도 두 번 증가합니다.
  - 이후 한쪽 일기를 지우면 `deleteImage`가 공유 파일을 삭제해서 **남은 일기의 사진이 복구 불가로 깨집니다.**
- **부수 문제:** try 블록이 커밋 이후 작업까지 감싸고 있어서, 보상 삭제가 커밋된 사진을 지울 수 있는 구조입니다. 다만 뒤따르는 호출이 모두 예외를 삼키고 있어 실제로 도달할 가능성은 낮습니다.
- **고치는 방향**
  - 경로 중복을 제거합니다.
  - 트랜잭션 안에서 이미 참조 중인 경로면 거부합니다.
  - 삭제할 때는 다른 참조가 없는 경로만 지웁니다.
  - try 범위를 트랜잭션으로 좁힙니다.

---

## 중간

### 데이터·AI

#### - [ ] M1. 메이 회상이 조각 내용을 모델에 넘기지 않음 [리뷰어 확인]
- **위치:** `src/lib/ai/rag.ts:118-124`, `267-280`, `src/app/api/chat/route.ts:150`, `168`, `474-485`
- **문제**
  - 임베딩에는 조각이 포함돼 있어(`fragment-embed.ts`) 벡터 검색은 채팅으로만 기록한 날을 찾아냅니다.
  - 그런데 프롬프트에는 `d.content`만 넣어서, 그날이 빈 문자열로 보입니다.
  - 키워드 검색도 제목·본문만 봅니다.
  - 최근 5건 목록에는 빈 껍데기 일기(`NOT_EMPTY_DIARY` 미적용)도 섞입니다.
- **시나리오:** 정리하지 않은 9/20 조각 "성수동 카페 갔어"가 있을 때 "성수동 언제 갔지?"라고 물으면, 모델에는 `[9월 20일 · 유사도 0.70] : `(내용 없음)만 보입니다. 결과는 "기록 없음"이거나 지어낸 답입니다.
- **고치는 방향:** 아직 정리하지 않은 텍스트 조각도 가져와 프롬프트 본문에 합칩니다. 키워드 검색 대상에 조각을 넣고, 최근 목록에서 빈 일기를 뺍니다.

#### - [ ] M2. "2.5시간", "1.5배"를 날짜로 오인하고, 같이 보낸 사진까지 그 날짜로 보냄 [리뷰어 확인]
- **위치:** `src/lib/ai/rag.ts:164-166` (`/\b(\d{1,2})[\/.](\d{1,2})\b/g`)
- **문제:** JS의 `\b`는 ASCII 기준이라 뒤에 한글이 오면 경계로 봅니다. 그래서 "2.5시간", "1.5배", "3.30에"가 날짜로 매칭됩니다.
- **시나리오**
  - "오늘 2.5시간 걸었어": 날짜 참조가 2개("2월 5일", "오늘")라서 되묻기가 됩니다.
  - "2.5시간 걸었어": 참조가 1개라 명시 표현으로 인정되고, 함께 보낸 **사진 전부**가 EXIF를 무시하고 2/5 일기로 갑니다(`resolvePhotoDates`).
- **고치는 방향:** 점(.) 형식은 뒤에 숫자나 단위가 붙으면 제외하거나, 슬래시 형식만 인정합니다. 회귀 테스트를 추가합니다.

#### - [ ] M3. 메이 채팅에서 사진 저장이 실패하면 텍스트 기록도 사라지고, 오류 원문이 메이의 말로 남음 [리뷰어 확인]
- **위치:** `src/lib/ai/capture.ts:172-175`, `src/lib/diary/capture-photos.ts:62`, `107`
- **문제:** `createFragment`에 도달하기 전에 반환하고, `reply: saved.error`(Prisma·Supabase `e.message`)를 ASSISTANT 메시지로 저장합니다.
- **시나리오:** "오늘 한강 갔다"를 사진과 함께 보냈는데 Supabase에 일시 오류가 나면, 일기에는 아무것도 남지 않고 채팅에는 "이미지 업로드 실패: <원문>"이 영구히 남습니다.
- **고치는 방향:** 사진이 실패해도 텍스트 조각은 저장합니다. 사용자에게는 고정 한국어 문구를 보여주고, 원문은 로그에만 남깁니다.

#### - [ ] M4. 조각을 다른 날로 옮겨도 "정리됨" 표시가 유지됨 [리뷰어 확인]
- **위치:** `src/lib/diary/fragment-actions.ts:83-86`, `src/lib/diary/capture-actions.ts:111-114`
- **문제:** 두 이동 경로 모두 `diaryId`만 바꾸고 `foldedAt`은 그대로 둡니다.
- **시나리오:** 9/27 본문에 이미 반영된 조각을 9/26으로 옮기면, 9/26에서 정리해도 "정리할 새 조각이 없어요"가 뜹니다. 반면 9/27 본문과 임베딩에는 그 문장이 남아 회상이 틀린 날짜를 인용합니다.
- **부수 문제:** `recaptureDateAction`이 사진을 옮길 때 `orderIndex`를 다시 매기지 않습니다. 대상 일기의 기존 사진과 번호가 겹칩니다(유니크 제약은 없음).
- **고치는 방향:** 이동할 때 `foldedAt: null`로 초기화하고, 옮긴 사진은 대상의 max(orderIndex)+1부터 다시 매깁니다.

#### - [ ] M5. 하루에 일기 하나라는 규칙이 강제되지 않음 [리뷰어 확인 · 정책 결정 필요]
- **위치**
  - `src/lib/diary/queries.ts:343-359`: findFirst 뒤 create를 해서 원자적이지 않습니다. schema에는 인덱스만 있고 유니크 제약이 없습니다.
  - `src/lib/diary/actions.ts:235-247`: 수동 작성은 항상 새 Diary를 만듭니다.
  - `src/lib/diary/actions.ts:304-313`: 오늘 일기를 수정하면 `createdAt`이 now로 바뀌어, "가장 이른 컨테이너"가 어느 것인지가 달라집니다.
- **시나리오:** 그날 첫 채팅을 연달아 두 번 보내면 일기가 두 개 생깁니다. 채팅으로 생긴 일기가 있는 날에 수동으로 일기를 쓰면 캘린더에 두 개가 뜨고, 정리와 제안이 따로 돕니다.
- **결정 필요:** 하루 하나로 강제할지, 수동 작성을 기존 일기에 합칠지 정해야 합니다.
- **고치는 방향:** `(userId, dateKey)` 유니크 제약이나 advisory lock을 걸고, 수동 작성 정책을 정합니다.

#### - [ ] M6. 계정 삭제가 사진을 먼저 지우고 DB를 나중에 지움 [리뷰어 확인]
- **위치:** `src/app/api/account/delete/route.ts:27-39`
- **문제:** `deleteImages` 다음에 `user.delete`를 합니다. DB 삭제가 실패하면 계정은 살아 있는데 사진이 모두 사라집니다. CLAUDE.md의 "DB 먼저, 스토리지 나중" 규약과 반대입니다.
- **고치는 방향:** DB를 먼저 지우고 스토리지는 best-effort로 지웁니다. 48시간 유예를 둔 GC가 고아 파일을 정리합니다.

#### - [ ] M7. 밀린 날 채우기: 업로드 도중 실패한 뒤 다시 시도하면 사진이 중복 저장됨 [리뷰어 확인]
- **위치:** `src/lib/diary/backfill.ts:64-69`, `86-101`, `src/components/diary/backfill-client.tsx`의 `run()`
- **문제**
  - 부분 실패 후 다시 누르면 `keep` 전체를 다시 보냅니다. `DiaryImage` 행, 스토리지 객체, 카운터가 모두 중복됩니다. 메모는 중복을 막는데 사진은 막지 않습니다.
  - `appendNoteToDiary`가 사진 트랜잭션 밖에 있어서, 여기서 예외가 나면 사진은 저장된 채 500이 됩니다.
  - 메모를 붙인 뒤 재임베딩을 하지 않습니다.
- **고치는 방향:** 클라이언트가 저장에 성공한 묶음을 건너뛰거나, 사진별 멱등 키를 둡니다. 메모를 붙인 뒤에는 `reembedDiaryWithFragments`를 호출합니다.

### 화면

#### - [ ] M8. 응답 성공 여부를 확인하기 전에 JSON부터 읽는 곳 6곳 이상 + 처리 안 된 예외가 JSON이 아닌 500으로 나감 [리뷰어 확인 · 리뷰어 2명 각각 발견]
- **위치 (클라이언트)**
  - `src/components/diary/diary-form.tsx:566`, `599`
  - `src/components/character/character-chat.tsx:201`, `241`, `381`, `429`
  - `src/components/diary/diary-ai-actions.tsx:100`, `118`
  - `src/components/diary/review-gate.tsx:283`, `319`
  - `src/components/diary/diary-search-view.tsx:74`, `82`
  - `src/components/diary/backfill-client.tsx:590`, `623`
- **위치 (서버, 최상위 try/catch 없음)**
  - `src/lib/diary/regenerate.ts:187-214`
  - `src/lib/diary/organize.ts:211-242`
  - `src/app/api/chat/route.ts:439-459`, `620-640`
- **문제:** 413·502·504는 본문이 HTML이라 `res.json()`에서 먼저 예외가 납니다. catch는 `e.message`를 그대로 화면에 띄웁니다. 사진은 압축에 실패하면 원본을 그대로 보내고(`image-compress.ts:24-27`) AI 경로는 오래 걸리니, 실제로 일어날 수 있는 경로입니다.
- **시나리오**
  - 작성·수정·검토·검색 화면: "Unexpected end of JSON input" 같은 영어 문장이 빨간 글씨로 뜹니다.
  - 메이 채팅: 원인이 "잠시 응답하지 못했어요"로 가려집니다.
  - 밀린 날 채우기: 504가 나면 서버에서는 정리가 끝났을 수도 있는데 화면에는 "사진만 저장했어요"로 뜹니다. 다시 누르면 사용 횟수를 한 번 더 씁니다.
- **고치는 방향**
  - `backfill-client.tsx`의 `readError`를 공용 유틸로 올립니다. `!res.ok`를 먼저 처리하고, catch에서는 고정 한국어 문구를 씁니다.
  - 서버 라우트는 공용 `withJsonErrors()` 래퍼로 감싸 `{ error }` + 500을 보장합니다.

#### - [ ] M9. 월 선택 시트의 버튼 배경이 보이지 않음 — 정의되지 않은 색 변수 [직접 확인]
- **위치:** `src/components/diary/month-picker-sheet.tsx:119`, `149` (`var(--fill-secondary)`)
- **문제:** `globals.css`에도 `DESIGN.md`에도 없는 변수라 배경이 투명으로 처리됩니다.
- **시나리오:** 연·월 선택 시트의 1~12월 버튼과 "닫기"가 글자만 떠 있어서 누를 영역이 보이지 않습니다.
- **고치는 방향:** `var(--fill-2)`로 바꿉니다.

#### - [ ] M10. 검토 화면 "다시 생성" 중에도 입력이 열려 있어, 결과가 오면 고친 내용을 덮어씀 [리뷰어 확인]
- **위치:** `src/components/diary/review-gate.tsx:254-317`, `664-703`, `464-466`
- **문제:** 같은 재정리를 작성·수정 화면은 전체 차단 오버레이(`AiBusyOverlay`)와 취소 버튼으로 처리합니다. 검토 화면만 입력을 막지 않고 취소 수단도 없습니다. 생성 중 저장 버튼은 비활성인데 색은 활성처럼 보입니다.
- **시나리오:** 생성을 기다리면서 본문을 고치면 10~20초 뒤 그 수정이 사라집니다.
- **고치는 방향:** 다른 두 화면처럼 `AiBusyOverlay`와 `AbortController`를 적용합니다.

#### - [ ] M11. 수정 화면에서 조각을 정리한 뒤에도 "조각 N개로 정리하기" 문구가 그대로임 [리뷰어 확인]
- **위치:** `src/components/diary/diary-form.tsx:1084`, `src/components/diary/diary-ai-actions.tsx:66-72`, `105-111`
- **문제:** 조각 수가 초기값(`initial?.unfoldedCount`)에 고정돼 있고, 정리 결과에 조각 수가 담겨 오지 않습니다.
- **시나리오:** 정리 직후에도 같은 문구가 보이고, 다시 누르면 "정리할 새 조각이 없어요" 계열 오류가 납니다.
- **고치는 방향:** 정리에 성공하면 조각 수를 0으로 갱신하거나 `router.refresh()`를 호출합니다.

#### - [ ] M12. 검색어를 빨리 바꾸면 이전 결과가 새 결과를 덮음 [리뷰어 확인]
- **위치:** `src/components/diary/diary-search-view.tsx:63-88`
- **문제:** cleanup이 타이머만 지웁니다. 이미 나간 요청은 취소하지 않고, 응답이 어느 검색어의 것인지도 확인하지 않습니다.
- **고치는 방향:** `AbortController`를 쓰거나, 응답의 검색어가 최신 검색어와 같을 때만 반영합니다.

#### - [ ] M13. 메이 채팅에서 글 전송이 실패해도 보낸 것처럼 남고, 입력창은 비워짐 [리뷰어 확인]
- **위치:** `src/components/character/character-chat.tsx:359-361`, `400-406`, `429-434`
- **문제:** 실패하면 사진이 있을 때만 말풍선을 되돌립니다. 글만 보낸 경우 `setDraft("")`가 이미 실행돼서 원문이 사라집니다.
- **시나리오:** 연결이 끊긴 상태에서 오늘 일을 보내면 기록된 줄 압니다. 새로고침하면 없습니다.
- **고치는 방향:** 실패 표시와 재전송 버튼을 붙이거나, 말풍선을 되돌리고 `setDraft(text)`로 원문을 복원합니다.

#### - [ ] M14. 비밀번호를 바꾼 뒤 시트를 다시 열면 0.6초 만에 저절로 닫힘 [리뷰어 확인]
- **위치:** `src/components/settings/settings-view.tsx:494-497`, `595-601`
- **문제:** `useActionState`의 `state.ok`가 true로 남아 있고, `onClose`는 렌더마다 새 함수입니다. 그래서 다시 열 때 effect가 또 돌아 600ms 뒤에 닫습니다.
- **고치는 방향:** 열릴 때만 마운트하거나 `key`로 리마운트해서 상태를 초기화합니다.

#### - [ ] M15. 서버 액션 예외 처리가 없는 곳 5곳 — 약한 네트워크에서 로그아웃 시트에 갇힘 [리뷰어 확인]
- **위치**
  - `src/components/settings/settings-view.tsx:109-112`, `156-160`
  - `src/components/diary/diary-ai-actions.tsx:131-141`
  - `src/components/character/capture-correction-sheet.tsx:62-75`
  - `src/components/diary/fragment-timeline.tsx:69-99`
  - `src/components/diary/diary-detail-actions.tsx:20-31`
- **문제:** try/catch 없이 await합니다. 로그아웃은 예외가 나면 로딩 상태가 true로 고정되고, 확인 시트가 로딩 중에는 닫기를 막습니다.
- **고치는 방향:** 공용 catch 래퍼를 만들어 화면 안에 오류를 표시합니다(diary-form 방식).

#### - [ ] M16. 사진 선택 처리가 화면마다 다름 [리뷰어 확인 · iOS 재선택 동작은 추정]
- **위치:** `src/components/diary/diary-form.tsx:405`, `327-333`, `src/components/diary/backfill-client.tsx`의 `handlePick`
- **문제**
  - 작성 화면은 남은 칸보다 많이 고르면 `files.slice(0, slotsLeft)`로 초과분을 안내 없이 버립니다. 채팅과 밀린 날 채우기는 몇 장 담았는지 알려줍니다.
  - 작성 화면의 언마운트 시 blob URL 해제가 `[]` deps 클로저라서 아무것도 해제하지 않습니다.
  - 밀린 날 채우기는 file input의 value를 초기화하지 않습니다. 그래서 같은 사진을 다시 고르면 반응이 없을 수 있습니다(추정).
- **고치는 방향:** "N장만 담았어요" 안내를 넣고, 해제는 ref 패턴(`character-chat.tsx:248-255`)으로 바꾸고, value를 초기화합니다.

#### - [ ] M17. 사진 공개에 동의한 뒤 사진 선택창이 안 열릴 수 있음 (iOS) [추정]
- **위치:** `src/components/character/character-chat.tsx:295-309`
- **문제:** 서버 액션을 await한 뒤 finally에서 `fileRef.current?.click()`을 부릅니다. iOS Safari는 사용자 제스처가 끝난 뒤의 file input 클릭을 막는 경우가 많습니다.
- **고치는 방향:** 탭 핸들러 안에서 동기로 click을 먼저 하고, 동의 저장은 그 뒤에 처리합니다. 실기기에서 확인해야 합니다.

#### - [ ] M18. 다크 모드에서 대비가 무너지는 색 [리뷰어 확인 · 대비 수치는 계산 추정치]
- **위치와 문제**
  - `src/components/diary/mood-badge.tsx:35`: 글자색을 `color-mix(in srgb, ${color} 75%, #000)`로 검정과 섞습니다. 다크 배경에서 화남·슬픔 배지가 약 2~2.6:1입니다.
  - `src/components/diary/review-gate.tsx:684`: 구분선이 `rgba(60,56,50,0.10)`(라이트 값)으로 고정돼 다크에서 보이지 않습니다. `--separator` 토큰이 이미 있습니다.
  - `src/components/diary/mood-picker.tsx:87`: 선택된 칸의 `#fff` 글자가 기쁨(#E9A13B) 위에서 약 2.2:1입니다.
- **고치는 방향:** 배지 글자색을 다크 모드용으로 분기하거나 토큰으로 만들고, 구분선은 `var(--separator)`로 바꿉니다.

### API

#### - [ ] M19. 푸시 구독 주소를 아무 URL이나 개수 제한 없이 등록할 수 있음 [리뷰어 확인 · 내부망 도달 여부는 추정]
- **위치:** `src/lib/push/schemas.ts:5`, `src/app/api/push/subscribe/route.ts:25-39`, `src/lib/push/web-push.ts:66-76`
- **문제:** `z.string().url()` 검사만 있어서 `http://` 주소나 내부 호스트도 들어갑니다. 사용자당 구독 수 제한이 없고, 발송에 타임아웃도 없습니다.
- **시나리오**
  - 수천 개를 등록하면 매일 22시 cron이 그 전부에 요청을 보냅니다(서버발 요청 위조).
  - 응답하지 않는 주소가 하나만 있어도 `allSettled`가 끝나지 않아 함수가 타임아웃되고, 만료 구독 정리가 실행되지 않습니다.
- **고치는 방향:** `https:`만 허용하고 호스트를 알려진 푸시 서비스로 제한합니다(fcm.googleapis.com, *.push.apple.com, updates.push.services.mozilla.com, *.notify.windows.com). 사용자당 구독 상한과 `sendNotification` 타임아웃을 둡니다.

#### - [ ] M20. 검색 오류가 나면 DB 접속 정보가 담긴 원문이 화면에 노출됨 [리뷰어 확인]
- **위치:** `src/app/api/diaries/search/route.ts:34-41`, 표시하는 곳 `src/components/diary/diary-search-view.tsx:76`
- **근거:** `{ error: \`검색 실행 중 오류가 발생했어요: ${msg}\` }`
- **고치는 방향:** 원문은 `console.error`로만 남기고, 응답에는 고정 문구를 씁니다.

#### - [ ] M21. 로그인이 만료되면 영어 "Unauthorized"가 화면에 그대로 뜸 [리뷰어 확인]
- **위치:** `src/middleware.ts:60`과 대부분의 라우트(`{ error: "Unauthorized" }`). 일부만 한국어입니다(`push/subscribe/route.ts:11`, `usage/route.ts:10`).
- **시나리오:** 다른 기기에서 비밀번호를 바꾸면 이 기기의 토큰은 미들웨어를 통과합니다. 하지만 `getSession`이 tokenVersion 불일치로 null이 되고 401을 반환합니다. 그러면 `diary-form.tsx:569`와 `settings-view.tsx:147`이 영어 "Unauthorized"를 빨간 글씨로 표시합니다.
- **고치는 방향:** 공용 `unauthorized()` 응답(한국어 문구)을 만들고, 클라이언트는 401을 받으면 `/login`으로 보냅니다.

#### - [ ] M22. 오래 걸리는 AI 라우트 4곳에 실행 시간 한도가 없음 [리뷰어 확인 · 실제 영향은 프로젝트 기본값에 따라 다름]
- **위치**
  - 지정됨(90초): `diaries/[id]/organize`, `diaries/[id]/regenerate`, `diaries/backfill/organize`
  - 누락: `diaries/auto-generate`, `diaries/preview-regenerate`, `chat`, `diaries/backfill/photos`
- **문제:** 지정한 쪽의 주석이 이유를 이미 적어 두었습니다. 값이 없으면 플랫폼 기본값에 매달리고, 모델을 기다리다 함수가 먼저 죽으면 재시도가 의미 없어집니다.
- **고치는 방향:** 공용 상수 하나로 네 라우트에 `export const maxDuration = 90`을 추가합니다.

#### - [ ] M23. 메이·밀린 날 채우기로 생긴 일기는 감정 미설정으로 저장됨 [리뷰어 확인 · 정책 결정 필요]
- **위치:** `src/lib/diary/queries.ts:350-359`(생성 시 mood 없음), `src/components/diary/diary-month-view.tsx:679`(미설정 표시)
- **문제:** 작성·검토 화면은 평온 기본값을 지키지만, 채팅과 밀린 날 채우기 경로는 감정 없이 만들고 정리할 때도 채우지 않습니다.
- **결정 필요:** 생성할 때 `DEFAULT_MOOD`를 넣을지, 폼에서만 적용하는 규칙으로 둘지 정해야 합니다.

---

## 낮음

### API 규약

- [ ] **L1. 상태 코드가 라우트마다 다름**
  - 위치: `diaries/auto-generate/route.ts:105`, `[id]/regenerate/route.ts:75`, `preview-regenerate/route.ts:75`, `[id]/organize/route.ts:56`, `backfill/organize/route.ts:46`, `chat/route.ts:415-423`, `563`
  - AI 실패: 502와 503이 섞여 있습니다.
  - 안전 펜스 차단: 경로에 따라 200 / 400 / 502 / 503입니다. 정상 차단이 로그에서는 서버 장애로 집계됩니다.
  - organize는 `capExhausted`가 undefined로 나갈 수 있습니다.
  - 고치는 방향: 결과 → 상태 코드 매핑 함수를 하나로 통일합니다.
- [ ] **L2. 촬영시각 검증 없음 + 검증 스키마 3벌 복사**
  - 위치: `diaries/backfill/photos/route.ts:8-12`, `lib/diary/capture-photos.ts:44-46`, `79`, `102-108`
  - `takenAt: z.string().nullable()`은 "hello"도 통과시킵니다. Invalid Date가 되어 트랜잭션이 실패하고, Prisma 원문이 반환되며, 트랜잭션 밖에서 먼저 만든 빈 일기가 남습니다.
  - chat은 `Date.parse`로 막고 있습니다(`chat/route.ts:319-326`).
  - 고치는 방향: `lib/diary/schemas.ts`에 공용 `clientExifSchema`를 둡니다.
- [ ] **L3. `GET /api/diaries?take=0`(또는 음수)이면 500**
  - 위치: `diaries/route.ts:14-20`, `lib/diary/queries.ts:70`, `79-83`
  - `items[-1].id`에 접근하다 예외가 납니다.
  - 고치는 방향: `z.coerce.number().int().min(1).max(100)`로 검증합니다.
- [ ] **L4. 세션 토큰과 구글 가입 대기 토큰이 같은 키를 씀**
  - 위치: `lib/auth/jwt.ts:38-47`, `lib/auth/google.ts:46-52`, `middleware.ts:73-77`
  - 대기 토큰을 세션 쿠키에 넣으면 미들웨어를 통과하고 재서명까지 됩니다. 데이터 접근은 `getSession` 단계에서 막히는 것을 확인했습니다.
  - 고치는 방향: `purpose` 클레임을 추가하고 페이로드 모양을 검증합니다.
- [ ] **L5. 구글 연동 경쟁 상태와 덮어쓰기**
  - 위치: `auth/google/callback/route.ts:64-83`
  - P2002 오류가 처리되지 않아 500이 나고, 이미 연결된 다른 googleSub를 조용히 교체합니다.
- [ ] **L6. 날짜키 정규식이 7곳에 복사돼 있고 실제 달력 날짜인지 검증하지 않음**
  - 위치: `backfill/organize/route.ts:16`, `backfill/photos/route.ts:13`, `lib/diary/kst.ts:47-53`, `60`, `fragment-actions.ts:65`, `capture-actions.ts:72`, `capture-date.ts:85`
  - "2026-02-31"도 통과하고, 3월 3일 범위를 조회하게 됩니다.
  - 고치는 방향: `kst.ts`에 `isValidDateKey()`와 `dateKeySchema`를 하나씩 둡니다.
- [ ] **L7. 개발용 임베딩 백필 라우트가 운영에 열려 있음**
  - 위치: `diaries/backfill-embeddings/route.ts:5-14`, `lib/diary/embedding.ts:48-51`, `103`
  - 로그인한 누구나 호출할 수 있고 rate limit이 없으며, 예외 원문을 반환합니다.
- [ ] **L8. 세션 쿠키 옵션이 두 파일에 중복 정의됨**
  - 위치: `middleware.ts:8-14`, `lib/auth/session.ts:17-23`
  - 고치는 방향: `jwt.ts`에서 한 번만 export합니다.

### 서버 로직

- [ ] **L9. 사진을 지울 때 카운터 감산을 트랜잭션 전에 읽은 값으로 계산함**
  - 위치: `lib/diary/actions.ts:319-338`, `497-517`
  - 두 번 누르면 이중 감산이 일어납니다.
  - 고치는 방향: `DELETE … RETURNING size_bytes`의 합계로 감산합니다.
- [ ] **L10. regenerate가 DB 본문으로 폴백할 때 입력 길이 상한을 검사하지 않음**
  - 위치: `lib/diary/regenerate.ts:77`
  - 밀린 날 채우기에서 메모를 이어 붙여 2000자를 넘기면 차감 후 불투명한 오류가 납니다.
- [ ] **L11. 사진 일부를 못 받으면 EXIF 요약 번호가 사진과 어긋남**
  - 위치: `regenerate.ts:146-155`, `organize.ts:166-175`, `preview-generate.ts:116`
- [ ] **L12. `releaseIncrement`가 반납 시점의 날짜를 다시 계산함**
  - 위치: `lib/ai/usage.ts:129-135`
  - 자정을 넘기면 새 날짜 행에서 감산됩니다.
  - 고치는 방향: `checkAndIncrement`가 차감한 date를 반환하고, 반납할 때 그 값을 씁니다.
- [ ] **L13. 같은 일을 경로마다 다르게 구현함**
  - `auto-generate.ts:75-76`: mode를 직접 도출합니다(`deriveGenerationMode` 미사용).
  - `embedding.ts:80-107`: 백필 임베딩에 조각이 빠집니다.
  - `fragment-actions.ts:36-45`: 조각 수정에 길이 상한이 없습니다.
  - `fragment-fold.ts:58`: 루프가 `break`라서 긴 조각 하나가 예산을 넘으면 그날 정리가 영원히 안 됩니다.
- [ ] **L14. 서버 전용 표시 누락, 미사용 함수, 로컬 시간 생성자**
  - `lib/push/web-push.ts`에 `import "server-only"`가 없습니다(VAPID 비밀키를 다룸).
  - 미사용 export 7개:
    - `fragments.ts:47 listFragmentsForDiary`
    - `queries.ts:103 getRecentDiaries`
    - `queries.ts:185 getTodayDiary`
    - `storage/index.ts:295 getSignedUrls`
    - `web-push.ts:110 sendPushToUser`
    - `character/vision-consent.ts:13 getPhotoVisionOptIn`
    - `diary/exif.ts:83 validateSameDayKST`
  - `rag.ts:178`의 `new Date(y, m-1, d)`가 서버 로컬 시간대를 씁니다. 지금은 결과가 같지만 규약에 어긋납니다.

### 화면

- [ ] **L15. 채팅을 보낼 때마다 키보드가 닫힘**
  - 위치: `character-chat.tsx:840`, `441`
  - 전송 중 textarea를 `disabled`로 막아서 finally의 `focus()`가 먹지 않습니다.
  - 고치는 방향: `readOnly`로 바꾸고 전송 버튼만 막습니다.
- [ ] **L16. 같은 대상·동작인데 문구가 다름**
  - 메이 말투: 인사·한도 안내는 존댓말(`character-chat.tsx:559`, `688`, `394`)이고, 페르소나·제안 카드·정리 오류는 반말입니다.
  - 재정리 동작 이름: 검토 화면은 "다시 생성 / 생성 중 / 다시 생성에 실패", 수정 화면은 "다시 정리하기 / 정리 중 / 재생성에 실패"입니다.
  - 날짜키 원문 노출: `character-chat.tsx:214`가 `${data.dateKey} 조각 정리해줘`를 씁니다(옆 줄은 `data.label`).
  - 가입 동의 문구: 체크박스는 "Google Gemini로 전송되는 것에 동의"(`auth-form.tsx:238`, `google-consent-form.tsx:69`)이고, "사진·텍스트의 AI 분석 동의"는 서버 오류 문구(`lib/auth/google-actions.ts:24`)에만 있습니다. 동의 고지 자체는 제대로 있습니다.
- [ ] **L17. 확인창·경고 방식이 제각각이고, "날짜 섞임" 경고가 세 번 나옴**
  - `window.confirm`: `diary-form.tsx:541-547`, `review-gate.tsx:343-349`
  - 빨간 경고: `diary-form.tsx:955-974`, `review-gate.tsx:535-539`
  - 경고가 작성 화면 → confirm → 검토 화면으로 세 번 반복됩니다(경고 최소화 원칙과 어긋남).
  - 삭제 오류 알림은 "확인"과 "취소"가 같은 동작입니다(`diary-detail-actions.tsx:92-100`).
- [ ] **L18. 로딩 스켈레톤이 지금 화면과 다름**
  - `app/(protected)/loading.tsx:11-46`이 해체된 옛 홈 모양입니다.
  - `diary/loading.tsx`는 상세·작성·수정·밀린 날 화면에도 목록 모양으로 적용됩니다.
- [ ] **L19. 터치 영역이 작은 버튼, 16px 미만 입력칸 [결정 필요]**
  - 44px 미만 버튼:
    - 채팅 전송·사진 첨부 34px (`character-chat.tsx:815-816`, `871-872`)
    - 작성·검토 헤더 취소·저장 약 30px (`diary-form.tsx:658`, `694`, `review-gate.tsx:432`, `470`)
    - 설정 링크 34px
    - 날짜 선택 버튼
    - 제안 카드 버튼 28~30px
    - 조각 액션 약 24px
  - 16px 미만 입력:
    - 검색 15px
    - 비밀번호 변경 15px
    - 로그인·가입 15px
    - 재정리 지시 15px
    - 조각 수정 13px
  - 현재는 `app/layout.tsx:34-35`의 `maximumScale: 1`이 확대를 막는 것으로 추정됩니다. 밀린 날 채우기만 16px를 명시하고 있어서 방어 방식이 제각각입니다.
  - 결정 필요: 16px로 통일할지, 뷰포트 설정에 맡기기로 하고 DESIGN.md에 적을지.
- [ ] **L20. 접근성 잔여**
  - `date-picker.tsx:148-170`: ‹ › 버튼에 aria-label이 없습니다.
  - `diary/[id]/page.tsx:80-82`: 보이는 글자는 "뒤로"인데 라벨은 "목록으로"이고, 이동은 `/diary`로 고정입니다(스와이프 뒤로가기와 목적지가 다름).
  - `diary/[id]/page.tsx:60`: `<main>` 안에 `<main>`이 중첩돼 있습니다.
  - `mood-picker.tsx:76`, `ai-instruction-input.tsx:85`: `outline: none`이라 포커스 링이 없습니다.

---

## 설정·문서

- [ ] **D1. CLAUDE.md가 실제 코드와 다름**
  - 세션 유지 기간: "7-day TTL"이라고 적혀 있지만 실제는 30일입니다(`lib/auth/jwt.ts:10`).
  - "Diary image lifecycle"의 `imageMode`: 코드에 없습니다(여러 장 사진 구조로 바뀜).
  - "Character & subscription invariants"의 coinBalance·CoinTransaction·isAsleep·trial: schema에서 제거됐습니다(`prisma/schema.prisma:201` 주석).
  - "Forms use react-hook-form": 사용처가 0곳입니다.
  - docker compose Postgres 포트: 문서·compose는 5432, 로컬 `.env.local`은 5433입니다.
  - 필수 환경변수: `DATABASE_URL`, `JWT_SECRET`만 적혀 있고 `CRON_SECRET`이 빠졌습니다(H7 참고).
- [ ] **D2. 안 쓰는 의존성**
  - `react-hook-form`, `@hookform/resolvers`: 사용처 0곳
  - `@tanstack/react-query`: `providers/query-provider.tsx`만 있고 실제 쿼리가 없습니다. devtools도 함께 들어갑니다.
- [ ] **D3. 린트가 빌드 산출물을 검사함**
  - `eslint.config.mjs`의 ignores에 `public/worker-*.js`(와 `.map`)가 빠져 있습니다. `.gitignore`에는 있습니다.
- [ ] **D4. 마이그레이션 없이 `db push`로 운영함**
  - `prisma/migrations/`가 없습니다. 지금은 운영·로컬 DB가 모두 스키마와 일치하지만, 변경 이력이 남지 않아 되돌리거나 추적하기 어렵습니다.
  - `prisma/hardening.sql`(권한 차단)은 수동 적용 대상입니다.

---

## 문제 없던 부분

- 모든 API가 데이터에 접근하기 전에 `getSession()`으로 로그인을 확인합니다(cron·인증 라우트 제외).
- 조회·변경 쿼리가 userId로 범위를 좁힙니다(diaries, calendar, unfolded, export, delete, push/unsubscribe, regenerate·organize·backfill).
- `PUBLIC_PATHS`는 정확히 일치하는 경로 3개뿐입니다.
- 구글 로그인은 state·PKCE를 검증하고, `email_verified`를 요구하며, 같은 이메일로 자동 연동하는 것을 막습니다.
- 로그인 타이밍 공격 방어: 없는 사용자도 bcrypt 비교를 실제로 수행합니다.
- 사용 횟수 이중 차감이 없고, `checkAndIncrement`의 동시성 처리도 정상입니다.
- 안전 펜스 체크포인트 두 곳과, 펜스 차단 시 반납하지 않는 규약이 정상입니다.
- `savePhotosByDate`의 선판정 → 업로드 → 트랜잭션 → 보상 삭제 순서가 정상입니다(멱등성 문제는 M7).
- 일기 수정·삭제는 DB 먼저, 스토리지 나중 순서입니다(계정 삭제는 M6).
- 소유자 범위의 signed URL, `ownedDiaryId` 소유권 방어선이 있습니다.
- regenerate·organize·update·revert가 재임베딩을 합니다.
- 화면의 'AI' 표기는 허용한 곳에만 남아 있습니다.
- 감정 기본값 평온은 작성·검토 폼과 감정 선택에서 지켜집니다.
- BottomSheet, ConfirmSheet, 스와이프 뒤로가기, 하단 탭, 마크다운 렌더(raw HTML 비활성)는 문제 없습니다.
