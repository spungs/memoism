import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const TIMEOUT_MS = 20_000;
// 한국어는 토큰당 글자 수가 영어의 1/2 정도라 영어 기준 300토큰 ≒ 한국어 600토큰.
// "1~3문장" 응답 + 자연스러운 종결 보장을 위해 여유 있게 1000.
const DEFAULT_MAX_OUTPUT_TOKENS = 1000;

export class GeminiError extends Error {}

let _client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY가 설정되지 않았습니다.");
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new GeminiError("Gemini 응답 시간이 초과되었습니다")),
        ms,
      ),
    ),
  ]);
}

// 일시적 장애(503 과부하 / 429 한도 / 5xx)는 재시도 가치가 있다.
function isTransient(e: unknown): boolean {
  const raw = e instanceof Error ? e.message : String(e);
  return /\b(503|500|502|504|429)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|deadline/i.test(
    raw,
  );
}

// SDK가 던지는 raw JSON 에러를 사용자에게 노출하지 않고 친근한 한국어로 정규화.
function friendlyGeminiError(e: unknown): GeminiError {
  // 이미 우리가 만든 GeminiError(타임아웃·스키마 등)는 그대로 통과.
  if (e instanceof GeminiError) return e;
  const raw = e instanceof Error ? e.message : String(e);
  if (/\b(503|500|502|504)\b|UNAVAILABLE|high demand|overloaded/i.test(raw)) {
    return new GeminiError(
      "AI 서버가 잠시 혼잡해요. 잠시 후 다시 시도해주세요.",
    );
  }
  if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(raw)) {
    return new GeminiError(
      "지금 AI 사용량이 많아요. 잠시 후 다시 시도해주세요.",
    );
  }
  return new GeminiError("AI 처리 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
}

async function callWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      // 일시적 장애가 아니거나 마지막 시도면 중단.
      if (!isTransient(e) || i === retries) break;
      // 지수 backoff (0.6s, 1.2s) — 과부하가 가라앉을 시간을 준다.
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw friendlyGeminiError(lastErr);
}

// =============================================================================
// chat — /api/chat 라우트가 호출. RAG 컨텍스트 통합은 Phase 4.
// =============================================================================

export type ChatTurn = { role: "user" | "model"; text: string };

export type ChatInput = {
  systemPrompt: string;
  history: ChatTurn[];
  query: string;
  maxOutputTokens?: number;
};

export async function chat(input: ChatInput): Promise<string> {
  const contents = [
    ...input.history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    { role: "user" as const, parts: [{ text: input.query }] },
  ];

  const response = await callWithRetry(() =>
    withTimeout(
      getClient().models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: input.systemPrompt,
          temperature: 0.7,
          maxOutputTokens: input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
          // gemini-2.5 thinking 모델에서 출력 토큰이 내부 사고에 잠식되지 않게.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      TIMEOUT_MS,
    ),
  );

  const text = response.text?.trim();
  if (!text) throw new GeminiError("Gemini 응답이 비어 있습니다");
  return text;
}

// =============================================================================
// generateDiary — 자동 본문 생성 (모드 A/B/C, NEW-4)
//   - 모드 A: 사진만 → 본문 (멀티모달 Vision)
//   - 모드 B: 텍스트만 → 오탈자·문맥 정리
//   - 모드 C: 사진 + 텍스트 → 통합 본문
//   환각 0 정책: 입력에 없는 사실·디테일·감정·대화 추가 금지.
// =============================================================================

export type DiaryGenerationMode = "A" | "B" | "C";

export type DiaryGenerationPersona = {
  presetKey: string;
  tone: string;
  formality: string;
  sentenceLength: string;
};

export type DiaryGenerationInput = {
  mode: DiaryGenerationMode;
  photos?: Array<{ mimeType: string; base64Data: string }>;
  text?: string;
  persona?: DiaryGenerationPersona;
  /** EXIF 사실(시간·장소) 요약. 모드 A/C에서 환각 방지용 단서로 시스템 프롬프트에 포함. */
  exifSummary?: string;
};

export type DiaryGenerationOutput = {
  title: string;
  content: string;
  suggestedMood: "joy" | "calm" | "sad" | "love" | "anger" | "tired" | null;
};

