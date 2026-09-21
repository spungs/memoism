"use client";

import { Sparkles } from "lucide-react";

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
 * 위치는 **입력창 바로 위 고정**. 대화 목록 최상단에 두면 스크롤과 함께 밀려 사라져서,
 * 발견을 보장하려고 메이를 진입점으로 고른 이유가 없어진다.
 */
export function OrganizeSuggestionCard({
  suggestion,
  busy,
  onAccept,
  onDismiss,
}: {
  suggestion: OrganizeSuggestion;
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3)",
        marginBottom: "var(--space-2)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--fill-2)",
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
      <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
        <button
          type="button"
          className="pressable"
          onClick={onDismiss}
          disabled={busy}
          style={{
            padding: "6px 10px",
            borderRadius: "var(--radius-pill)",
            border: "none",
            backgroundColor: "transparent",
            color: "var(--fg-muted)",
            fontSize: "var(--text-sm)",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          나중에
        </button>
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
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "정리하는 중" : "정리해줘"}
        </button>
      </div>
    </div>
  );
}
