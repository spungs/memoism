"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import type { AuthFormState } from "@/lib/auth/actions";

type Mode = "login" | "signup";

interface AuthFormProps {
  mode: Mode;
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}

const COPY = {
  login: {
    title: "메모이즘",
    subtitle: "다시 만나서 반가워요",
    submit: "로그인",
    submitting: "로그인 중...",
    altPrompt: "아직 계정이 없으신가요?",
    altLabel: "회원가입",
    altHref: "/signup",
  },
  signup: {
    title: "메모이즘",
    subtitle: "오늘의 감정을 기록해요",
    submit: "계정 만들기",
    submitting: "계정 생성 중...",
    altPrompt: "이미 계정이 있으신가요?",
    altLabel: "로그인",
    altHref: "/login",
  },
} as const;

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-xs)",
  color: "var(--fg-subtle)",
  letterSpacing: "var(--tracking-wider)",
  fontWeight: 600,
  textTransform: "uppercase",
  marginBottom: "var(--space-2)",
};

const ERROR_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  color: "var(--danger)",
  marginTop: "var(--space-2)",
  marginBottom: 0,
};

const HINT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-xs)",
  color: "var(--fg-subtle)",
  marginTop: "var(--space-2)",
  marginBottom: 0,
};

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";
  const borderColor = invalid
    ? "var(--danger)"
    : focused
      ? "var(--accent-rose)"
      : "var(--border)";
  return (
    <input
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={{
        width: "100%",
        height: 52,
        padding: "0 var(--space-4)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-base)",
        color: "var(--fg)",
        backgroundColor: "var(--surface-raised)",
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-lg)",
        outline: "none",
        transition: `border-color var(--duration-fast) var(--ease-out)`,
        boxShadow: focused && !invalid ? "var(--shadow-xs)" : "none",
      }}
    />
  );
}

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    {},
  );
  const [email, setEmail] = useState("");
  // 검증 실패 시 password input을 remount해서 비움 (key 변경 방식).
  // form에 onReset preventDefault를 걸어 React 19 auto-reset을 막고,
  // controlled email input의 "uncontrolled→controlled" 경고도 제거한다.
  const [passwordKey, setPasswordKey] = useState(0);
  useEffect(() => {
    if (state.fieldErrors || state.error) setPasswordKey((k) => k + 1);
  }, [state]);
  const copy = COPY[mode];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
      <header style={{ textAlign: "center" }}>
        <p
          aria-hidden
          style={{
            fontSize: 32,
            lineHeight: 1,
            margin: 0,
            marginBottom: "var(--space-4)",
          }}
        >
          🌸
        </p>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-3xl)",
            fontWeight: 700,
            color: "var(--fg)",
            letterSpacing: "var(--tracking-tight)",
            lineHeight: "var(--leading-tight)",
            margin: 0,
          }}
        >
          {copy.title}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-hand)",
            fontSize: "var(--text-lg)",
            color: "var(--fg-muted)",
            marginTop: "var(--space-3)",
            marginBottom: 0,
          }}
        >
          {copy.subtitle}
        </p>
      </header>

      <form
        action={formAction}
        noValidate
        onReset={(e) => e.preventDefault()}
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
      >
        <div>
          <label htmlFor="email" style={LABEL_STYLE}>
            이메일
          </label>
          <FieldInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={
              state.fieldErrors?.email ? "email-error" : undefined
            }
          />
          {state.fieldErrors?.email && (
            <p id="email-error" role="alert" style={ERROR_STYLE}>
              {state.fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" style={LABEL_STYLE}>
            비밀번호
          </label>
          <FieldInput
            key={passwordKey}
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            placeholder={mode === "signup" ? "8자 이상" : "비밀번호"}
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby={
              state.fieldErrors?.password ? "password-error" : undefined
            }
          />
          {state.fieldErrors?.password ? (
            <p id="password-error" role="alert" style={ERROR_STYLE}>
              {state.fieldErrors.password}
            </p>
          ) : mode === "signup" ? (
            <p style={HINT_STYLE}>8자 이상 입력해주세요.</p>
          ) : null}
        </div>

        {mode === "signup" && (
          <div>
            <label
              htmlFor="consent"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-3)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg)",
                lineHeight: "var(--leading-relaxed)",
                cursor: "pointer",
              }}
            >
              <input
                id="consent"
                name="consent"
                type="checkbox"
                required
                aria-invalid={Boolean(state.fieldErrors?.consent)}
                aria-describedby={
                  state.fieldErrors?.consent ? "consent-error" : undefined
                }
                style={{
                  marginTop: 3,
                  width: 18,
                  height: 18,
                  accentColor: "var(--accent-rose)",
                  flexShrink: 0,
                }}
              />
              <span>
                사진·텍스트가 일기 생성·검색을 위해 Google Gemini로 전송되는
                것에 동의해요. <span style={{ color: "var(--danger)" }}>(필수)</span>
              </span>
            </label>
            {state.fieldErrors?.consent && (
              <p
                id="consent-error"
                role="alert"
                style={{ ...ERROR_STYLE, marginLeft: 30 }}
              >
                {state.fieldErrors.consent}
              </p>
            )}
          </div>
        )}

        {state.error && (
          <p
            role="alert"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--danger)",
              backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              margin: 0,
            }}
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            width: "100%",
            height: 52,
            marginTop: "var(--space-3)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--paper-0)",
            backgroundColor: pending ? "var(--accent-rose-soft)" : "var(--accent-rose)",
            border: "none",
            borderRadius: "var(--radius-lg)",
            cursor: pending ? "default" : "pointer",
            transition: `background-color var(--duration-fast) var(--ease-out)`,
            boxShadow: pending ? "none" : "var(--shadow-sm)",
          }}
        >
          {pending ? copy.submitting : copy.submit}
        </button>
      </form>

      <p
        style={{
          textAlign: "center",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--fg-subtle)",
          margin: 0,
        }}
      >
        {copy.altPrompt}{" "}
        <Link
          href={copy.altHref}
          style={{
            color: "var(--accent-rose-deep)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {copy.altLabel}
        </Link>
      </p>
    </div>
  );
}
