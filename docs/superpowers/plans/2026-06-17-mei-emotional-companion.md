# 메이 감정 동반자 + 위기 안전망 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메이 채팅에 (1) 위기 안전망, (2) 조언 대신 회고 지도, (3) mood 기반 감정 흐름 인식을 더한다.

**Architecture:** 모든 로직은 기존 `/api/chat`의 **단일 Gemini 호출**을 서버 전·후처리로 감싸 해결한다(추가 모델 호출 0). 위기 감지·감정흐름 요약은 **순수 함수**로 분리하고, 시스템 프롬프트에 회고·안전·감정흐름 지침을 주입한다. 위기 자원(전화번호)은 **클라이언트 상수**로만 렌더(LLM 생성 금지).

**Tech Stack:** Next.js 15 App Router · Prisma/Postgres · Gemini(`@google/genai`) · 순수 TS 유틸 + `node scripts/check-*.ts`(프로젝트 컨벤션, Node 23.6+ 네이티브 TS).

**설계 출처:** `docs/superpowers/specs/2026-06-16-mei-emotional-companion-design.md`

---

## 테스트 접근 (프로젝트 현실)

이 레포는 **테스트 프레임워크가 없다**(의도적). 대신 `scripts/*.ts`를 `node`로 직접 실행하는 운영 스크립트 패턴을 쓴다(`reembed-diaries` 등). 그래서:

- **순수 함수**(위기 키워드 스캔·마커 파싱·감정흐름 요약)는 `scripts/check-*.ts` 실행 하네스로 **test-first** 검증한다(실패 먼저 → 구현 → 통과).
- **프롬프트/UI 동작**은 단위 테스트가 불가하므로 `npx tsc --noEmit` + `pnpm lint` + **dev 수동 스모크**(개발 테스트 계정)로 검증한다.
- 순수 함수 파일은 `server-only`·`@/` 별칭·prisma를 **import하지 않는다**(스크립트가 안전하게 상대경로로 가져오도록 — 기존 스크립트 컨벤션과 동일).

⚠️ 수동 검증은 반드시 **개발 테스트 계정**(`test-1779186245@memoism.test` / `test12345!`)으로. 실계정 금지(메모리 `no-destructive-tests-on-real-data`).

## 파일 구조

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `src/lib/ai/crisis.ts` | 위기 키워드 스캔 + `[[risk: high]]` 마커 파싱 (순수) | 신규 |
| `src/lib/ai/mood-trend.ts` | mood 배열 → 감정흐름 1줄 요약 (순수) | 신규 |
| `scripts/check-crisis.ts` | crisis.ts 검증 하네스 | 신규 |
| `scripts/check-mood-trend.ts` | mood-trend.ts 검증 하네스 | 신규 |
| `prisma/schema.prisma` | `ChatMessage.crisis Boolean` 추가 | 수정 |
| `src/app/api/chat/route.ts` | 전·후처리 배선 + 프롬프트 지침(안전·회고·감정흐름) | 수정 |
| `src/app/(protected)/character/page.tsx` | `crisis` 필드 로드·전달 | 수정 |
| `src/components/character/character-chat.tsx` | `crisis` 렌더(`CrisisResources`) | 수정 |

**단계:** Phase 1(Task 1–4) = 위기 안전망(단독 배포 가능, 마이그레이션 포함). Phase 2(Task 5–6) = 회고 + 감정 흐름.

---

# Phase 1 — 위기 안전망

## Task 1: 위기 순수 함수 (crisisScan + extractRiskMarker)

**Files:**
- Create: `src/lib/ai/crisis.ts`
- Test: `scripts/check-crisis.ts`

- [ ] **Step 1: 검증 하네스 작성 (실패 먼저)**

