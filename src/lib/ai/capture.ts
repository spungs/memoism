import "server-only";
import { chat, CAPTURE_MODEL, type ChatTurn } from "./gemini";
import { classifyIntent } from "./intent";
import { resolveCaptureDate, resolvePhotoDates } from "@/lib/diary/capture-date";
import { createFragment } from "@/lib/diary/fragments";
import { dateKeyLabel, kstDateKey } from "@/lib/diary/kst";
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
- 의료·법률·금융 판단 금지. 증상·계약·돈 얘기가 나와도 진단하거나 조언하지 말고 그냥 들은 대로 받아라.
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
/**
 * 한 번에 모델에 보여주는 사진 수 상한.
 *
 * 요청당 10장까지 받지만 전부 보내면 base64가 10MB를 넘어 응답이 몇 초씩 늘어진다.
 * 대화에서 사진 얘기는 보통 몇 장이면 충분해 지연을 사는 쪽을 택했다.
 * 잘린 경우엔 모델에게 알려 "다 봤다"는 말을 못 하게 한다.
 */
const MAX_VISION_IMAGES = 4;

/** 사진을 **볼 수 있을 때** 붙이는 지시. 환각 방지 규칙은 여기서도 유지한다. */
function visionHint(
  shown: number,
  total: number,
  dateLabels: string,
): string {
  return `사용자가 보낸 사진을 너도 함께 보고 있어${
    shown < total ? ` (${total}장 중 ${shown}장만 보인다 — 다 봤다고 말하지 마)` : ""
  }.

**보이는 것만 말해라.** 사진에 없는 걸 지어내지 마.
사람의 신원·관계·감정은 추정하지 마 — "친구로 보이는", "즐거워 보이는" 같은 말 금지.
확신이 안 서면 단정하지 말고 물어봐.

사진은 ${dateLabels} 일기에 저장됐어.
짧게 반응한 뒤, 기록으로 남을 만한 걸 한 문장으로 물어봐 — 어디였는지, 무슨 날이었는지 같은 것.`;
}

function photoHint(count: number, dateLabels: string, hasText: boolean): string {
  return `사용자가 사진 ${count}장을 함께 보냈어. 사진은 ${dateLabels} 일기에 저장됐다.

**너는 그 사진을 볼 수 없다.** 뭐가 찍혔는지, 어떤 분위기인지 단 한 마디도 하지 마.
금지 예시: "풍경이 좋네", "맛있어 보인다", "예뻐 보인다", "재밌었겠다".
전부 네가 본 적 없는 것에 대한 말이라 사용자를 혼란스럽게 한다.

${
  hasText
    ? `사용자가 사진에 대해 물으면 **사진을 저장해뒀다는 것과 네가 볼 수 없다는 것을 먼저 말하고**,
그 다음에 뭐였는지 한 문장으로 물어봐. 못 봤다는 말 없이 되묻기만 하면 사용자는
자기가 보낸 사진이 무시당했다고 느낀다.`
    : `짧게 반응한 뒤, 그 날이 어떤 날이었는지 한 문장으로 물어봐.`
}
날짜는 위에 적힌 그대로 말해라. "오늘"이라고 바꿔 부르지 마.`;
}

/** 캡처 응답 생성 실패 시 쓰는 최소 응답 — 저장은 이미 끝났으므로 흐름을 막지 않는다. */
const FALLBACK_REPLY = "그랬구나, 남겨뒀어.";

/** 사진이 온 경우의 폴백 — "못 본다"는 사실과 되묻기를 잃지 않게 별도로 둔다. */
const PHOTO_FALLBACK =
  "사진은 일기에 넣어뒀어. 나는 사진을 볼 수가 없어서, 뭐였는지 알려줄래?";

/** 사진을 볼 수 있는데 응답 생성만 실패한 경우 — "못 본다"고 하면 거짓말이 된다. */
const PHOTO_SEEN_FALLBACK = "사진은 일기에 넣어뒀어. 뭐였는지 한 줄 남겨줄래?";

/**
 * 칩 라벨 — **실제로 저장된 날**을 말한다. 사진이 EXIF로 다른 날에 가면
 * 메시지 날짜("오늘")를 그대로 쓰는 순간 칩이 거짓말을 한다.
 *
 * `messageDateLabel`은 대표 일기가 메시지 날짜와 같을 때만 넘긴다("오늘"/"어제").
 */