// content max는 사용자 입력 텍스트 상한(MAX_TEXT_LENGTH 2000) + 사진 사실 보강
// 여유를 합쳐 3000자. 모드 B/C(사용자가 쓴 글 보존)에서 긴 원본이 잘리지 않게
// 한다. 모드 A(사진→생성)는 프롬프트가 150~250자로 짧게 유도.
const draftResponseSchema = z.object({
  title: z.string().trim().min(1).max(50),
  content: z.string().trim().min(1).max(3000),
  suggestedMood: z
    .enum(["joy", "calm", "sad", "love", "anger", "tired"])
    .nullable(),
});

function buildDiarySystemPrompt(
  mode: DiaryGenerationMode,
  persona: DiaryGenerationPersona | undefined,
  exifSummary: string | undefined,
  userTextLength: number,
): string {
  // 베타 기본 preset은 "factual" — 담백한 사실 중심 평서문('~했다'체).
  // (UserPersona UI는 V2 노출 예정. 그때 다른 preset에서 tone/formality 기반으로 확장.)
  const tone = persona?.tone ?? "warm";
  const formality = persona?.formality === "formal" ? "존댓말" : "반말";
  const styleLines =
    !persona || persona.presetKey === "factual"
      ? `- 담백한 사실 중심으로 서술한다. 종결어미는 평서문('~했다/~였다/~았다·었다')으로 통일한다.
- 일어난 일을 시간 순서대로 간결히 적는다. 구어체 말투('~했어/~했지/~네')·느낌표·과장된 감탄은 쓰지 않는다. 느낀 점도 담백한 평서문으로 적는다('아쉬웠다'처럼).`
      : `- ${formality}, ${tone} 톤.`;

  // 길이 규칙은 모드에 따라 다르다.
  //  - 사용자가 쓴 글이 있으면(B/C): 그 분량을 바닥값으로 보존, 요약 금지.
  //    "짧게 고정"이 사용자가 쓴 생각·과정을 잘라먹던 문제(2026-06-07)를 막는다.
  //  - 사진만(A): 사진→생성이라 150~250자로 짧게 유도.
  const lengthLine =
    userTextLength > 0
      ? `- 본문은 한국어 1인칭. 사용자가 쓴 메모(약 ${userTextLength}자)의 문장과 분량을 그대로 보존한다 — 절대 요약하지 말고, 사용자가 쓴 것보다 짧아지지 않게 한다. 오탈자 교정·사진 사실 보강으로 분량이 비슷하거나 조금 길어지는 정도는 괜찮다(최대 3000자).`
      : `- 본문은 한국어 1인칭, 150~250자 (공백 포함).`;

  const common = `## 출력 규칙
${lengthLine}
${styleLines}
- 시간 표기는 일반적인 일기처럼 자연스럽게: 분 단위 시각('14시 08분', '오후 2시 8분')은 쓰지 않는다. 시간을 꼭 드러내야 할 땐 '오전/오후', '아침/점심/저녁', '○시쯤' 정도로만 쓰고, 보통은 시각 없이 일어난 일을 자연스럽게 이어서 적는다('~하고 ~했다. 그리고 ~했다').
- 환각 금지: 입력(사진·메모·EXIF)에 없는 사실·디테일·없는 사람·꾸며낸 대화·과장된 감정 추가 금지.
- 응답은 JSON 객체 하나만. 코드블록·머리말·꼬리말 없음.
- 스키마: { "title": string(1~50자), "content": string(1~3000자), "suggestedMood": "joy"|"calm"|"sad"|"love"|"anger"|"tired"|null }`;

  const exif = exifSummary
    ? `\n## EXIF 사실 (이건 진짜로 일어난 것):\n${exifSummary}\n`
    : "";

  // EXIF 시각이 있으면 사진은 촬영시각 순으로 정렬돼 전달된다. 시간 흐름대로
  // 서술하도록 명시 (사용자 요청). EXIF 없으면 정렬 근거가 없으니 지시도 생략.
  const chronological = exifSummary
    ? `\n첨부된 사진은 촬영 시각이 이른 순서대로 정렬돼 있다. EXIF 시각은 사진의 선후 관계를 파악하는 용도로만 참고하고, 하루의 흐름(아침→저녁)대로 자연스럽게 서술하라. 정확한 시각을 본문에 옮겨 적지는 마라. 사진 순서를 임의로 뒤섞지 마라.\n`
    : "";

  switch (mode) {
    case "A":
      return `너는 사용자의 일기를 도와주는 친구다. 첨부된 사진들을 보고 1인칭으로 짧은 일기 본문을 만들어라.${exif}${chronological}
사진에서 *직접 관찰 가능한 것*만 써라 (장소 유형, 음식, 풍경 분위기 등). 사진에 안 찍힌 사람·대화·감정·과거 추억 금지.

${common}`;
    case "B":
      return `너는 사용자가 두서없이 쓴 메모를 깔끔한 일기로 정리하는 도우미다.

사용자 메모의 의미·사실·디테일은 그대로 유지하고 *오탈자·문맥·문장 흐름만* 다듬어라. 새로운 사실·감정·디테일 추가 금지.

${common}`;
    case "C":
      return `너는 사용자가 쓴 일기를 존중하며 다듬는 도우미다. 사용자가 직접 쓴 메모가 일기의 핵심이고, 사진은 보조 자료다.${exif}${chronological}
사용자가 쓴 문장·디테일·생각·과정·감정은 그대로 보존한다. 오탈자·띄어쓰기·어색한 문장 흐름만 다듬어라. 사진의 사실(시간·장소·관찰 가능한 객체)은 사용자가 빠뜨린 부분에만 자연스럽게 보강한다. 사용자가 쓴 내용을 요약하거나 삭제하지 마라. 메모·사진에 없는 디테일·인물·대화는 추가하지 마라.

${common}`;
  }
}