Create `scripts/check-crisis.ts`:
```ts
import { crisisScan, extractRiskMarker } from "../src/lib/ai/crisis.ts";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failed++;
    console.error(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
  } else console.log(`ok   ${name}`);
}

// crisisScan — 재현율 우선
eq("scan 죽고싶", crisisScan("요즘 너무 힘들어서 죽고 싶어"), true);
eq("scan 자해", crisisScan("어제 자해를 했어"), true);
eq("scan 사라지고싶(띄어쓰기)", crisisScan("그냥 다 사라지고 싶다"), true);
eq("scan 일상", crisisScan("오늘 점심 뭐 먹었더라"), false);
eq("scan 빈문자열", crisisScan(""), false);

// extractRiskMarker — refs 파서와 동일하게 공백·대소문자 허용, 본문에서 strip
eq("marker present", extractRiskMarker("괜찮아, 곁에 있을게.\n\n[[risk: high]]"),
  { clean: "괜찮아, 곁에 있을게.", risk: true });
eq("marker 공백없음", extractRiskMarker("응.[[risk:high]]"), { clean: "응.", risk: true });
eq("marker absent", extractRiskMarker("오늘 날씨 좋네"), { clean: "오늘 날씨 좋네", risk: false });

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
```

- [ ] **Step 2: 실패 확인**

Run: `node scripts/check-crisis.ts`
Expected: 에러(`Cannot find module '../src/lib/ai/crisis.ts'`) — 아직 파일 없음.

- [ ] **Step 3: 순수 함수 구현**

Create `src/lib/ai/crisis.ts`:
```ts
// 위기 키워드 — 재현율 우선(놓침이 오발동보다 나쁨). 단순 substring 매칭.
// 뉘앙스(부정·인용)는 모델 [[risk: high]] 마커가 담당하고, 여기선 결정적 백업만.
const CRISIS_KEYWORDS = [
  "죽고 싶", "죽고싶", "죽고 싶다", "죽을래", "죽어버리", "죽어 버리",
  "자살", "자해", "목을 매", "목 매", "뛰어내리",
  "사라지고 싶", "사라지고싶", "없어지고 싶", "없어지고싶",
  "살기 싫", "살기싫", "살고 싶지 않",
];

/** 사용자 메시지에 명백한 위기 표현이 있는지(결정적 백업). */
export function crisisScan(text: string): boolean {
  const t = text.replace(/\s+/g, " ");
  return CRISIS_KEYWORDS.some((k) => t.includes(k));
}

/** 답변 끝 [[risk: high]] 마커를 파싱·제거. refs 파서와 동일하게 공백·대소문자 허용. */
export function extractRiskMarker(text: string): { clean: string; risk: boolean } {
  const RE = /\[\[\s*risk\s*:\s*high\s*\]\]/gi;
  const risk = RE.test(text);
  const clean = text
    .replace(/\[\[\s*risk\s*:\s*high\s*\]\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { clean, risk };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node scripts/check-crisis.ts`
Expected: `all passed` (모든 줄 `ok`).

- [ ] **Step 5: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 출력 없음(통과).

- [ ] **Step 6: 커밋**

```bash
git add src/lib/ai/crisis.ts scripts/check-crisis.ts
git commit -m "feat(chat): 위기 감지 순수함수(키워드 스캔+risk 마커 파싱)"
```

## Task 2: 스키마 — ChatMessage.crisis 컬럼

**Files:**
- Modify: `prisma/schema.prisma:202` (relatedDiaries 줄 아래)

- [ ] **Step 1: 컬럼 추가**

`prisma/schema.prisma`의 `ChatMessage` 모델, `relatedDiaries` 줄 바로 아래에 추가:
```prisma
  relatedDiaries Json?    @map("related_diaries")
  // ASSISTANT 답변이 위기 신호에 대응한 경우 true → 클라이언트가 위기 자원 블록을 렌더(영구).
  crisis      Boolean     @default(false)
  createdAt   DateTime    @default(now()) @map("created_at")
```

- [ ] **Step 2: 마이그레이션 생성·적용 (로컬)**

Run: `pnpm db:migrate --name add_chatmessage_crisis`
Expected: `migrations/<ts>_add_chatmessage_crisis` 생성 + 로컬 DB 적용. 이어서 `pnpm db:generate`.

⚠️ **prod 적용 주의:** prod `DATABASE_URL`은 `pgbouncer=true` 확인(메모리 `vercel-prisma-pgbouncer-42p05`). 마이그레이션은 직결(`DIRECT_URL`)로 적용됨 — 배포 시 Prisma가 처리. 기본값 `false`라 기존 행은 안전.

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 통과(아직 사용처 없음).

