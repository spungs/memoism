"use client";

import { useState, useTransition } from "react";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import {
  deleteFragmentAction,
  updateFragmentAction,
} from "@/lib/diary/fragment-actions";

export type TimelineFragment = {
  id: string;
  kind: string;
  content: string | null;
  createdAt: Date;
};

/** KST 시각 라벨 (12:31). */
function timeLabel(d: Date): string {
  return d.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const ACTION_BUTTON: React.CSSProperties = {
  border: "none",
  background: "none",
  padding: "4px 8px",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-xs)",
  color: "var(--fg-muted)",
  cursor: "pointer",
};

/**
 * 조각 타임라인 (스펙 §6 ②층). AI 정리를 안 해도 이것만으로 그날이 설명된다.
 * 정리된 산문이 있어도 조각은 보존·표시한다(되돌리기·재정리의 원본 근거).
 *
 * 조각을 탭하면 수정·삭제가 열린다. 사진 조각은 내용이 텍스트가 아니라 삭제만 가능.
 */
export function FragmentTimeline({
  fragments,
}: {
  fragments: TimelineFragment[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (fragments.length === 0) return null;

  const startEdit = (f: TimelineFragment) => {
    setEditingId(f.id);
    setDraft(f.content ?? "");
    setError(null);
  };

  const save = (id: string) => {
    startTransition(async () => {
      const r = await updateFragmentAction(id, draft);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setEditingId(null);
    });
  };

  const remove = () => {
    const id = confirmDeleteId;
    if (!id) return;
    startTransition(async () => {
      const r = await deleteFragmentAction(id);
      if (!r.ok) setError(r.error);
      else setError(null);
      setConfirmDeleteId(null);
    });
  };

  return (
    <section style={{ marginTop: 24 }}>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-subtle)",
          letterSpacing: "var(--tracking-wider)",
          fontWeight: 600,
          margin: "0 0 8px",
        }}
      >
        📎 모은 조각 ({fragments.length})
      </p>

      {error && (
        <p
          style={{
            margin: "0 0 8px",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--danger)",
          }}
        >
          {error}
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {fragments.map((f) => {
          const isEditing = editingId === f.id;
          return (
            <li
              key={f.id}
              style={{
                padding: "8px 0",
                borderTop: "1px solid var(--separator)",
              }}
            >
              <div style={{ display: "flex", gap: 10 }}>
                <span
                  style={{
                    flexShrink: 0,
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)",
                    color: "var(--fg-placeholder)",
                    paddingTop: 2,
                  }}
                >
                  {timeLabel(f.createdAt)}
                </span>

                {isEditing ? (
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    autoFocus
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-sm)",
                      color: "var(--fg)",
                      background: "var(--fill-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: 6,
                      resize: "none",
                    }}
                  />
                ) : (
                  <span
                    className="selectable"
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-sm)",
                      color: "var(--fg)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {f.kind === "photo" ? "📷 사진" : f.content}
                  </span>
                )}
              </div>

              {isEditing && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    style={ACTION_BUTTON}
                    disabled={pending}
                    onClick={() => {
                      setEditingId(null);
                      setError(null);
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    style={{ ...ACTION_BUTTON, color: "var(--tint)" }}
                    disabled={pending}
                    onClick={() => save(f.id)}
                  >
                    저장
                  </button>
                </div>
              )}

              {/* 액션은 **항상 보인다**. 탭해야 나타나면 수정·삭제가 가능한 줄 모른다
                  (숨은 어포던스는 이 앱의 알려진 실패 지점이다). */}
              {!isEditing && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 2,
                  }}
                >
                  {f.kind !== "photo" && (
                    <button
                      type="button"
                      style={ACTION_BUTTON}
                      disabled={pending}
                      onClick={() => startEdit(f)}
                    >
                      수정
                    </button>
                  )}
                  <button
                    type="button"
                    style={{ ...ACTION_BUTTON, color: "var(--danger)" }}
                    disabled={pending}
                    onClick={() => setConfirmDeleteId(f.id)}
                  >
                    삭제
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmSheet
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={remove}
        title="이 조각을 지울까요?"
        description="지운 조각은 되돌릴 수 없어요."
        confirmLabel="삭제"
        confirmVariant="danger"
        isLoading={pending}
      />
    </section>
  );
}
