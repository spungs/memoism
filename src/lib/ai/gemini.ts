import "server-only";
import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const TIMEOUT_MS = 20_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 600;

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

async function callWithRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new GeminiError(String(lastErr ?? "unknown error"));
}

// =============================================================================
// chat — Phase 2 /api/chat 교체용. RAG 컨텍스트는 Phase 4에서 통합.
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
// generateDiary — Phase 3 NEW-4 자동 본문 생성용 (모드 A/B/C).
//   - 모드 A: 사진만 → 본문 (멀티모달)
//   - 모드 B: 텍스트만 → 오탈자·문맥 정리
//   - 모드 C: 사진 + 텍스트 → 통합 본문
//   현재는 시그니처 + 스텁. Phase 3에서 프롬프트·Zod 검증 본격 구현.
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
};

export type DiaryGenerationOutput = {
  title: string;
  content: string;
  suggestedMood: string | null;
};

export async function generateDiary(
  _input: DiaryGenerationInput,
): Promise<DiaryGenerationOutput> {
  throw new GeminiError(
    "generateDiary는 Phase 3 NEW-4에서 본격 구현됩니다. 현재는 스텁.",
  );
}

// =============================================================================
// 임베딩 — Phase 4 NEW-29 RAG 검색용. 현재는 스텁.
// =============================================================================

const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004";

export async function embedText(_text: string): Promise<number[]> {
  throw new GeminiError(
    `embedText는 Phase 4 NEW-6에서 본격 구현됩니다 (모델: ${EMBEDDING_MODEL}).`,
  );
}
