"use client";

import { MAX_AI_INPUT_CONTENT_LENGTH } from "@/lib/diary/schemas";

// 본문 길이 표시 — "1,234 / 3,000자".
//
// 이 상한은 *AI 정리*의 한계지 일기 저장의 한계가 아니다. 3000자를 넘겨도 일기는
// 얼마든지 쓰고 저장할 수 있고, AI 정리만 못 쓴다. 카피가 그걸 분명히 해야
// "더 못 쓰는 줄" 오해하지 않는다. (그래서 textarea에 maxLength를 걸지 않는다)
//
// 빈 상태에서는 표시하지 않는다. 백지에 "0 / 3,000자"가 먼저 보이면 분량을 채워야
// 하는 숙제처럼 읽혀 첫 문장 쓰기가 더 어려워진다.

/** 이 비율을 넘으면 색으로 미리 알린다. */
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
  if (length === 0) return null;

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
