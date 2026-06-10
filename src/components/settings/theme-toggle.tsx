"use client";

import { useEffect, useState } from "react";

export type ThemePref = "auto" | "light" | "dark";

const THEME_KEY = "memoism-theme";

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "auto", label: "자동" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
];

function resolveDark(pref: ThemePref): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(pref: ThemePref) {
  document.documentElement.classList.toggle("dark", resolveDark(pref));
}

/**
 * iOS 세그먼트 컨트롤로 테마 선택 (자동/라이트/다크).
 * - localStorage('memoism-theme')에 저장, layout.tsx의 pre-paint 스크립트가 첫 페인트 전에 적용.
 * - 자동 모드에서는 시스템 prefers-color-scheme 변경을 실시간 반영.
 */
export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>("auto");

  // 마운트 시 저장된 선호 복원 (pre-paint 스크립트와 같은 키)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemePref | null;
      if (saved === "light" || saved === "dark" || saved === "auto") {
        setPref(saved);
      }
    } catch {
      /* localStorage 접근 불가 환경 — 자동 유지 */
    }
  }, []);

  // 자동 모드일 때만 시스템 테마 변경 추적
  useEffect(() => {
    if (pref !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const select = (next: ThemePref) => {
    setPref(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 저장 실패해도 현재 세션엔 적용 */
    }
    applyTheme(next);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-2) var(--space-4)",
        minHeight: 48,
        gap: "var(--space-3)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-base)",
          color: "var(--fg)",
        }}
      >
        테마
      </span>

      {/* iOS 세그먼트: fill 트랙 캡슐 + 흰 thumb */}
      <div
        role="radiogroup"
        aria-label="테마 선택"
        style={{
          display: "flex",
          backgroundColor: "var(--fill-2)",
          borderRadius: "var(--radius-pill)",
          padding: 2,
          gap: 2,
        }}
      >
        {OPTIONS.map((opt) => {
          const active = pref === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => select(opt.value)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "6px 14px",
                minHeight: 32,
                borderRadius: "var(--radius-pill)",
                backgroundColor: active ? "var(--surface)" : "transparent",
                color: active ? "var(--fg)" : "var(--fg-muted)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                fontWeight: active ? 600 : 400,
                boxShadow: active ? "var(--shadow-xs)" : "none",
                transition:
                  "background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
