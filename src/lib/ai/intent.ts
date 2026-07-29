import "server-only";
import { chat, CAPTURE_MODEL } from "./gemini";

/**
 * 메시지 의도.
 *   - record: 일상 기록 ("오늘 국수 먹었어")
 *   - recall: 과거 회상 질문 ("지난주에 뭐 먹었지?")
 *   - ambiguous: 어느 쪽인지 모호 → 짧게 확인 후 분기
 */
export type Intent = "record" | "recall" | "ambiguous";

const SYSTEM = `너는 메시지의 의도를 분류하는 분류기다. 아래 셋 중 하나만, 다른 말 없이 소문자로 답해라.

record  — 오늘/과거의 일상을 알려주는 서술. 예: "점심에 국수 먹었어", "산책 다녀옴", "어제 영화 봤다"
recall  — 과거 기록을 묻는 질문. 예: "지난주에 뭐 먹었지?", "제주도 언제 갔더라?"
ambiguous — 둘 다로 읽히거나 어느 쪽도 아님. 예: "그거 어땠지", "음"

답변은 record, recall, ambiguous 중 정확히 한 단어.`;

/**
 * 캡처 경로(저가 모델)로 의도를 분류한다. **캡을 소모하지 않는다.**
 *
 * 실패 시 recall로 폴백하는 이유: recall은 기존 RAG 경로라 부작용이 없다.
 * 반대로 잘못 record로 분류하면 사용자가 기록할 뜻이 없던 말이 일기에 박힌다 —
 * 되돌리기 비용이 훨씬 크다.
 */
export async function classifyIntent(message: string): Promise<Intent> {
  let raw: string;
  try {
    raw = await chat({
      systemPrompt: SYSTEM,
      history: [],
      query: message,
      maxOutputTokens: 8,
      model: CAPTURE_MODEL,
    });
  } catch (e) {
    console.warn(
      "[intent] 분류 실패 — recall로 폴백:",
      e instanceof Error ? e.message : e,
    );
    return "recall";
  }

  const t = raw.trim().toLowerCase();
  if (t.startsWith("record")) return "record";
  if (t.startsWith("recall")) return "recall";
  if (t.startsWith("ambiguous")) return "ambiguous";
  console.warn(
    `[intent] 예상 밖 응답(${JSON.stringify(t.slice(0, 20))}) — recall로 폴백`,
  );
  return "recall";
}
