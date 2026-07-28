"use client";

import {
  AI_INSTRUCTION_PRESETS,
  MAX_AI_INSTRUCTION_FREE_TEXT_LENGTH,
} from "@/lib/diary/ai-instruction";

// 재정리 방향 입력 — 프리셋 칩(다중 선택) + 자유 입력 한 줄.
// 상태는 부모가 소유하고(controlled) 전송 직전 buildInstruction으로 합친다.
// 칩 스타일은 mood-picker.tsx의 기존 칩 패턴을 따른다 (pill / fill-2 / minHeight 36).

interface AiInstructionInputProps {
  chips: string[];
  onChipsChange: (next: string[]) => void;
  freeText: string;
  onFreeTextChange: (next: string) => void;
  disabled?: boolean;
}

export function AiInstructionInput({
  chips,
  onChipsChange,
  freeText,
  onFreeTextChange,
  disabled = false,
}: AiInstructionInputProps) {
  const toggle = (preset: string) => {
    onChipsChange(
      chips.includes(preset)
        ? chips.filter((c) => c !== preset)
        : [...chips, preset],
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--fg-muted)",
          margin: 0,
        }}
      >
        어떻게 다시 정리할까요? (선택)
      </p>

      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          overflowX: "auto",
          paddingBottom: 2,
        }}
        className="hide-scrollbar"
      >
        {AI_INSTRUCTION_PRESETS.map((preset) => {
          const isSelected = chips.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => toggle(preset)}
              disabled={disabled}
              aria-pressed={isSelected}
              className="pressable"
              style={{
                flexShrink: 0,
                minHeight: 36,
                padding: "0 12px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                backgroundColor: isSelected ? "var(--tint)" : "var(--fill-2)",
                color: isSelected ? "#fff" : "var(--fg-muted)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                cursor: disabled ? "default" : "pointer",
                outline: "none",
                transition:
                  "background-color var(--duration-fast) var(--ease-out)",
              }}
            >
              {preset}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={freeText}
        onChange={(e) => onFreeTextChange(e.target.value)}
        disabled={disabled}
        placeholder="예: 아침 얘기는 빼줘"
        maxLength={MAX_AI_INSTRUCTION_FREE_TEXT_LENGTH}
        style={{
          width: "100%",
          height: 40,
          padding: "0 var(--space-3)",
          borderRadius: "var(--radius-pill)",
          border: "none",
          backgroundColor: "var(--fill-2)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-base)",
          color: "var(--fg)",
          outline: "none",
        }}
      />
    </div>
  );
}