function captureLabel(
  entries: CaptureEntry[],
  primary: CaptureEntry,
  messageDateLabel: string | null,
): string {
  if (entries.length > 1) {
    return `${dateKeyLabel(primary.dateKey)} 외 ${entries.length - 1}일`;
  }
  return messageDateLabel ?? dateKeyLabel(primary.dateKey);
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
  /** 사진을 모델에게 보여줘도 되는지(사용자 동의). 기본은 보여주지 않는다. */
  canSeePhotos = false,
  /**
   * 현재 대화 이력(시간순). 회상 경로가 쓰는 것과 **같은 이력**을 받는다.
   *
   * 예전엔 빈 배열을 넘겨 기록 경로가 직전 메시지 하나만 보고 답했다. 그래서
   * 사용자가 방금 "알리오올리오 해먹었어"라고 했는데 메이가 "어떤 메뉴였어?"라고
   * 되물었다 — "기억하는 친구"라는 정체성과 정면으로 어긋난다.
   *
   * 길이 걱정은 없다: 호출부가 이미 chatResetAt 이후 · 최근 24h · 20건으로 자르고,
   * pg_cron이 24시간 지난 메시지를 지운다.
   */
  history: ChatTurn[] = [],
): Promise<CaptureOutcome> {
  // 사진 자체는 무조건 기록이다. 다만 **텍스트는 따로 판단한다** — "이거 뭐게?"
  // 같은 대화체 질문까지 일기 조각으로 남기면 라이프DB가 잡담으로 오염된다.
  // (사진이 없을 때의 동작은 예전 그대로: record가 아니면 회상 경로로 넘긴다.)
  const textIsRecord = message ? (await classifyIntent(message)) === "record" : false;
  if (photos.length === 0 && !textIsRecord) return { handled: false };

  // 텍스트(=메시지)의 날짜. 사진은 각자 EXIF 날짜로 따로 간다.
  const date = resolveCaptureDate(message, now);
  const todayKey = kstDateKey(now);

  // **사진은 되묻기 전에 저장한다.** 사진엔 EXIF라는 확실한 날짜가 있어 애매하지
  // 않다 — 애매한 건 텍스트뿐이다. 여기서 먼저 반환해버리면 사용자가 첨부한
  // 사진이 저장도 안 된 채 사라진다(클라이언트는 이미 선택을 비운 뒤라 복구 불가).
  const base = date.kind === "resolved" ? date.dateKey : todayKey;
  const fromExplicit = date.kind === "resolved" ? date.fromExplicit : false;

  const entries: CaptureEntry[] = [];
  if (photos.length > 0) {
    const exifKeys = exifs.map((e) =>
      e.takenAt ? kstDateKey(new Date(e.takenAt)) : null,
    );
    const photoDates = resolvePhotoDates(base, fromExplicit, exifKeys, todayKey);
    const saved = await savePhotosByDate(userId, photos, exifs, photoDates);
    if (!saved.ok) {
      return { handled: true, reply: saved.error, captureRef: null };
    }
    entries.push(...saved.entries);
  }

  if (date.kind === "ambiguous") {
    // 사진은 이미 제 날짜로 저장됐다. 되묻는 대상은 텍스트뿐 — 사용자가 날짜를
    // 확정해 다시 보내면 그때 조각으로 저장된다. 칩은 사진이 어디 갔는지 알린다.
    return {
      handled: true,
      reply: date.question,
      captureRef:
        entries.length > 0
          ? {
              diaryId: entries[0].diaryId,
              dateKey: entries[0].dateKey,
              label: captureLabel(entries, entries[0], null),
              entries,
              fragmentId: null,
            }
          : null,
    };
  }

  // 텍스트 조각은 메시지 날짜로. 조각은 하나뿐이라 여러 날로 쪼갤 수 없다.
  let fragmentId: string | null = null;
  let textDiaryId: string | null = null;
  if (message && textIsRecord) {
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
  // 사진이 있으면 텍스트가 같이 왔든 아니든 "못 본다"는 사실을 알린다.
  // 예전엔 사진만 온 경우에만 알려서, 사진+글을 보내면 메이가 사진을 아예
  // 없었던 것처럼 되물어 사용자가 무시당했다고 느꼈다.
  const hasPhotos = photos.length > 0;
  const dateLabels = [
    ...new Set(entries.map((e) => dateKeyLabel(e.dateKey))),
  ].join(", ");

  // 동의했을 때만 이미지를 모델에 넘긴다. **설명을 저장하지는 않는다** —
  // 사진은 대화를 위해 그때만 보고, 일기에 남는 글은 사용자의 말뿐이다.
  let images: { mimeType: string; data: string }[] | undefined;
  if (hasPhotos && canSeePhotos) {
    try {
      images = await Promise.all(
        photos.slice(0, MAX_VISION_IMAGES).map(async (p) => ({
          mimeType: p.type || "image/jpeg",
          data: Buffer.from(await p.arrayBuffer()).toString("base64"),
        })),
      );
    } catch (e) {
      // 못 읽으면 "볼 수 없다" 경로로 조용히 내려간다 — 저장은 이미 끝났다.
      console.warn(
        "[capture] 사진 인코딩 실패 — vision 없이 진행:",
        e instanceof Error ? e.message : e,
      );
      images = undefined;
    }
  }
  const seeing = !!images && images.length > 0;

  let reply: string;
  try {
    reply = await chat({
      systemPrompt: hasPhotos
        ? `${REPLY_SYSTEM}\n\n${
            seeing
              ? visionHint(images!.length, photos.length, dateLabels)
              : photoHint(photos.length, dateLabels, !!message)
          }`
        : REPLY_SYSTEM,
      images,
      history,
      query: message || "(사진만 보냄)",
      maxOutputTokens: 120,
      model: CAPTURE_MODEL,
    });
  } catch (e) {
    console.warn(
      "[capture] 응답 생성 실패 — 폴백 사용:",
      e instanceof Error ? e.message : e,
    );
    reply = hasPhotos
        ? seeing
          ? PHOTO_SEEN_FALLBACK
          : PHOTO_FALLBACK
        : FALLBACK_REPLY;
  }

  return {
    handled: true,
    reply:
      reply.trim() || (hasPhotos
        ? seeing
          ? PHOTO_SEEN_FALLBACK
          : PHOTO_FALLBACK
        : FALLBACK_REPLY),
    captureRef: {
      diaryId: primary.diaryId,
      dateKey: primary.dateKey,
      label: captureLabel(
        entries,
        primary,
        primary.dateKey === date.dateKey ? date.label : null,
      ),
      entries,
      fragmentId,
    },
  };
}
