import "server-only";
import { chat, CAPTURE_MODEL } from "./gemini";
import { classifyIntent } from "./intent";
import { resolveCaptureDate, resolvePhotoDates } from "@/lib/diary/capture-date";
import { createFragment } from "@/lib/diary/fragments";
import { kstDateKey } from "@/lib/diary/kst";
import {
  savePhotosByDate,
  type CaptureEntry,
} from "@/lib/diary/capture-photos";
import type { ClientExif } from "@/lib/diary/auto-generate";

export type CaptureRef = {
  /**
   * 대표 일기 — Plan 04에서 **이미 배포된 구버전 행과 같은 세 키**다.
   * 클라이언트가 `entries` 없는 옛 행도 그대로 읽을 수 있게 유지한다(하위호환).
   */
  diaryId: string;
  dateKey: string;
  label: string;
  /** 이 메시지가 기록한 날들. 사진이 여러 날에 걸치면 2개 이상. 1개여도 채운다. */
  entries: CaptureEntry[];
  /** 텍스트 조각(있으면). 날짜 교정 때 함께 옮긴다. */
  fragmentId: string | null;
};

export type CaptureOutcome =
  | { handled: false }
  | { handled: true; reply: string; captureRef: CaptureRef | null };

const REPLY_SYSTEM = `너는 사용자의 일상을 함께 기억하는 친구야. 방금 사용자가 알려준 일을 듣고 짧게 반응해.

규칙:
- 1~2문장, 한국어 반말. 이모지는 최대 1개.
- "기록했어요", "저장했습니다" 같은 시스템 멘트 금지. 저장 확인은 화면이 따로 보여준다.
- 조언·평가·감정 단정 금지. 사용자가 말하지 않은 사실을 지어내지 마라.
- 가벼운 맞장구나 짧은 호기심까지만.`;

/**
 * 사진만 오고 아무 말도 없을 때 덧붙이는 지시.
 *
 * 사진을 강제로 설명하게 만들지 않고 **되묻는다**. 타이핑 부담이 첫 사용 실패
 * 지점이라 입력을 막는 대신 대화로 끌어내는 쪽을 택했다. 사용자가 답하면 그게
 * 텍스트 조각으로 쌓여 회상까지 이어진다.
 *
 * 사진 내용은 모델에 보내지 않는다 — 그래서 "추측 금지"를 명시한다.
 */
function photoOnlyHint(dateLabels: string): string {
  return `사용자가 사진만 보내고 아무 말도 하지 않았어.

**너는 그 사진을 볼 수 없다.** 사진에 뭐가 찍혔는지, 어떤 분위기인지 단 한 마디도 하지 마.
금지 예시: "풍경이 좋네", "사진 속 풍경이 인상적이네", "예뻐 보인다", "재밌었겠다".
전부 네가 본 적 없는 것에 대한 말이라 사용자를 혼란스럽게 한다.

사진은 ${dateLabels} 날짜로 기록됐어.
네가 할 일은 하나뿐이야 — **그 날이 어떤 날이었는지 한 문장으로 묻는 것.**
날짜는 위에 적힌 그대로 말해라. "오늘"이라고 바꿔 부르지 마.`;
}

/** 캡처 응답 생성 실패 시 쓰는 최소 응답 — 저장은 이미 끝났으므로 흐름을 막지 않는다. */
const FALLBACK_REPLY = "그랬구나, 남겨뒀어.";

/** 사진만 온 경우의 폴백 — 되묻기를 잃지 않게 별도로 둔다. */
const PHOTO_ONLY_FALLBACK = "사진 잘 받았어. 무슨 날이었어?";

/** "2026-07-20" → "7월 20일". 메시지 날짜와 실제 저장 날짜가 다를 때 칩에 쓴다. */
function dateKeyLabel(key: string): string {
  const [, m, d] = key.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

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
  photos: File[] = [],
  exifs: ClientExif[] = [],
): Promise<CaptureOutcome> {
  // 사진이 있으면 무조건 기록이다 — 분류 호출을 아낀다.
  const intent = photos.length > 0 ? "record" : await classifyIntent(message);
  if (intent !== "record") return { handled: false };

  // 텍스트(=메시지)의 날짜. 사진은 각자 EXIF 날짜로 따로 간다.
  const date = resolveCaptureDate(message, now);
  if (date.kind === "ambiguous") {
    // 저장하지 않고 되묻기만. 사용자가 날짜를 확정해 다시 보내면 그때 저장된다.
    return { handled: true, reply: date.question, captureRef: null };
  }

  const entries: CaptureEntry[] = [];
  if (photos.length > 0) {
    const exifKeys = exifs.map((e) =>
      e.takenAt ? kstDateKey(new Date(e.takenAt)) : null,
    );
    const photoDates = resolvePhotoDates(
      date.dateKey,
      date.fromExplicit,
      exifKeys,
      kstDateKey(now),
    );
    const saved = await savePhotosByDate(userId, photos, exifs, photoDates);
    if (!saved.ok) {
      return { handled: true, reply: saved.error, captureRef: null };
    }
    entries.push(...saved.entries);
  }

  // 텍스트 조각은 메시지 날짜로. 조각은 하나뿐이라 여러 날로 쪼갤 수 없다.
  let fragmentId: string | null = null;
  let textDiaryId: string | null = null;
  if (message) {
    const f = await createFragment({
      userId,
      dateKey: date.dateKey,
      kind: "text",
      content: message,
    });
    fragmentId = f.fragmentId;
    textDiaryId = f.diaryId;
    if (!entries.some((e) => e.dateKey === date.dateKey)) {
      entries.push({ dateKey: date.dateKey, diaryId: f.diaryId, imageIds: [] });
    }
  }

  if (entries.length === 0) return { handled: false };

  // 칩이 가리킬 대표 일기: 텍스트가 있으면 그쪽, 없으면 첫 사진의 날.
  const primary = entries.find((e) => e.diaryId === textDiaryId) ?? entries[0];
  const photoOnly = photos.length > 0 && !message;

  let reply: string;
  try {
    reply = await chat({
      systemPrompt: photoOnly
        ? `${REPLY_SYSTEM}\n\n${photoOnlyHint(
            entries.map((e) => dateKeyLabel(e.dateKey)).join(", "),
          )}`
        : REPLY_SYSTEM,
      history: [],
      query: message || "(사진만 보냄)",
      maxOutputTokens: 120,
      model: CAPTURE_MODEL,
    });
  } catch (e) {
    console.warn(
      "[capture] 응답 생성 실패 — 폴백 사용:",
      e instanceof Error ? e.message : e,
    );
    reply = photoOnly ? PHOTO_ONLY_FALLBACK : FALLBACK_REPLY;
  }

  return {
    handled: true,
    reply:
      reply.trim() || (photoOnly ? PHOTO_ONLY_FALLBACK : FALLBACK_REPLY),
    captureRef: {
      diaryId: primary.diaryId,
      dateKey: primary.dateKey,
      // 라벨은 **실제로 저장된 날**을 말해야 한다. 사진이 EXIF로 다른 날에 가면
      // 메시지 날짜("오늘")를 그대로 쓰는 순간 칩이 거짓말을 한다.
      label:
        entries.length > 1
          ? `${dateKeyLabel(primary.dateKey)} 외 ${entries.length - 1}일`
          : primary.dateKey === date.dateKey
            ? date.label
            : dateKeyLabel(primary.dateKey),
      entries,
      fragmentId,
    },
  };
}
