import { z } from "zod";
import { isValidDateKey } from "@/lib/tz";

/**
 * 클라이언트가 보낸 사진 한 장의 EXIF. 라우트 세 곳이 같은 모양을 각자 복사해 뒀다.
 *
 * 촬영 시각은 **날짜로 파싱되는 문자열**만 받는다. 문자열이기만 하면 통과시켜 "hello"가
 * Invalid Date가 됐고, 사진 저장 트랜잭션이 통째로 실패해 Prisma 원문이 나가고 트랜잭션
 * 밖에서 먼저 만든 빈 일기가 남았다(점검 L2). 정상 클라이언트는 ISO 문자열만 보낸다.
 */
export const clientExifSchema = z.object({
  takenAt: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "사진 촬영 시각 형식이 잘못됐어요")
    .nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

/** 날짜 키 "YYYY-MM-DD" — 달력에 있는 날짜만 (점검 L6). */
export const dateKeySchema = z
  .string()
  .refine(isValidDateKey, "날짜 형식이 올바르지 않아요");

/** 제목 상한. 저장 검증과 재정리 API가 같은 값을 봐야 drift가 안 생긴다. */
export const MAX_DIARY_TITLE_LENGTH = 200;

export const moodKeySchema = z.enum([
  "joy",
  "calm",
  "sad",
  "love",
  "anger",
  "tired",
]);

/**
 * 감정 기본값(평온). 작성·검토 화면의 초기값이자, 메이·밀린 날 채우기가 만드는 일기의
 * 기본값이다 — 어느 경로로 생겨도 "미설정"이 남지 않게(점검 M23). 서버도 쓰므로 "use client"
 * 모듈(mood-picker)이 아니라 여기 둔다.
 */
export const DEFAULT_MOOD = "calm" satisfies z.infer<typeof moodKeySchema>;

export const diaryInputSchema = z.object({
  // 제목은 필수 (DB 컬럼 not null) — UI도 "(선택)" 표기 없이 필수로 안내한다.
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해주세요")
    .max(MAX_DIARY_TITLE_LENGTH, `제목은 ${MAX_DIARY_TITLE_LENGTH}자 이내여야 합니다`),
  content: z.string().trim().min(1, "내용을 입력해주세요"),
  mood: moodKeySchema.nullable().optional(),
});

export type DiaryInput = z.infer<typeof diaryInputSchema>;
export type MoodKey = z.infer<typeof moodKeySchema>;

/**
 * AI 정리 입력 본문 상한. 최초 정리·재정리 전 경로가 이 값을 공유한다.
 *
 * 왜 2000인가 — 실측 두 가지에서 나온 값이다 (2026-07-28).
 *
 * 1) 운영 데이터: 일기 113건의 평균 309자, p50 214자, p99 1,236자, **최대 1,398자**.
 *    2,000자를 넘는 일기는 0건이다. 즉 이 상한에 막히는 사용자는 없다.
 *
 * 2) 모델 거동: 보존 모드(사용자 글 있음)에서 Gemini가 확률적으로 폭주한다
 *    (같은 문장을 반복 생성 → 토큰 상한 도달 → JSON 깨짐). 5회 반복 측정에서
 *    1,000자 0/5, 2,000자 0/5 실패였지만 3,000자는 1/5(20%)이 실패했다.
 *    3,000자는 또 출력이 3,066자로 나와 아래 출력 스키마 상한(3,000)을 스스로
 *    넘기기까지 했다. 2,000자는 그 두 함정 모두에서 안전한 구간이다.
 *
 * 상한을 넘는 입력은 여기서 미리 막는다. 안 막으면 AI 사용 횟수를 차감한 뒤
 * "Gemini 응답 스키마 오류"라는 불투명한 메시지가 사용자에게 간다.
 *
 * 올리려면 gemini.ts의 draftResponseSchema.content.max와 maxOutputTokens를 함께
 * 봐야 한다. 셋은 한 몸이다.
 */
export const MAX_AI_INPUT_CONTENT_LENGTH = 2000;
