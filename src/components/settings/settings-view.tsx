"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logoutAction, changePasswordAction, type ChangePasswordState } from "@/lib/auth/actions";
import { updateCharacterName } from "@/lib/character/actions";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { BottomSheet } from "@/components/ui/bottom-sheet";

const APP_VERSION = "v0.1.0";

interface SettingsViewProps {
  email: string;
  characterName: string;
  bornAt: string;
}

const SECTION_HEADER_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-xs)",
  color: "var(--fg-subtle)",
  letterSpacing: "var(--tracking-wider)",
  fontWeight: 600,
  textTransform: "uppercase",
  margin: "0 0 var(--space-2)",
  paddingLeft: "var(--space-2)",
};

const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-4) var(--space-4)",
  minHeight: 56,
  gap: "var(--space-3)",
};

const ROW_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-base)",
  color: "var(--fg)",
};

const ROW_VALUE_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  color: "var(--fg-subtle)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
};

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: "var(--surface-raised)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--border)",
  overflow: "hidden",
};

const DIVIDER_STYLE: React.CSSProperties = {
  height: 1,
  backgroundColor: "var(--border)",
  marginLeft: "var(--space-4)",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getInitials(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[^a-zA-Z0-9가-힣]/g, "");
  if (cleaned.length === 0) return "?";
  return cleaned.slice(0, 2).toUpperCase();
}

