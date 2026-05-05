"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createDiaryAction,
  updateDiaryAction,
  type DiaryActionResult,
} from "@/lib/diary/actions";
import type { DiaryLocation } from "@/lib/diary/schemas";
import { DiaryDatePicker } from "./date-picker";
import { MoodPicker, type MoodKey } from "./mood-picker";

type Mode = "create" | "edit";

interface DiaryFormProps {
  mode: Mode;
  diaryId?: string;
  initial?: {
    title: string;
    content: string;
    images: string[];
    location: DiaryLocation | null;
    mood: MoodKey | null;
    date?: string; // YYYY-MM-DD
  };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MUTED_LABEL: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-xs)",
  color: "var(--fg-subtle)",
  letterSpacing: "var(--tracking-wider)",
  fontWeight: 600,
  textTransform: "uppercase",
  margin: 0,
};

export function DiaryForm({ mode, diaryId, initial }: DiaryFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [mood, setMood] = useState<MoodKey | null>(initial?.mood ?? null);
  const [location, setLocation] = useState<DiaryLocation | null>(
    initial?.location ?? null,
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [date, setDate] = useState(initial?.date ?? todayStr());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepExisting, setKeepExisting] = useState(
    Boolean(initial?.images?.[0]),
  );

  const [titleError, setTitleError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const today = todayStr();

  // Auto-grow textarea on initial render and when content is set externally.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(240, ta.scrollHeight) + "px";
  }, []);

  useEffect(() => {
    if (!pickedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pickedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pickedFile]);

  const handlePickFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;
    setPickedFile(file);
    if (file) setKeepExisting(false);
  };

  const handleRemoveImage = () => {
    setPickedFile(null);
    setKeepExisting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAttachLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("이 기기는 위치 정보를 지원하지 않습니다");
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setLocationError("위치 권한이 거부되었습니다"),
      { timeout: 10000 },
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTitleError(null);
    setContentError(null);
    setSubmitError(null);

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setContentError("내용을 입력해주세요");
      return;
    }

    // Title is required by the schema; auto-derive from first line if empty.
    const effectiveTitle =
      trimmedTitle ||
      trimmedContent.split("\n")[0]?.slice(0, 60) ||
      "일기";

    const fd = new FormData();
    fd.set("title", effectiveTitle);
    fd.set("content", trimmedContent);
    fd.set("location", location ? JSON.stringify(location) : "null");
    fd.set("mood", mood ?? "");
    fd.set("date", date);

    if (pickedFile) {
      fd.set("image", pickedFile);
      fd.set("imageMode", "replace");
    } else if (mode === "edit") {
      fd.set("imageMode", keepExisting ? "__keep__" : "remove");
    }

    startTransition(async () => {
      const result: DiaryActionResult =
        mode === "create"
          ? await createDiaryAction(fd)
          : await updateDiaryAction(diaryId!, fd);

      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [k, msg] of Object.entries(result.fieldErrors)) {
            if (k === "title") setTitleError(msg ?? null);
            else if (k === "content") setContentError(msg ?? null);
            else if (k === "image") setSubmitError(msg ?? "이미지 처리 중 오류가 발생했습니다");
          }
        }
        if (result.error) setSubmitError(result.error);
        return;
      }

      router.push(`/diary/${result.data.id}`);
      router.refresh();
    });
  };

  const showExistingImage = mode === "edit" && keepExisting && !pickedFile;
  const existingImage = initial?.images?.[0];
  const canSubmit = content.trim().length > 0 && !pending;

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
          onClick={() => router.back()}
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
          {mode === "create" ? "새 일기" : "수정하기"}
        </span>
        <button
          form="diary-form"
          type="submit"
          disabled={!canSubmit}
          style={{
            background: "none",
            border: "none",
            cursor: canSubmit ? "pointer" : "default",
            color: canSubmit ? "var(--accent-rose)" : "var(--fg-subtle)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            padding: "4px 0",
          }}
        >
          {pending ? "저장 중..." : "저장"}
        </button>
      </header>

      <form
        id="diary-form"
        onSubmit={handleSubmit}
        noValidate
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "var(--space-5)",
          gap: "var(--space-5)",
        }}
      >
        <DiaryDatePicker value={date} max={today} onChange={setDate} />

        <MoodPicker value={mood} onChange={setMood} />

        <div style={{ height: 1, backgroundColor: "var(--border)" }} />

        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 (선택)"
            maxLength={200}
            aria-invalid={Boolean(titleError)}
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
          {titleError && (
            <p
              role="alert"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--danger)",
                marginTop: 4,
              }}
            >
              {titleError}
            </p>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.max(240, el.scrollHeight) + "px";
            }}
            placeholder="오늘 하루를 기록해요..."
            autoFocus={mode === "create"}
            aria-invalid={Boolean(contentError)}
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
          {contentError && (
            <p
              role="alert"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--danger)",
                marginTop: 4,
              }}
            >
              {contentError}
            </p>
          )}
        </div>

        <div style={{ height: 1, backgroundColor: "var(--border)" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p style={MUTED_LABEL}>이미지</p>
          {(showExistingImage && existingImage) || previewUrl ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 9",
                overflow: "hidden",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <Image
                src={previewUrl ?? existingImage!}
                alt={previewUrl ? "선택한 이미지 미리보기" : "현재 첨부된 이미지"}
                fill
                sizes="(max-width: 430px) 100vw, 430px"
                style={{ objectFit: "cover" }}
                unoptimized={Boolean(previewUrl)}
              />
            </div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <label
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-muted)",
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                cursor: "pointer",
              }}
            >
              {previewUrl || showExistingImage ? "다른 사진 선택" : "사진 추가"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePickFile}
                style={{ display: "none" }}
              />
            </label>
            {(showExistingImage || previewUrl) && (
              <button
                type="button"
                onClick={handleRemoveImage}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  color: "var(--danger)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 8px",
                }}
              >
                제거
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p style={MUTED_LABEL}>위치</p>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleAttachLocation}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-muted)",
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                cursor: "pointer",
              }}
            >
              {location ? "현재 위치로 갱신" : "현재 위치 사용"}
            </button>
            {location && (
              <>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)",
                    color: "var(--fg-subtle)",
                  }}
                >
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
                <button
                  type="button"
                  onClick={() => setLocation(null)}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    color: "var(--fg-subtle)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 8px",
                  }}
                >
                  제거
                </button>
              </>
            )}
          </div>
          {locationError && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--danger)",
                margin: 0,
              }}
            >
              {locationError}
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
              backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)",
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              margin: 0,
            }}
          >
            {submitError}
          </p>
        )}
      </form>
    </div>
  );
}
