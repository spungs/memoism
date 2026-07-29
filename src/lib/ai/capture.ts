import "server-only";
import { chat, CAPTURE_MODEL } from "./gemini";
import { classifyIntent } from "./intent";
import { resolveCaptureDate } from "@/lib/diary/capture-date";
import { createFragment } from "@/lib/diary/fragments";

export type CaptureRef = { diaryId: string; dateKey: string; label: string };

export type CaptureOutcome =
  | { handled: false }
  | { handled: true; reply: string; captureRef: CaptureRef | null };

const REPLY_SYSTEM = `너는 사용자의 일상을 함께 기억하는 친구야. 방금 사용자가 알려준 일을 듣고 짧게 반응해.

규칙:
- 1~2문장, 한국어 반말. 이모지는 최대 1개.
- "기록했어요", "저장했습니다" 같은 시스템 멘트 금지. 저장 확인은 화면이 따로 보여준다.
- 조언·평가·감정 단정 금지. 사용자가 말하지 않은 사실을 지어내지 마라.
- 가벼운 맞장구나 짧은 호기심까지만.`;

/** 캡처 응답 생성 실패 시 쓰는 최소 응답 — 저장은 이미 끝났으므로 흐름을 막지 않는다. */
const FALLBACK_REPLY = "그랬구나, 남겨뒀어.";

/**
 * record 메시지를 그날 일기에 조각으로 누적한다 (스펙 §3·4·5).
 * recall/ambiguous면 `handled: false`를 돌려 호출부가 기존 회상 경로를 타게 한다.
 *
 * 이 함수는 **캡을 소모하지 않는다** — 분류·응답 모두 저가 모델(capture 경로)이다.
 */
export async function handleCaptureMessage(
  userId: string,
  message: string,
  now: Date,
): Promise<CaptureOutcome> {
  const intent = await classifyIntent(message);
  if (intent !== "record") return { handled: false };

  const date = resolveCaptureDate(message, now);
  if (date.kind === "ambiguous") {
    // 저장하지 않고 되묻기만. 사용자가 날짜를 확정해 다시 보내면 그때 저장된다.
    return { handled: true, reply: date.question, captureRef: null };
  }

  const { diaryId } = await createFragment({
    userId,
    dateKey: date.dateKey,
    kind: "text",
    content: message,
  });

  let reply: string;
  try {
    reply = await chat({
      systemPrompt: REPLY_SYSTEM,
      history: [],
      query: message,
      maxOutputTokens: 120,
      model: CAPTURE_MODEL,
    });
  } catch (e) {
    console.warn(
      "[capture] 응답 생성 실패 — 폴백 사용:",
      e instanceof Error ? e.message : e,
    );
    reply = FALLBACK_REPLY;
  }

  return {
    handled: true,
    reply: reply.trim() || FALLBACK_REPLY,
    captureRef: { diaryId, dateKey: date.dateKey, label: date.label },
  };
}