export function SettingsView({ email, characterName, bornAt }: SettingsViewProps) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(characterName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [namePending, setNamePending] = useState(false);
  const [displayName, setDisplayName] = useState(characterName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await logoutAction();
  };

  const handleNameSave = async () => {
    setNameError(null);
    setNamePending(true);
    const fd = new FormData();
    fd.set("name", nameDraft);
    const res = await updateCharacterName({}, fd);
    setNamePending(false);
    if (res.ok) {
      setDisplayName(nameDraft.trim());
      setEditingName(false);
    } else {
      setNameError(res.error ?? "저장에 실패했어요");
    }
  };

  const handleNameCancel = () => {
    setNameDraft(displayName);
    setNameError(null);
    setEditingName(false);
  };

  return (
    <div
      style={{
        backgroundColor: "var(--paper-0)",
        minHeight: "100svh",
        padding: "var(--space-6) var(--space-5) var(--space-10)",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-3xl)",
          fontWeight: 700,
          color: "var(--fg)",
          letterSpacing: "var(--tracking-tight)",
          margin: "0 0 var(--space-6)",
        }}
      >
        설정
      </h1>

      <section
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          padding: "var(--space-5)",
          marginBottom: "var(--space-8)",
          ...CARD_STYLE,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--accent-rose)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-wide)",
            flexShrink: 0,
          }}
        >
          {getInitials(email)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              color: "var(--fg)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {email}
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-subtle)",
              margin: "2px 0 0",
            }}
          >
            로그인된 계정
          </p>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={SECTION_HEADER_STYLE}>계정</h2>
        <div style={CARD_STYLE}>
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            style={{ ...ROW_STYLE, width: "100%", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <span style={ROW_LABEL_STYLE}>비밀번호 변경</span>
            <Chevron />
          </button>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={SECTION_HEADER_STYLE}>앱</h2>
        <div style={CARD_STYLE}>
          <div style={{ ...ROW_STYLE, flexDirection: editingName ? "column" : "row", alignItems: editingName ? "stretch" : "center" }}>
            <span style={ROW_LABEL_STYLE}>캐릭터 이름</span>
            {editingName ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", width: "100%" }}>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={20}
                  disabled={namePending}
                  style={{
                    width: "100%",
                    height: 44,
                    padding: "0 var(--space-3)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-base)",
                    color: "var(--fg)",
                    backgroundColor: "var(--paper-0)",
                    border: `1px solid ${nameError ? "var(--danger)" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    outline: "none",
                  }}
                />
                {nameError && (
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--danger)", margin: 0 }}>
                    {nameError}
                  </p>
                )}
                <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={handleNameCancel}
                    disabled={namePending}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-sm)",
                      color: "var(--fg-muted)",
                      cursor: namePending ? "default" : "pointer",
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleNameSave}
                    disabled={namePending || !nameDraft.trim() || nameDraft.trim() === displayName}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      backgroundColor:
                        namePending || !nameDraft.trim() || nameDraft.trim() === displayName
                          ? "var(--accent-rose-soft)"
                          : "var(--accent-rose)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "#fff",
                      cursor:
                        namePending || !nameDraft.trim() || nameDraft.trim() === displayName
                          ? "default"
                          : "pointer",
                    }}
                  >
                    {namePending ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(displayName);
                  setEditingName(true);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  ...ROW_VALUE_STYLE,
                }}
              >
                <span style={{ color: "var(--fg)" }}>{displayName}</span>
                <Chevron />
              </button>
            )}
          </div>
          <div style={DIVIDER_STYLE} />
          <div style={ROW_STYLE}>
            <span style={ROW_LABEL_STYLE}>탄생일</span>
            <span style={ROW_VALUE_STYLE}>{formatDate(bornAt)}</span>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2 style={SECTION_HEADER_STYLE}>정보</h2>
        <div style={CARD_STYLE}>
          <div style={ROW_STYLE}>
            <span style={ROW_LABEL_STYLE}>버전</span>
            <span style={ROW_VALUE_STYLE}>{APP_VERSION}</span>
          </div>
          <div style={DIVIDER_STYLE} />
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ ...ROW_STYLE, textDecoration: "none" }}
          >
            <span style={ROW_LABEL_STYLE}>개인정보처리방침</span>
            <Chevron />
          </a>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        style={{
          width: "100%",
          height: 52,
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-base)",
          fontWeight: 600,
          color: "var(--danger)",
          backgroundColor: "transparent",
          border: "1.5px solid color-mix(in srgb, var(--danger) 30%, transparent)",
          borderRadius: "var(--radius-lg)",
          cursor: "pointer",
        }}
      >
        로그아웃
      </button>

      <ConfirmSheet
        isOpen={logoutOpen}
        onClose={() => !logoutLoading && setLogoutOpen(false)}
        onConfirm={handleLogout}
        title="로그아웃 할까요?"
        description="다시 로그인하면 모든 기록을 다시 볼 수 있어요."
        confirmLabel="로그아웃"
        confirmVariant="danger"
        isLoading={logoutLoading}
      />

      <PasswordSheet
        isOpen={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-4)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PasswordSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      const t = setTimeout(() => onClose(), 600);
      return () => clearTimeout(t);
    }
  }, [state.ok, onClose]);

  return (
    <BottomSheet isOpen={isOpen} onClose={pending ? () => {} : onClose}>
      <div style={{ padding: "var(--space-4) var(--space-5) 0" }}>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-lg)",
            color: "var(--fg)",
            margin: "0 0 var(--space-5)",
            textAlign: "center",
          }}
        >
          비밀번호 변경
        </p>

        <form
          ref={formRef}
          action={formAction}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        >
          <PasswordField
            name="currentPassword"
            label="현재 비밀번호"
            autoComplete="current-password"
            error={state.fieldErrors?.currentPassword}
          />
          <PasswordField
            name="newPassword"
            label="새 비밀번호"
            autoComplete="new-password"
            error={state.fieldErrors?.newPassword}
            hint="8자 이상"
          />
          <PasswordField
            name="confirmPassword"
            label="새 비밀번호 확인"
            autoComplete="new-password"
            error={state.fieldErrors?.confirmPassword}
          />

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

          {state.ok && (
            <p
              role="status"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--success)",
                margin: 0,
                textAlign: "center",
              }}
            >
              비밀번호가 변경되었어요
            </p>
          )}

          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              style={{
                flex: 1,
                padding: "var(--space-4)",
                borderRadius: "var(--radius-lg)",
                border: "1.5px solid var(--border)",
                backgroundColor: "transparent",
                color: "var(--fg-muted)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                cursor: pending ? "default" : "pointer",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending}
              style={{
                flex: 1,
                padding: "var(--space-4)",
                borderRadius: "var(--radius-lg)",
                border: "none",
                backgroundColor: pending ? "var(--accent-rose-soft)" : "var(--accent-rose)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                cursor: pending ? "default" : "pointer",
              }}
            >
              {pending ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </BottomSheet>
  );
}

function PasswordField({
  name,
  label,
  autoComplete,
  error,
  hint,
}: {
  name: string;
  label: string;
  autoComplete: string;
  error?: string;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "var(--danger)" : focused ? "var(--accent-rose)" : "var(--border)";
  return (
    <div>
      <label
        htmlFor={name}
        style={{
          display: "block",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-subtle)",
          letterSpacing: "var(--tracking-wider)",
          fontWeight: 600,
          textTransform: "uppercase",
          marginBottom: "var(--space-2)",
        }}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="password"
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-invalid={Boolean(error)}
        style={{
          width: "100%",
          height: 48,
          padding: "0 var(--space-4)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-base)",
          color: "var(--fg)",
          backgroundColor: "var(--surface-raised)",
          border: `1px solid ${borderColor}`,
          borderRadius: "var(--radius-md)",
          outline: "none",
        }}
      />
      {error ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--danger)", margin: "var(--space-2) 0 0" }}>
          {error}
        </p>
      ) : hint ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--fg-subtle)", margin: "var(--space-2) 0 0" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