- [ ] **Step 4: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(chat): ChatMessage.crisis 컬럼 — 위기 자원 블록 영속화"
```

## Task 3: route.ts — 위기 감지 배선 (프롬프트 + 전·후처리 + 저장)

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: import 추가**

`route.ts` 상단 import 블록에 추가:
```ts
import { crisisScan, extractRiskMarker } from "@/lib/ai/crisis";
```

- [ ] **Step 2: 시스템 프롬프트에 "안전" 섹션 + 마커 규칙 추가**

`buildSystemPrompt`의 prompt 템플릿에서 `## 근거 표시 (시스템용 — 반드시 지켜):` 바로 **위에** 새 섹션 삽입:
```ts
## 안전 (다른 무엇보다 우선):
- 사용자가 자해·자살·학대 등 명백한 위기 신호를 보이면, 먼저 따뜻하게 공감하고 혼자가 아니라는 걸 전해라. 판단·훈계하지 말고 곁에 있어라.
- 이때 답변 맨 마지막 줄에 [[risk: high]] 라고만 적어라. 이 줄은 사용자에게 보이지 않는 시스템 신호다.
- 전화번호나 상담기관은 네가 적지 마라 — 앱이 정확한 연락처를 따로 보여준다.

```
(위 블록을 기존 `## 근거 표시` 문자열 앞에 이어 붙인다.)

- [ ] **Step 3: 사용자 메시지 키워드 스캔**

`const userMessage = parsed.data.message;` 바로 아래에 추가:
```ts
  const keywordRisk = crisisScan(userMessage);
```

- [ ] **Step 4: 후처리 — risk 마커 strip + crisis 판정**

기존:
```ts
  const { clean, indices, markerPresent } = extractRefs(rawAssistant, sources);
  const assistantText = clean || rawAssistant.trim();
```
다음으로 교체:
```ts
  // 위기 마커 먼저 떼고(사용자에게 안 보임), 그다음 refs 칩 마커 처리.
  const { clean: noRisk, risk: markerRisk } = extractRiskMarker(rawAssistant);
  const { clean, indices, markerPresent } = extractRefs(noRisk, sources);
  const assistantText = clean || noRisk.trim();
  const crisis = keywordRisk || markerRisk;
```

- [ ] **Step 5: assistant 메시지에 crisis 저장**

`prisma.chatMessage.create`의 ASSISTANT data 객체(`role: "ASSISTANT"` 쪽)에 `crisis` 추가:
```ts
      data: {
        userId: session.userId,
        characterId: character.id,
        role: "ASSISTANT",
        content: assistantText,
        relatedDiaries,
        crisis,
      },
```

- [ ] **Step 6: 응답 JSON에 crisis 포함**

말미 `return NextResponse.json({...})`에 `crisis` 추가:
```ts
  return NextResponse.json({
    message: assistantText,
    capRemaining: cap.remaining,
    relatedDiaries,
    crisis,
  });
```

- [ ] **Step 7: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npx eslint src/app/api/chat/route.ts`
Expected: 둘 다 출력 없음(통과).

- [ ] **Step 8: 커밋**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(chat): 위기 신호 이중 감지(키워드+마커)·crisis 플래그 저장"
```

## Task 4: 위기 자원 블록 렌더 + 로드 시 영속 복원

**Files:**
- Modify: `src/app/(protected)/character/page.tsx`
- Modify: `src/components/character/character-chat.tsx`

- [ ] **Step 1: page.tsx — crisis 필드 select + 매핑**

`prisma.chatMessage.findMany`의 `select`에 `crisis: true` 추가:
```ts
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        relatedDiaries: true,
        crisis: true,
      },
```
이어서 `initialMessages` 매핑에 추가:
```ts
      relatedDiaries:
        (m.relatedDiaries as unknown as RelatedDiary[] | null) ?? undefined,
      crisis: m.crisis,
```

- [ ] **Step 2: character-chat.tsx — Message 타입에 crisis 추가**

`type Message = {...}` 에 추가:
```ts
type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  relatedDiaries?: RelatedDiary[];
  crisis?: boolean;
};
```

