/**
 * 일기 생성 지연 분해 측정 — **실제 Gemini를 호출한다.** 기본 실행에서 제외된다.
 *
 *   npx vitest run --config vitest.manual.config.ts src/lib/ai/diary-latency.manual.test.ts
 *
 * 왜 만들었나: 2026-09-22 사진 9장 일기의 재정리가 21초 만에 502로 죽었다
 * (TIMEOUT_MS 20초 초과). "사진이 많으면 느리다"까지는 알지만 **무엇이** 느린지를
 * 몰라 타임아웃 값을 감으로 정할 수 없었다. 이 파일은 그 시간을 셋으로 쪼갠다:
 *   ① Storage 다운로드  ② 업로드(요청 본문 전송)  ③ 모델 처리
 *
 * 하드룰: 실제 유저 일기로 파괴적 AI 실행 금지 — 여기선 사진을 **읽기만** 하고
 * 생성 결과는 어디에도 저장하지 않는다.
 */
import { describe, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { downloadAsBase64 } = await import("@/lib/storage");
const { GoogleGenAI } = await import("@google/genai");

const PHOTOS_JSON =
  process.env.LATENCY_PHOTOS_JSON ??
  "/private/tmp/claude-501/-Users-sonkyoungho-esc-01-Active-SnapshotFinance-snapshot-finance/00274583-a161-47b9-bdc6-2ac6eefd256c/scratchpad/photos.json";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** JPEG SOF 마커에서 해상도를 읽는다. 타일 수 = 토큰 수라 픽셀이 바이트보다 중요하다. */
function jpegSize(buf: Buffer): { w: number; h: number } | null {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0~SOF15 (DHT·DAC 제외)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

type Photo = { mimeType: string; base64Data: string };

const SYSTEM = "너는 사용자의 하루를 1인칭 일기로 정리하는 도우미다. JSON으로 답한다.";
const PROMPT = "아래 사진들과 메모로 그날의 일기를 써줘. 메모: 오늘은 친구들과 바다에 다녀왔다.";

async function callGemini(photos: Photo[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const parts: object[] = [{ text: PROMPT }];
  for (const p of photos) {
    parts.push({ inlineData: { mimeType: p.mimeType, data: p.base64Data } });
  }
  const t0 = Date.now();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: SYSTEM,
      temperature: 0.6,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const ms = Date.now() - t0;
  const u = res.usageMetadata;
  return {
    ms,
    promptTokens: u?.promptTokenCount ?? 0,
    outputTokens: u?.candidatesTokenCount ?? 0,
    outChars: (res.text ?? "").length,
  };
}

describe("일기 생성 지연 분해", () => {
  it(
    "사진 장수별 소요 시간·토큰",
    async () => {
      const entries: { path: string; bytes: number }[] = JSON.parse(
        fs.readFileSync(PHOTOS_JSON, "utf8"),
      );

      // ① Storage 다운로드 (운영과 동일하게 Promise.all 병렬)
      const tDl = Date.now();
      const results = await Promise.all(entries.map((e) => downloadAsBase64(e.path)));
      const dlMs = Date.now() - tDl;
      const photos = results.filter((p): p is Photo => p !== null);

      const b64Bytes = photos.reduce((s, p) => s + p.base64Data.length, 0);
      console.log(
        `\n[다운로드] ${photos.length}장 / ${dlMs}ms / base64 ${(b64Bytes / 1024 / 1024).toFixed(2)}MB`,
      );
      for (const [i, p] of photos.entries()) {
        const buf = Buffer.from(p.base64Data, "base64");
        const d = jpegSize(buf);
        console.log(
          `  #${i + 1} ${(buf.length / 1024).toFixed(0)}KB ${d ? `${d.w}x${d.h}` : "?"} ${p.mimeType}`,
        );
      }

      // ② 장수를 늘려가며 호출 — 고정 지연인지 장수 비례인지 가른다.
      for (const n of [0, 1, 3, 6, 9]) {
        if (n > photos.length) continue;
        const subset = photos.slice(0, n);
        const mb =
          subset.reduce((s, p) => s + p.base64Data.length, 0) / 1024 / 1024;
        try {
          const r = await callGemini(subset);
          console.log(
            `[Gemini] 사진 ${n}장 (${mb.toFixed(2)}MB) → ${(r.ms / 1000).toFixed(1)}s | ` +
              `입력 ${r.promptTokens}tok, 출력 ${r.outputTokens}tok, ${r.outChars}자`,
          );
        } catch (e) {
          console.log(`[Gemini] 사진 ${n}장 → 실패: ${(e as Error).message}`);
        }
      }

      // ③ 9장 반복 — 편차(모델 서버 변동)를 본다. 20초 경계가 우연인지 확인.
      for (let i = 0; i < 3; i++) {
        try {
          const r = await callGemini(photos);
          console.log(
            `[반복 ${i + 1}/3] 9장 → ${(r.ms / 1000).toFixed(1)}s | 입력 ${r.promptTokens}tok, 출력 ${r.outputTokens}tok`,
          );
        } catch (e) {
          console.log(`[반복 ${i + 1}/3] 실패: ${(e as Error).message}`);
        }
      }

      // ④ **운영 경로 그대로** — 위 ②③은 짧은 프롬프트라 출력이 300~700자로 끝났다.
      // 실제 generateDiary는 시스템 프롬프트가 길고 본문을 최대 3000자까지 쓴다.
      // 출력 토큰이 지연의 주범인지 여기서 갈린다.
      const { generateDiary } = await import("./gemini");
      for (let i = 0; i < 3; i++) {
        const t = Date.now();
        try {
          const d = await generateDiary({
            mode: "C",
            photos,
            text: "친구들이랑 오랜만에 바다에 다녀왔다. 파도 소리가 좋았고 회도 먹었다.",
          });
          console.log(
            `[운영경로 ${i + 1}/3] 9장 → ${((Date.now() - t) / 1000).toFixed(1)}s | 본문 ${d.content.length}자, 제목 "${d.title}"`,
          );
        } catch (e) {
          console.log(
            `[운영경로 ${i + 1}/3] ${((Date.now() - t) / 1000).toFixed(1)}s 만에 실패: ${(e as Error).message}`,
          );
        }
      }
    },
    10 * 60 * 1000,
  );
});
