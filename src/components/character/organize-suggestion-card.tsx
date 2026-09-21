"use client";

import { ChevronDown, Sparkles } from "lucide-react";

export type OrganizeSuggestion = {
  diaryId: string;
  dateKey: string;
  label: string;
  count: number;
};

/**
 * 메이 채팅의 "정리해줄까?" 제안.
 *
 * `ChatMessage`로 저장하지 않는다 — 이건 `foldedAt IS NULL`에서 파생되는 *상태*이지
 * 일어난 사건이 아니다. 저장하면 정리한 뒤에도 대화에 남아, 누르면 "정리할 조각이
 * 없어요"가 뜬다. 결과 칩은 반대로 저장한다(사건이므로).
 *
 * 위치는 **대화 위에 떠 있다**(카톡 공지 방식). 세 번 옮긴 끝의 자리다 —
 * 목록 *안*에 두면 스크롤과 함께 사라지고, 입력창 위에 두면 마지막 대화를 밀어올리고,
 * 헤더 아래에 끼워 넣으면 대화가 딱 잘린 것처럼 보였다. 띄우면 레이아웃 높이를
 * 아예 먹지 않아 뒤 대화가 전부 보이고, 발견도 그대로 보장된다.
 *
 * "나중에"는 **지우지 않고 접는다.** 조각은 그대로 남아 있는데 제안만 사라지면
 * 다시 정리할 길이 채팅에 없어진다(일기 상세까지 들어가야 한다). 접힌 상태에서도
 * 개수는 계속 갱신되고, 탭 한 번으로 펼쳐 바로 정리할 수 있다.
 */
export function OrganizeSuggestionCard({
  suggestion,
  busy,
  collapsed,
  onAccept,
  onToggle,
}: {
  suggestion: OrganizeSuggestion;
  busy: boolean;
  collapsed: boolean;
  onAccept: () => void;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <button
        type="button"
        className="pressable glass"
        onClick={onToggle}
        aria-expanded={false}
        aria-label={`${suggestion.label}에 모인 조각 ${suggestion.count}개 — 정리 제안 펼치기`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--separator)",
          backgroundColor: "var(--material-bar-strong)",
          boxShadow: "var(--shadow-lg)",
          color: "var(--fg-muted)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          cursor: "pointer",
        }}
      >
        <Sparkles size={13} aria-hidden />
        {suggestion.label} {suggestion.count}개
      </button>
    );
  }

  return (
    <div
      className="glass"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--separator)",
        backgroundColor: "var(--material-bar-strong)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <Sparkles
        size={16}
        aria-hidden
        style={{ color: "var(--fg-muted)", flexShrink: 0 }}
      />
      <p
        style={{
          flex: 1,
          margin: 0,
          fontSize: "var(--text-sm)",
          color: "var(--fg)",
          lineHeight: 1.45,
        }}
      >
        {suggestion.label}에 {suggestion.count}개 모였어. 일기로 정리해줄까?
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
        <button
          type="button"
          className="pressable"
          onClick={onAccept}
          disabled={busy}
          style={{
            padding: "6px 12px",
            borderRadius: "var(--radius-pill)",
            border: "none",
            backgroundColor: "var(--fg)",
            color: "var(--bg)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "정리하는 중" : "정리해줘"}
        </button>
        {/* 접기 — "나중에"라는 말 대신 동작을 그대로 보여준다. 지우는 게 아니라 접는 것이다. */}
        <button
          type="button"
          className="pressable"
          onClick={onToggle}
          disabled={busy}
          aria-expanded
          aria-label="정리 제안 접기"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            padding: 0,
            borderRadius: "var(--radius-pill)",
            border: "none",
            backgroundColor: "transparent",
            color: "var(--fg-muted)",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          <ChevronDown size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