- [ ] **Step 3: send()에서 assistant 응답에 crisis 반영**

`send()`의 assistant 메시지 추가 부분(`setMessages((prev) => [...prev, { ... role:"assistant" ... }])`)에 `crisis: data.crisis,` 추가:
```ts
        {
          id: `local-${Date.now()}-a`,
          role: "assistant",
          content: data.message,
          createdAt: new Date().toISOString(),
          relatedDiaries: data.relatedDiaries,
          crisis: data.crisis,
        },
```

- [ ] **Step 4: 렌더 — 관련일기 칩 블록 아래에 CrisisResources**

메시지 렌더에서 relatedDiaries 칩 블록 바로 아래에 추가:
```tsx
                {m.role === "assistant" && m.crisis && (
                  <div style={{ paddingLeft: 36 }}>
                    <CrisisResources />
                  </div>
                )}
```

- [ ] **Step 5: CrisisResources 컴포넌트 정의**

`RelatedDiaryChips` 함수 아래에 추가(번호는 **상수** — DESIGN.md 토큰 사용):
```tsx
// ── 위기 자원 ──────────────────────────────────────────────
// 전화번호·문구는 코드 상수(절대 LLM 생성 금지). 검증: 2026-06-16 보건복지부/국립정신건강센터.
function CrisisResources() {
  const items = [
    { label: "자살예방 상담전화", num: "109", tel: "109", note: "24시간" },
    { label: "정신건강 위기상담", num: "1577-0199", tel: "15770199", note: "24시간" },
  ];
  return (
    <div
      style={{
        marginTop: "var(--space-2)",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-xs)",
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--fg)",
        }}
      >
        혼자 견디기 힘들 땐 언제든 도움을 받을 수 있어요.
      </p>
      {items.map((it) => (
        <a
          key={it.num}
          href={`tel:${it.tel}`}
          className="pressable"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "var(--space-2)",
            textDecoration: "none",
            fontFamily: "var(--font-sans)",
          }}
        >
          <span style={{ fontSize: "var(--text-sm)", color: "var(--fg-placeholder)" }}>
            {it.label}
          </span>
          <span style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--tint)" }}>
            {it.num}
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--fg-placeholder)" }}>
            {it.note}
          </span>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npx eslint "src/app/(protected)/character/page.tsx" src/components/character/character-chat.tsx`
Expected: 통과.

- [ ] **Step 7: 수동 스모크 (dev, 테스트 계정)**

Run: `pnpm dev` → 테스트 계정 로그인 → 메이.
1. `죽고 싶어` 전송 → 메이가 공감 답 + **위기 자원 블록**(109 / 1577-0199, tel 링크) 노출, 본문에 `[[risk: high]]` 안 보임.
2. 새로고침 → 위기 블록 **유지**(영속).
3. `오늘 점심 뭐 먹었지` 전송 → 위기 블록 **안 뜸**.

- [ ] **Step 8: 커밋**

```bash
git add "src/app/(protected)/character/page.tsx" src/components/character/character-chat.tsx
git commit -m "feat(chat): 위기 자원 블록 렌더·영속 복원(109/1577-0199 상수, tel 연결)"
```

---

# Phase 2 — 회고 지도 + 감정 흐름

## Task 5: 감정흐름 순수 함수 (summarizeMoodTrend)

**Files:**
- Create: `src/lib/ai/mood-trend.ts`
- Test: `scripts/check-mood-trend.ts`

- [ ] **Step 1: 검증 하네스 작성 (실패 먼저)**

Create `scripts/check-mood-trend.ts`:
```ts
import { summarizeMoodTrend } from "../src/lib/ai/mood-trend.ts";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failed++;
    console.error(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
  } else console.log(`ok   ${name}`);
}

eq("기록 3개 미만 → null", summarizeMoodTrend(["sad", "sad"]), null);
eq("null·빈값 무시 후 3개 미만 → null", summarizeMoodTrend([null, "sad", null, undefined]), null);
eq("가라앉은 편(neg 3/4)", summarizeMoodTrend(["sad", "sad", "tired", "calm"]),
  "최근 기분기록 4개: 슬픔2·피곤1·평온1 — 가라앉은 편");
eq("밝은 편(pos 3/4)", summarizeMoodTrend(["joy", "love", "calm", "sad"]),
  "최근 기분기록 4개: 기쁨1·사랑1·평온1·슬픔1 — 밝은 편");
eq("기복(neg2 pos2)", summarizeMoodTrend(["sad", "joy", "tired", "love"]),
  "최근 기분기록 4개: 슬픔1·기쁨1·피곤1·사랑1 — 기복이 있는 편");
eq("미지 mood 무시", summarizeMoodTrend(["sad", "sad", "sad", "xxx"]),
  "최근 기분기록 3개: 슬픔3 — 가라앉은 편");

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
```

