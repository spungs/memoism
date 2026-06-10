"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction, changePasswordAction, type ChangePasswordState } from "@/lib/auth/actions";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PushToggle } from "@/components/settings/push-toggle";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { PageHeader } from "@/components/layout/page-header";

const APP_VERSION = "v0.1.0";

// iOS 설정 앱 그룹 리스트 패턴
// 섹션 레이블: 카드 밖 좌측 16px, 13px / secondary
const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  fontWeight: 400,
  color: "var(--fg-muted)",
  margin: "0 0 var(--space-2)",
  paddingLeft: "var(--space-4)",
  letterSpacing: 0,
  textTransform: "none",
};

// 흰 카드 radius 12, 테두리 없음, 그림자 없음
const CARD_STYLE: React.CSSProperties = {
  backgroundColor: "var(--surface)",
  borderRadius: "var(--radius-md)",
  overflow: "hidden",
};

// 행 48px, 좌우 패딩 16
const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 var(--space-4)",
  minHeight: 48,
  gap: "var(--space-3)",
};

const ROW_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-base)",
  fontWeight: 400,
  color: "var(--fg)",
};

const ROW_VALUE_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-base)",
  color: "var(--fg-muted)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
};

// 좌측 16px inset 헤어라인
const DIVIDER_STYLE: React.CSSProperties = {
  height: 1,
  backgroundColor: "var(--separator)",
  marginLeft: "var(--space-4)",
};

function getInitials(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[^a-zA-Z0-9가-힣]/g, "");
  if (cleaned.length === 0) return "?";
  return cleaned.slice(0, 2).toUpperCase();
}

interface SettingsViewProps {
  email: string;
}

export function SettingsView({ email }: SettingsViewProps) {
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await logoutAction();
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "내보내기에 실패했어요");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `memoism-export-${today}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "내보내기에 실패했어요");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "탈퇴에 실패했어요");
      }
      router.push("/login");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "탈퇴에 실패했어요");
      setDeleteLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg)",
        minHeight: "100svh",
        paddingBottom: "var(--space-10)",
      }}
    >
      <PageHeader title="설정" />

      {/* 계정 프로필 카드 — 그룹 상단 */}
      <div style={{ padding: "0 var(--space-5)", marginBottom: "var(--space-8)" }}>
        <div
          style={{
            ...CARD_STYLE,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            padding: "var(--space-4)",
          }}
        >
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--tint)",
              color: "var(--on-tint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              fontWeight: 600,
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
                fontWeight: 500,
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
                fontSize: "var(--text-sm)",
                color: "var(--fg-muted)",
                margin: "2px 0 0",
              }}
            >
              로그인된 계정
            </p>
          </div>
        </div>
      </div>

      {/* 계정 그룹 */}
      <div style={{ padding: "0 var(--space-5)", marginBottom: "var(--space-6)" }}>
        <p style={SECTION_LABEL_STYLE}>계정</p>
        <div style={CARD_STYLE}>
          <RowButton
            label="비밀번호 변경"
            onClick={() => setPasswordOpen(true)}
          />
        </div>
      </div>

      {/* 알림 그룹 */}
      <div style={{ padding: "0 var(--space-5)", marginBottom: "var(--space-6)" }}>
        <p style={SECTION_LABEL_STYLE}>알림</p>
        <div style={CARD_STYLE}>
          <PushToggle />
        </div>
      </div>

      {/* 화면 그룹 */}
      <div style={{ padding: "0 var(--space-5)", marginBottom: "var(--space-6)" }}>
        <p style={SECTION_LABEL_STYLE}>화면</p>
        <div style={CARD_STYLE}>
          <ThemeToggle />
        </div>
      </div>

      {/* 데이터 그룹 */}
      <div style={{ padding: "0 var(--space-5)", marginBottom: "var(--space-6)" }}>
        <p style={SECTION_LABEL_STYLE}>데이터</p>
        <div style={CARD_STYLE}>
          <RowButton
            label={exporting ? "내보내는 중..." : "데이터 내보내기"}
            onClick={handleExport}
            disabled={exporting}
          />
          <div style={DIVIDER_STYLE} />
          <RowButton
            label="계정 탈퇴"
            onClick={() => setDeleteOpen(true)}
            danger
          />
        </div>
        {exportError && (
          <p
            role="alert"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--danger)",
              margin: "var(--space-2) 0 0",
              paddingLeft: "var(--space-4)",
            }}
          >
            {exportError}
          </p>
        )}
      </div>

      {/* 정보 그룹 */}
      <div style={{ padding: "0 var(--space-5)", marginBottom: "var(--space-8)" }}>
        <p style={SECTION_LABEL_STYLE}>정보</p>
        <div style={CARD_STYLE}>
          <div style={{ ...ROW_STYLE }}>
            <span style={ROW_LABEL_STYLE}>버전</span>
            <span style={ROW_VALUE_STYLE}>{APP_VERSION}</span>
          </div>
        </div>
      </div>

      {/* 로그아웃 — 별도 그룹, danger 글자 */}
      <div style={{ padding: "0 var(--space-5)" }}>
        <div style={CARD_STYLE}>
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="pressable"
            style={{
              ...ROW_STYLE,
              width: "100%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                fontWeight: 500,
                color: "var(--danger)",
              }}
            >
              로그아웃
            </span>
          </button>
        </div>
      </div>

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

      <ConfirmSheet
        isOpen={deleteOpen}
        onClose={() => !deleteLoading && setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="정말 탈퇴할까요?"
        description={
          deleteError ??
          "모든 일기·사진·대화가 즉시 삭제되며 복구할 수 없어요."
        }
        confirmLabel="탈퇴하기"
        confirmVariant="danger"
        isLoading={deleteLoading}
      />
    </div>
  );
}

// 이동 행 — 우측 chevron, press 시 fill-3 하이라이트
function RowButton({
  label,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="pressable"
      style={{
        ...ROW_STYLE,
        width: "100%",
        background: "transparent",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          ...ROW_LABEL_STYLE,
          color: danger ? "var(--danger)" : "var(--fg)",
        }}
      >
        {label}
      </span>
      <ChevronIcon />
    </button>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--fg-placeholder)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
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
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--fg)",
            margin: "0 0 var(--space-5)",
            textAlign: "center",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          비밀번호 변경
        </p>

        <form
          ref={formRef}
          action={formAction}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
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
                height: 50,
                borderRadius: "var(--radius-md)",
                border: "none",
                backgroundColor: "var(--fill-2)",
                color: "var(--fg-muted)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                fontWeight: 500,
                cursor: pending ? "default" : "pointer",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending}
              className="pressable"
              style={{
                flex: 1,
                height: 50,
                borderRadius: "var(--radius-md)",
                border: "none",
                backgroundColor: pending ? "var(--tint-soft)" : "var(--tint)",
                color: pending ? "var(--tint)" : "var(--on-tint)",
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
  return (
    <div>
      <label
        htmlFor={name}
        style={{
          display: "block",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--fg-muted)",
          fontWeight: 400,
          marginBottom: "var(--space-1)",
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
          height: 50,
          padding: "0 var(--space-4)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-base)",
          color: "var(--fg)",
          backgroundColor: focused ? "var(--fill-1)" : "var(--fill-2)",
          border: error ? "1.5px solid var(--danger)" : "none",
          borderRadius: "var(--radius-md)",
          outline: "none",
          transition: `background-color var(--duration-fast) var(--ease-out)`,
        }}
      />
      {error ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--danger)", margin: "var(--space-1) 0 0" }}>
          {error}
        </p>
      ) : hint ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--fg-muted)", margin: "var(--space-1) 0 0" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
