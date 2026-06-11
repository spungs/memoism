"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  completeGoogleSignupAction,
  type GoogleConsentState,
} from "@/lib/auth/google-actions";

export function GoogleConsentForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<GoogleConsentState, FormData>(
    completeGoogleSignupAction,
    {},
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <header style={{ textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            color: "var(--tint)",
            letterSpacing: "var(--tracking-tight)",
            margin: 0,
          }}
        >
          메모이즘
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            color: "var(--fg-muted)",
            marginTop: "var(--space-2)",
            marginBottom: 0,
          }}
        >
          {email}로 시작해요
        </p>
      </header>

      <form
        action={formAction}
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
      >
        <label
          htmlFor="consent"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
            lineHeight: "var(--leading-relaxed)",
            cursor: "pointer",
          }}
        >
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--tint)", flexShrink: 0 }}
          />
          <span>
            사진·텍스트가 일기 생성·검색을 위해 Google Gemini로 전송되는 것에 동의해요.{" "}
            <span style={{ color: "var(--danger)" }}>(필수)</span>
          </span>
        </label>

        {state.error && (
          <p
            role="alert"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--danger)",
              margin: 0,
            }}
          >
            {state.error}
          </p>
        )}

        {state.restart ? (
          <Link
            href="/login"
            className="pressable"
            style={{
              width: "100%",
              height: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              color: "var(--on-tint)",
              backgroundColor: "var(--tint)",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
            }}
          >
            로그인으로
          </Link>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="pressable"
            style={{
              width: "100%",
              height: 50,
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              color: pending ? "var(--tint)" : "var(--on-tint)",
              backgroundColor: pending ? "var(--tint-soft)" : "var(--tint)",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: pending ? "default" : "pointer",
            }}
          >
            {pending ? "시작하는 중..." : "동의하고 시작하기"}
          </button>
        )}
      </form>
    </div>
  );
}