- [ ] **Step 2: 실패 확인**

Run: `node scripts/check-mood-trend.ts`
Expected: 에러(모듈 없음).

- [ ] **Step 3: 순수 함수 구현**

Create `src/lib/ai/mood-trend.ts`:
```ts
// mood 흐름 요약 — DB 조회는 호출부(route)가 하고, 여기선 mood 배열만 받는 순수 함수.
// 환각 0: 데이터로 뒷받침되는 분포만 말한다(기록 3개 미만이면 침묵).
const LABEL: Record<string, string> = {
  joy: "기쁨", calm: "평온", sad: "슬픔", love: "사랑", anger: "화남", tired: "피곤",
};
const POSITIVE = new Set(["joy", "love", "calm"]);
const NEGATIVE = new Set(["sad", "anger", "tired"]);

/** 최근 윈도우의 mood 배열(null 포함 가능)을 1줄 근거 요약으로. 유효 기록 3개 미만이면 null. */
export function summarizeMoodTrend(
  moods: (string | null | undefined)[],
): string | null {
  const present = moods.filter((m): m is string => !!m && m in LABEL);
  if (present.length < 3) return null;

  const counts = new Map<string, number>();
  for (const m of present) counts.set(m, (counts.get(m) ?? 0) + 1);

  const neg = present.filter((m) => NEGATIVE.has(m)).length / present.length;
  const pos = present.filter((m) => POSITIVE.has(m)).length / present.length;
  const label = neg >= 0.6 ? "가라앉은 편" : pos >= 0.6 ? "밝은 편" : "기복이 있는 편";

  const breakdown = [...counts.entries()]
    .sort((a, b) => b[1] - a[1]) // 동률은 삽입(첫 등장) 순서 유지 — 안정 정렬
    .map(([k, v]) => `${LABEL[k]}${v}`)
    .join("·");

  return `최근 기분기록 ${present.length}개: ${breakdown} — ${label}`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node scripts/check-mood-trend.ts`
Expected: `all passed`.

- [ ] **Step 5: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 통과.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/ai/mood-trend.ts scripts/check-mood-trend.ts
git commit -m "feat(chat): 감정흐름 요약 순수함수(최근 mood 분포→1줄 근거)"
```

## Task 6: route.ts — 감정흐름 주입 + 회고 지도 지침

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: import 추가**

```ts
import { summarizeMoodTrend } from "@/lib/ai/mood-trend";
```

- [ ] **Step 2: 최근 14일 mood 조회 (Promise.all에 추가)**

`const contextFloor = ...` 아래, Promise.all 직전에 추가:
```ts
  const moodWindowFloor = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
