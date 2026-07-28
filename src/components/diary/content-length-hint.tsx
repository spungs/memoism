"use client";

import { MAX_AI_INPUT_CONTENT_LENGTH } from "@/lib/diary/schemas";

// 본문 길이 표시 — "1,600 / 2,000자". 상한 근처에서만 나타난다.
//
// 왜 평소엔 숨기나: 운영 일기 113건의 평균이 309자다(p50 214자). 300자쯤 쓴 화면에
// "300 / 2,000자"가 늘 떠 있으면 정보가 아니라 "아직 한참 남았네"라는 압박으로
// 읽힌다 — 채워야 할 숙제처럼 보인다. 상한은 사실상 아무도 안 닿는 안전장치이므로
// (2,000자 초과 0건, 역대 최대 1,398자) 닿을 기미가 보일 때만 꺼내는 게 맞다.
//
// 이 상한은 *AI 정리*의 한계지 일기 저장의 한계가 아니다. 넘겨도 얼마든지 쓰고
// 저장할 수 있고 AI 정리만 못 쓴다. 카피가 그걸 분명히 해야 "더 못 쓰는 줄"
// 오해하지 않는다. (그래서 textarea에 maxLength를 걸지 않는다)

/** 이 비율부터 카운터를 노출한다. 1,400자 — 역대 최장 일기와 같은 지점. */
const REVEAL_RATIO = 0.7;
/** 이 비율부터 경고색. */
const WARN_RATIO = 0.9;

export function isOverAiLimit(text: string): boolean {
  return text.trim().length > MAX_AI_INPUT_CONTENT_LENGTH;
}

interface Props {
  /** 현재 본문 (트림 전 원문 — 표시는 트림 기준으로 센다) */
  value: string;
}

export function ContentLengthHint({ value }: Props) {
  const length = value.trim().length;
  if (length < MAX_AI_INPUT_CONTENT_LENGTH * REVEAL_RATIO) return null;

  const over = length > MAX_AI_INPUT_CONTENT_LENGTH;
  const near = !over && length >= MAX_AI_INPUT_CONTENT_LENGTH * WARN_RATIO;

  return (
    <p
      aria-live={over ? "polite" : "off"}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        color: over
          ? "var(--danger)"
          : near
            ? "var(--warning)"
            : "var(--fg-subtle)",
        margin: 0,
        marginTop: 4,
        textAlign: "right",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {length.toLocaleString("ko-KR")} /{" "}
      {MAX_AI_INPUT_CONTENT_LENGTH.toLocaleString("ko-KR")}자
      {over && " · 여기까지는 저장돼요. AI 정리만 어려워요"}
    </p>
  );
}
