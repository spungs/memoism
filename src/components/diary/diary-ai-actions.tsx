"use client";

import { useRef, useState, useTransition } from "react";
import { Sparkles, Undo2 } from "lucide-react";
import { revertDiaryAction } from "@/lib/diary/actions";
import { AiInstructionInput } from "./ai-instruction-input";
import { isOverAiLimit } from "./content-length-hint";
import { buildInstruction } from "@/lib/diary/ai-instruction";
import { AiBusyOverlay, Spinner } from "@/components/ui/ai-busy-overlay";
import { AiUsageCounter } from "@/components/ai/ai-usage-counter";

export interface DiaryAiUpdate {
  title: string;
  content: string;
  hasPreviousContent: boolean;
  aiGenerationVersion: number;
}

interface Props {
  diaryId: string;
  /** 편집 중인 *현재* 본문. 저장 안 한 수정도 AI 입력이 된다. */
  currentContent: string;
  /** 편집 중인 *현재* 제목. 사용자가 고쳤으면 AI 제목이 덮어쓰지 않는다. */
  currentTitle: string;
  hasPreviousContent: boolean;
  aiGenerationVersion: number;
  /** 재생성·되돌리기 성공 시 부모에게 새 데이터 전달 (state lifting). */
  onUpdated: (data: DiaryAiUpdate) => void;
}

export function DiaryAiActions({
  diaryId,
  currentContent,
  currentTitle,
  hasPreviousContent,
  aiGenerationVersion,
  onUpdated,
}: Props) {
  const [aiPending, setAiPending] = useState(false);
  const [reverting, startRevert] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [usageSignal, setUsageSignal] = useState(0);
  // 재정리 방향 지시 — 이미 한 번 정리한 뒤(version > 0)에만 노출한다.
  // 최초 정리는 버튼 하나로 무마찰 유지.
  const [instructionChips, setInstructionChips] = useState<string[]>([]);
  const [instructionText, setInstructionText] = useState("");
  const showInstruction = aiGenerationVersion > 0;
  // 진행 중인 재생성 요청 취소(Abort) 핸들.
  const aiAbortRef = useRef<AbortController | null>(null);

  const busy = aiPending || reverting;
  // 상한 초과면 눌러봐야 400이다. 누르기 전에 막는다 (저장·수정은 그대로 가능).
  const overAiLimit = isOverAiLimit(currentContent);

  const handleRegenerate = async () => {
    setAiPending(true);
    setError(null);
    const ac = new AbortController();
    aiAbortRef.current = ac;
    try {
      const res = await fetch(`/api/diaries/${diaryId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 저장하지 않은 편집도 입력이 되게 현재 본문을 보낸다. 예전엔 body 없이
        // 보내 서버가 DB 본문만 읽었고, 사용자가 친 글은 무시된 채 덮어써졌다.
        body: JSON.stringify({
          content: currentContent,
          title: currentTitle,
          instruction: showInstruction
            ? buildInstruction(instructionChips, instructionText) || undefined
            : undefined,
        }),
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
      // 지시가 반영된 결과가 나왔으니 비운다. 남겨두면 다음 재정리에 또 적용된다.
      setInstructionChips([]);
      setInstructionText("");
    } catch (e) {
      // 사용자가 취소한 경우는 에러로 표시하지 않는다.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "재생성에 실패했어요");
    } finally {
      setAiPending(false);
      setUsageSignal((n) => n + 1);
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
      {showInstruction && (
        <AiInstructionInput
          chips={instructionChips}
          onChipsChange={setInstructionChips}
          freeText={instructionText}
          onFreeTextChange={setInstructionText}
          disabled={busy}
        />
      )}

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {/* Tinted 버튼 — tint-soft 배경 + tint 글자 */}
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={busy || overAiLimit}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "0 var(--space-4)",
            height: 44,
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor:
              busy || overAiLimit ? "var(--fill-2)" : "var(--tint-soft)",
            color:
              busy || overAiLimit ? "var(--fg-placeholder)" : "var(--tint)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            cursor: busy || overAiLimit ? "default" : "pointer",
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
              padding: "0 var(--space-3)",
              height: 44,
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: "transparent",
              color: busy ? "var(--fg-placeholder)" : "var(--fg-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
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
          fontSize: "var(--text-sm)",
          color: "var(--fg-placeholder)",
          margin: 0,
        }}
      >
        {overAiLimit
          ? "내용이 길어 AI 정리는 어려워요. 수정·저장은 그대로 됩니다."
          : aiGenerationVersion > 0
            ? "사진과 메모를 기반으로 AI가 다시 정리해줘요."
            : "사진과 본문을 기반으로 AI가 1인칭 일기로 정리해줘요."}
      </p>

      <AiUsageCounter refreshSignal={usageSignal} />

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