export async function generateDiary(
  input: DiaryGenerationInput,
): Promise<DiaryGenerationOutput> {
  // 모드 검증
  if (input.mode === "A" && (!input.photos || input.photos.length === 0)) {
    throw new GeminiError("모드 A는 사진이 1장 이상 필요합니다");
  }
  if (input.mode === "B" && !input.text?.trim()) {
    throw new GeminiError("모드 B는 텍스트가 필요합니다");
  }
  if (
    input.mode === "C" &&
    (!input.photos || input.photos.length === 0) &&
    !input.text?.trim()
  ) {
    throw new GeminiError("모드 C는 사진 또는 텍스트가 필요합니다");
  }

  const systemPrompt = buildDiarySystemPrompt(
    input.mode,
    input.persona,
    input.exifSummary,
    input.text?.trim().length ?? 0,
  );

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];

  if (input.text?.trim()) {
    parts.push({ text: `[사용자 메모]\n${input.text.trim()}` });
  } else {
    parts.push({ text: "[사용자 메모 없음 — 사진만으로 일기 작성]" });
  }

  if (input.photos) {
    for (const photo of input.photos) {
      parts.push({
        inlineData: { mimeType: photo.mimeType, data: photo.base64Data },
      });
    }
  }

  const response = await callWithRetry(() =>
    withTimeout(
      getClient().models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
          // 보존 모드(B/C)에서 최대 3000자 본문이 끝까지 안 잘리게 여유.
          // 한국어 ≈ 2자/토큰 → 3000자 ≒ 1500토큰 + 제목·JSON 래퍼 여유.
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          // Gemini 2.5 Flash thinking 비활성. thinking 모델이 응답 토큰을 다 먹어
          // JSON 잘림 발생 → thinkingBudget 0으로 비-thinking 모드.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      TIMEOUT_MS,
    ),
  );

  const rawText = response.text?.trim();
  if (!rawText) throw new GeminiError("Gemini 응답이 비어 있습니다");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new GeminiError(
      `Gemini 응답이 JSON 형식이 아닙니다: ${rawText.slice(0, 200)}`,
    );
  }

  const validated = draftResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new GeminiError(
      `Gemini 응답 스키마 오류: ${validated.error.issues
        .map((i) => i.message)
        .join(", ")}`,
    );
  }

  return validated.data;
}

// =============================================================================
// 임베딩 — Phase 4 NEW-6 RAG 검색용.
//   - 기본: gemini-embedding-001 (text-embedding-004는 단종됨)
//   - outputDimensionality=768 명시 (schema의 vector(768)과 일치)
//   - pgvector cosine 유사도 검색에 사용
// =============================================================================

const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";

const EMBEDDING_DIM = 768;

export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new GeminiError("임베딩 대상 텍스트가 비어있습니다");
  }

  const response = await callWithRetry(() =>
    withTimeout(
      getClient().models.embedContent({
        model: EMBEDDING_MODEL,
        contents: trimmed,
        config: { outputDimensionality: EMBEDDING_DIM },
      }),
      TIMEOUT_MS,
    ),
  );

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIM) {
    throw new GeminiError(
      `임베딩 응답 형식 오류 (dim: ${values?.length ?? "undefined"})`,
    );
  }
  return values;
}
