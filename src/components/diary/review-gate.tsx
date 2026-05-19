"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDiaryAction } from "@/lib/diary/actions";
import type { DiaryLocation } from "@/lib/diary/schemas";

const PENDING_DRAFT_KEY = "memoism:pendingDraft";
const DRAFT_TTL_MS = 5 * 60 * 1000; // 5분 만료 — 사용자가 너무 오래 자리비울 때 보호

type PendingDraft = {
  draft: {
    title: string;
    content: string;
    suggestedMood: string | null;
  };
  storagePaths: string[];
  exifs: Array<{
    takenAt: string | null;
    lat: number | null;
    lng: number | null;
  }>;
  mode: "A" | "B" | "C";
  date: string;
  location: DiaryLocation | null;
  createdAt: number;
};

function formatExifTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function modeLabel(mode: "A" | "B" | "C"): string {
  switch (mode) {
    case "A":
      return "사진으로 생성";
    case "B":
      return "텍스트 정리";
    case "C":
      return "사진+텍스트 통합";
  }
}

export function ReviewGate() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draftState, setDraftState] = useState<PendingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // sessionStorage 로드 + TTL 검증
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_DRAFT_KEY);
      if (!raw) {
        router.replace("/diary/new");
        return;
      }
      const parsed = JSON.parse(raw) as PendingDraft;
      if (Date.now() - parsed.createdAt > DRAFT_TTL_MS) {
        sessionStorage.removeItem(PENDING_DRAFT_KEY);
        router.replace("/diary/new");
        return;
      }
      setDraftState(parsed);
      setEditedTitle(parsed.draft.title);
      setEditedContent(parsed.draft.content);
    } catch {
      sessionStorage.removeItem(PENDING_DRAFT_KEY);
      router.replace("/diary/new");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // 본문 textarea auto-grow
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(240, ta.scrollHeight) + "px";
  }, [editedContent]);

  // 페이지 떠날 때 확인
  useEffect(() => {
    if (!draftState) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [draftState]);

  const handleApprove = () => {
    if (!draftState) return;
    setSubmitError(null);

    const trimmedTitle = editedTitle.trim() || "일기";
    const trimmedContent = editedContent.trim();
    if (!trimmedContent) {
      setSubmitError("내용이 비어있어요. 수정하거나 취소해주세요.");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", trimmedTitle);
      fd.set("content", trimmedContent);
      fd.set("source", `auto_${draftState.mode.toLowerCase()}`);
      fd.set("storagePaths", JSON.stringify(draftState.storagePaths));
      fd.set("exifs", JSON.stringify(draftState.exifs));
      fd.set(
        "location",
        draftState.location ? JSON.stringify(draftState.location) : "null",
      );
      fd.set("mood", draftState.draft.suggestedMood ?? "");
      fd.set("date", draftState.date);

      const result = await createDiaryAction(fd);
      if (!result.ok) {
        setSubmitError(result.error ?? "저장에 실패했어요");
        return;
      }

      sessionStorage.removeItem(PENDING_DRAFT_KEY);
      router.push(`/diary/${result.data.id}`);
      router.refresh();
    });
  };

  const handleCancel = () => {
    if (
      !window.confirm(
        "작성 중인 내용을 버릴까요? 업로드한 사진도 함께 정리됩니다.",
      )
    ) {
      return;
    }
    sessionStorage.removeItem(PENDING_DRAFT_KEY);
    // V2: storagePaths를 garbage collector cron이 정리. 베타엔 그대로 두고 사용자가 다시 시도하면 신규 업로드.
    router.push("/diary/new");
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100svh - 56px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-sans)",
          color: "var(--fg-subtle)",
        }}
      >
        읽는 중...
      </div>
    );
  }
  if (!draftState) return null; // redirect 처리됨

  // EXIF 요약 (헤더에 표시)
  const earliestExif = draftState.exifs.find((e) => e.takenAt);
  const exifTimeLabel = earliestExif ? formatExifTime(earliestExif.takenAt) : null;
  const exifHasLocation = draftState.exifs.some((e) => e.lat != null && e.lng != null);
  const photoCount = draftState.storagePaths.length;

  return (
    <div
      style={{
        minHeight: "calc(100svh - 56px - env(safe-area-inset-bottom))",
        backgroundColor: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3) var(--space-5)",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--surface-raised)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--fg-muted)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            padding: "4px 0",
          }}
        >
          ← 취소
        </button>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--fg-subtle)",
            letterSpacing: "var(--tracking-wider)",
            textTransform: "uppercase",
          }}
        >
          ✨ AI 검토 · {modeLabel(draftState.mode)}
        </span>
        <button
          type="button"
          onClick={handleApprove}
          disabled={pending || !editedContent.trim()}
          style={{
            background: "none",
            border: "none",
            cursor: pending ? "default" : "pointer",
            color: editedContent.trim()
              ? "var(--accent-rose)"
              : "var(--fg-subtle)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            padding: "4px 0",
          }}
        >
          {pending ? "저장 중..." : "저장"}
        </button>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "var(--space-5)",
          gap: "var(--space-5)",
        }}
      >
        {/* Fact 영역 — EXIF·사진 메타 */}
        <section
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3) var(--space-4)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-subtle)",
              letterSpacing: "var(--tracking-wider)",
              fontWeight: 600,
              textTransform: "uppercase",
              margin: 0,
              marginBottom: "var(--space-2)",
            }}
          >
            사실 정보 (사진에서)
          </p>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fg)",
            }}
          >
            <li>
              사진 {photoCount}장
              {photoCount === 0 && " (텍스트만)"}
            </li>
            {exifTimeLabel && <li>촬영 시각 · {exifTimeLabel}</li>}
            {exifHasLocation && <li>위치 정보 있음</li>}
            <li style={{ color: "var(--fg-subtle)" }}>
              날짜 · {draftState.date}
            </li>
          </ul>
        </section>

        {/* Story 영역 — AI 생성 본문 (수정 가능) */}
        <div
          style={{
            position: "relative",
            backgroundColor: "color-mix(in srgb, #FFF4CC 30%, transparent)",
            border: "1px solid color-mix(in srgb, #FFF4CC 60%, transparent)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-subtle)",
              letterSpacing: "var(--tracking-wider)",
              fontWeight: 600,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            ✨ AI가 정리한 일기 (수정해도 OK)
          </p>
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            placeholder="제목"
            maxLength={200}
            style={{
              width: "100%",
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-xl)",
              fontWeight: 600,
              lineHeight: 1.3,
              color: "var(--fg)",
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              padding: 0,
            }}
          />
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="본문"
            style={{
              width: "100%",
              minHeight: 240,
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-md)",
              lineHeight: "var(--leading-relaxed)",
              color: "var(--fg)",
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              padding: 0,
            }}
          />
          {draftState.draft.suggestedMood && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-subtle)",
                margin: 0,
              }}
            >
              추천 기분 · {draftState.draft.suggestedMood}
            </p>
          )}
        </div>

        {submitError && (
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
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}
