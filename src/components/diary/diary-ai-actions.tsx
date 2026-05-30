"use client";

import { useRef, useState, useTransition } from "react";
import { Sparkles, Undo2 } from "lucide-react";
import { revertDiaryAction } from "@/lib/diary/actions";
import { AiBusyOverlay, Spinner } from "@/components/ui/ai-busy-overlay";

export interface DiaryAiUpdate {
  title: string;
  content: string;
  hasPreviousContent: boolean;
  aiGenerationVersion: number;
}

interface Props {
  diaryId: string;
  hasPreviousContent: boolean;
  aiGenerationVersion: number;
  /** 재생성·되돌리기 성공 시 부모에게 새 데이터 전달 (state lifting). */
  onUpdated: (data: DiaryAiUpdate) => void;
}

export function DiaryAiActions({
  diaryId,
  hasPreviousContent,
  aiGenerationVersion,
  onUpdated,
}: Props) {
  const [aiPending, setAiPending] = useState(false);
  const [reverting, startRevert] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // 진행 중인 재생성 요청 취소(Abort) 핸들.
  const aiAbortRef = useRef<AbortController | null>(null);

  const busy = aiPending || reverting;

  const handleRegenerate = async () => {
    setAiPending(true);
    setError(null);
    const ac = new AbortController();
    aiAbortRef.current = ac;
    try {
      const res = await fetch(`/api/diaries/${diaryId}/regenerate`, {
        method: "POST",
        signal: ac.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "재생성에 실패했어요");
        return;
      }
      const d = data.diary;
      onUpdated({
        title: d.title,
        content: d.content,
        hasPreviousContent: d.previousContent !== null,
        aiGenerationVersion: d.aiGenerationVersion,
      });
    } catch (e) {
      // 사용자가 취소한 경우는 에러로 표시하지 않는다.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "재생성에 실패했어요");
    } finally {
      setAiPending(false);
      aiAbortRef.current = null;
    }
  };

  // 진행 중 오버레이의 "취소" — 응답 대기를 끊는다(그만 기다리기).
  const handleCancelAi = () => {
    aiAbortRef.current?.abort();
  };

  const handleRevert = () => {
    setError(null);
    startRevert(async () => {
      const result = await revertDiaryAction(diaryId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onUpdated(result.data);
    });
  };

  return (
    <div
      style={{
        marginTop: "var(--space-6)",
        paddingTop: "var(--space-4)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={busy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            backgroundColor: busy ? "var(--surface)" : "var(--surface-raised)",
            color: busy ? "var(--fg-subtle)" : "var(--fg)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          {aiPending ? <Spinner size={14} /> : <Sparkles size={14} aria-hidden />}
          {aiPending
            ? "AI가 정리 중..."
            : aiGenerationVersion === 0
              ? "AI로 정리하기"
              : "AI로 다시 정리하기"}
        </button>

        {hasPreviousContent && (
          <button
            type="button"
            onClick={handleRevert}
            disabled={busy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              backgroundColor: "transparent",
              color: busy ? "var(--fg-subtle)" : "var(--fg-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: busy ? "default" : "pointer",
            }}
          >
            <Undo2 size={14} aria-hidden />
            {reverting ? "되돌리는 중..." : "이전 내용으로 되돌리기"}
          </button>
        )}
      </div>

      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-subtle)",
          margin: 0,
        }}
      >
        {aiGenerationVersion > 0
          ? "사진과 메모를 기반으로 AI가 다시 정리해줘요."
          : "사진과 본문을 기반으로 AI가 1인칭 일기로 정리해줘요."}
      </p>

      {error && (
        <p
          role="alert"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--danger)",
            backgroundColor:
              "color-mix(in srgb, var(--danger) 10%, transparent)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      {aiPending && (
        <AiBusyOverlay
          label={"작성한 내용과 사진을 바탕으로\n일기를 다시 정리하고 있어요"}
          onCancel={handleCancelAi}
        />
      )}
    </div>
  );
}