```
그리고 기존 `const [recentDiaries, recentHistory, persona, relevant] = await Promise.all([` 를 다음으로 확장(배열 끝에 쿼리 1개 추가, 구조분해에 `moodWindow` 추가):
```ts
  const [recentDiaries, recentHistory, persona, relevant, moodWindow] =
    await Promise.all([
      // ... 기존 4개 쿼리 그대로 ...
      prisma.diary.findMany({
        where: { userId: session.userId, createdAt: { gte: moodWindowFloor } },
        select: { mood: true },
      }),
    ]);
  const moodTrend = summarizeMoodTrend(moodWindow.map((d) => d.mood));
```

- [ ] **Step 3: buildSystemPrompt 시그니처에 moodTrend 추가**

`buildSystemPrompt(args: {...})`의 인자 타입과 구조분해에 추가:
```ts
function buildSystemPrompt(args: {
  characterName: string;
  persona: Persona | null;
  recentDiaries: {
    id: string; title: string; content: string; mood: string | null; createdAt: Date;
  }[];
  relevant: RelevantDiary[];
  moodTrend: string | null;
}): { prompt: string; sources: Map<number, DiarySource> } {
  const { characterName, persona, recentDiaries, relevant, moodTrend } = args;
```

- [ ] **Step 4: 감정흐름 섹션 주입 (조건부)**

prompt 템플릿에서 `relatedSection` 주입 블록(``${relatedSection ? ... : ""}``) **바로 아래**에 감정흐름 블록 삽입:
```ts
${
  moodTrend
    ? `\n## 사용자의 최근 감정 흐름 (참고):\n${moodTrend}\n- 이 흐름은 대화가 기분·고민 쪽으로 흐를 때만 자연스럽게 언급해. 뜬금없이 먼저 꺼내지 마. 위 요약을 벗어난 기분은 지어내지 마.\n`
    : ""
}
```

- [ ] **Step 5: 회고 지도 지침을 응답 스타일에 추가**

prompt 템플릿 `## 응답 스타일:` 목록에서 공감 bullet(`- 사용자의 말에 먼저 공감하고...`) **아래에** bullet 추가:
```ts
- 사용자가 고민·감정을 털어놓거나 조언을 구하면, 답·해결책을 먼저 주지 말고 본인이 스스로 돌아보도록 다정한 질문으로 이끌어라 ("그때 어떤 기분이었어?", "비슷한 적 있었어?"). 그래도 명확히 도움을 원하면 그제야 "참고로…" 정도의 단정적이지 않은 제안을 1~2문장만 덧붙여라. 언제·어디·무엇 같은 사실 질문은 회고로 돌리지 말고 바로 답해라.
```

- [ ] **Step 6: buildSystemPrompt 호출에 moodTrend 전달**

```ts
  const { prompt: systemPrompt, sources } = buildSystemPrompt({
    characterName: CHARACTER_NAME,
    persona,
    recentDiaries,
    relevant,
    moodTrend,
  });
```

- [ ] **Step 7: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npx eslint src/app/api/chat/route.ts`
Expected: 통과.

- [ ] **Step 8: 수동 스모크 (dev, 테스트 계정)**

테스트 계정에 **최근 14일 내 기분 선택된 일기 3개 이상**을 만든 뒤(예: 슬픔 위주):
1. `요즘 너무 우울한데 어떻게 해야 할까?` → 메이가 **해결책 나열 대신 회고 질문**으로 응답. 감정흐름이 맥락에 맞게 자연스럽게 언급될 수 있음.
2. `지난주에 뭐 했지?` → 회고로 돌리지 않고 **바로 답**.
3. 기분 기록이 3개 미만인 계정 → 감정흐름 언급 **없음**.

- [ ] **Step 9: 커밋**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(chat): 감정흐름 컨텍스트 주입 + 회고 우선 지도 지침"
```

---

## 최종 검증 (전체)

- [ ] `node scripts/check-crisis.ts` → all passed
- [ ] `node scripts/check-mood-trend.ts` → all passed
- [ ] `npx tsc --noEmit` → 통과
- [ ] `pnpm lint` → 통과
- [ ] `pnpm build` → 성공
- [ ] 회귀: 평범한 일기 사실 질문·`[[refs]]` 칩·날짜 질문 정상(무회귀)

## Self-Review 메모 (작성자 점검)

- **스펙 커버리지:** B(Task 1–4) / C(Task 6 Step 5) / D(Task 5, Task 6 Step 2–4·8) — 스펙 §5·6·7 전부 대응. 자원 번호 §5.3 = 상수(Task 4 Step 5).
- **타입 일관성:** `crisis`(boolean) route 저장↔page select↔Message 타입↔CrisisResources gate 일치. `summarizeMoodTrend(moods)` 시그니처 check·route 동일. `extractRiskMarker→{clean,risk}` route에서 동일 사용.
- **플레이스홀더:** 없음(모든 step에 실제 코드/명령/기대출력).
- **미해결(의도):** 위기 키워드 목록은 출시 전 한 번 더 큐레이션(스펙 §10). 임상 고지 문구는 비목표.
