"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createDiaryAction,
  updateDiaryAction,
  type DiaryActionResult,
} from "@/lib/diary/actions";
import {
  extractExif,
  uniqueKstDateKeys,
  type ExifMeta,
} from "@/lib/diary/exif";
import { compressImage } from "@/lib/diary/image-compress";
import { DiaryAiActions } from "./diary-ai-actions";
import { DiaryDatePicker } from "./date-picker";
import { MoodPicker, type MoodKey } from "./mood-picker";

const PENDING_DRAFT_KEY = "memoism:pendingDraft";

type Mode = "create" | "edit";

interface DiaryFormProps {
  mode: Mode;
  diaryId?: string;
  initial?: {
    title: string;
    content: string;
    /** edit 모드용: 기존 사진들 (id + signed URL + 촬영시각). 개별 제거 가능. */
    existingImages?: { id: string; url: string; exifTakenAt: Date | null }[];
    /** edit 모드용: AI 재생성 직후 백업 존재 여부 — "되돌리기" 노출 분기. */
    hasPreviousContent?: boolean;
    /** edit 모드용: 누적 AI 재생성 횟수 (라벨 분기용). */
    aiGenerationVersion?: number;
    mood: MoodKey | null;
    date?: string; // YYYY-MM-DD
  };
  /** 사진 첨부 상한 — 구독 상태에 따라 서버에서 계산해 전달 (ACTIVE 10, 그 외 5). */
  maxImages?: number;
}

type PickedImage = {
  id: string;
  file: File;
  previewUrl: string;
  exif: ExifMeta;
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// EXIF 촬영시각 오름차순. 시각이 있는 사진이 먼저, 없는 사진은 stable sort로
// 원래(추가) 순서를 유지하며 뒤로 간다.
function compareByTakenAt(a: ExifMeta, b: ExifMeta): number {
  const ta = a.takenAt?.getTime() ?? null;
  const tb = b.takenAt?.getTime() ?? null;
  if (ta != null && tb != null) return ta - tb;
  if (ta != null) return -1;
  if (tb != null) return 1;
  return 0;
}

function formatTakenTime(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

// "26/05/23\n오후 01:08" — 썸네일 배지: 날짜(yy/mm/dd) 줄바꿈 + 오전/오후 시각.
// 배지 span의 whiteSpace: "pre-line"이 \n을 실제 개행으로 렌더한다.
function formatTakenDateTime(d: Date | null): string | null {
  if (!d) return null;
  const time = formatTakenTime(d);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}/${mm}/${dd}\n${time}`;
}

// "2026-05-23" → "5/23" — 경고 배너에 날짜를 짧게 나열.
function shortDateLabel(key: string): string {
  const [, m, day] = key.split("-");
  return `${Number(m)}/${Number(day)}`;
}

function exifToWire(e: ExifMeta) {
  return {
    takenAt: e.takenAt ? e.takenAt.toISOString() : null,
    lat: e.lat,
    lng: e.lng,
  };
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

// 사진 썸네일 — 작성·수정 공용. 이미지 + 제거 버튼 + (있으면) 촬영시각 배지.
function PhotoThumb({
  src,
  unoptimized,
  badge,
  onRemove,
}: {
  src: string;
  unoptimized?: boolean;
  badge: string | null;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        width: 96,
        aspectRatio: "1 / 1",
        overflow: "hidden",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="96px"
        style={{ objectFit: "cover" }}
        unoptimized={unoptimized}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="제거"
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 22,
          height: 22,
          borderRadius: "50%",
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "white",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ×
      </button>
      {badge && (
        <span
          style={{
            position: "absolute",
            bottom: 4,
            left: 4,
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            lineHeight: 1.4,
            color: "white",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: "1px 5px",
            borderRadius: "var(--radius-sm)",
            whiteSpace: "pre-line",
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

export function DiaryForm({
  mode,
  diaryId,
  initial,
  maxImages = 5,
}: DiaryFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [mood, setMood] = useState<MoodKey | null>(initial?.mood ?? null);
  const [date, setDate] = useState(initial?.date ?? todayStr());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickedImages, setPickedImages] = useState<PickedImage[]>([]);

  // edit 모드: 사용자가 제거한 기존 사진 id 목록 (저장 시 서버로 전달).
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  // edit 모드: 아직 제거되지 않은 기존 사진들.
  const visibleExisting = (initial?.existingImages ?? []).filter(
    (img) => !removedImageIds.includes(img.id),
  );

  // 기존 사진 + 새로 고른 사진을 합쳐 날짜/장수를 계산.
  // (create 모드는 기존 사진이 없어 picked만 반영 → 동작 동일)
  const existingExif: ExifMeta[] = visibleExisting.map((img) => ({
    takenAt: img.exifTakenAt,
    lat: null,
    lng: null,
  }));
  const dateKeys = uniqueKstDateKeys([
    ...existingExif,
    ...pickedImages.map((p) => p.exif),
  ]);
  // 사진이 2일 이상에 걸치면 → 배지에 날짜 표기 + 경고 배너 + 생성 전 확인.
  const isMultiDate = dateKeys.length >= 2;
  const totalImageCount = visibleExisting.length + pickedImages.length;
  const slotsLeft = maxImages - totalImageCount;

  const [titleError, setTitleError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // edit 모드 AI 액션 state (재생성·되돌리기 후 부모로 lift된 값 갱신용)
  const [hasPrev, setHasPrev] = useState(
    initial?.hasPreviousContent ?? false,
  );
  const [aiVer, setAiVer] = useState(initial?.aiGenerationVersion ?? 0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const today = todayStr();

  // content 변경 시 textarea 높이 자동 조정 (재생성·되돌리기 후도 포함)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(120, ta.scrollHeight) + "px";
  }, [content]);

  // 미리보기 URL revoke on unmount
  useEffect(() => {
    return () => {
      for (const img of pickedImages) URL.revokeObjectURL(img.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickFiles: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    const accepted = files.slice(0, slotsLeft);

    // 첨부 즉시 EXIF를 추출해 화면 미리보기를 촬영시각 순으로 정렬한다.
    // 원본에서 추출(압축하면 메타데이터 손실) → 이후 저장/생성에서 재추출 불필요.
    const newPicks: PickedImage[] = await Promise.all(
      accepted.map(async (f) => {
        let exif: ExifMeta;
        try {
          exif = await extractExif(f);
        } catch {
          exif = { takenAt: null, lat: null, lng: null };
        }
        return {
          id: crypto.randomUUID(),
          file: f,
          previewUrl: URL.createObjectURL(f),
          exif,
        };
      }),
    );

    setPickedImages((prev) =>
      [...prev, ...newPicks].sort((a, b) => compareByTakenAt(a.exif, b.exif)),
    );
  };

  const removePickedImage = (id: string) => {
    setPickedImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const buildExifsAndCompress = async () => {
    // pickedImages는 handlePickFiles에서 이미 EXIF 추출 + 촬영시각 순으로 정렬됨.
    // 여기선 그 순서를 신뢰하고 압축만 한다 (exifs와 compressed 인덱스 1:1).
    const compressed: File[] = [];
    const exifs: ExifMeta[] = [];
    for (const img of pickedImages) {
      exifs.push(img.exif);
      try {
        compressed.push(await compressImage(img.file));
      } catch {
        compressed.push(img.file);
      }
    }
    return { compressed, exifs };
  };

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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

    const effectiveTitle =
      trimmedTitle || trimmedContent.split("\n")[0]?.slice(0, 60) || "일기";

    startTransition(async () => {
      const { compressed, exifs } = await buildExifsAndCompress();

      const fd = new FormData();
      fd.set("title", effectiveTitle);
      fd.set("content", trimmedContent);
      fd.set("source", "manual");
      fd.set("mood", mood ?? "");
      fd.set("date", date);
      for (const f of compressed) fd.append("image", f);
      fd.set("exifs", JSON.stringify(exifs.map(exifToWire)));

      if (mode === "edit") {
        fd.set("removeImageIds", JSON.stringify(removedImageIds));
      }

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

  const handleAiGenerate = async () => {
    if (aiPending || pending) return;

    // 이틀 이상 사진이 섞여 있으면 하나의 일기로 묶기 전 명시적 확인.
    if (isMultiDate) {
      const dates = dateKeys.map(shortDateLabel).join("·");
      const proceed = window.confirm(
        `이틀(${dates}) 사진이 섞여 있어요. 이대로 하나의 일기로 정리할까요?`,
      );
      if (!proceed) return;
    }

    setAiPending(true);
    setAiError(null);
    try {
      const { compressed, exifs } = await buildExifsAndCompress();

      const fd = new FormData();
      for (const f of compressed) fd.append("photo", f);
      fd.set("exifs", JSON.stringify(exifs.map(exifToWire)));
      if (content.trim()) fd.set("text", content.trim());

      const res = await fetch("/api/diaries/auto-generate", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setAiError(data?.error ?? "AI 생성에 실패했어요");
        return;
      }

      // sessionStorage에 draft + 입력 컨텍스트 저장 → /diary/review가 읽음
      sessionStorage.setItem(
        PENDING_DRAFT_KEY,
        JSON.stringify({
          draft: data.draft,
          storagePaths: data.storagePaths,
          exifs: data.exifs,
          mode: data.mode,
          date,
          createdAt: Date.now(),
        }),
      );
      router.push("/diary/review");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI 생성 실패");
    } finally {
      setAiPending(false);
    }
  };

  const canManualSave = content.trim().length > 0 && !pending && !aiPending;
  const canAiGenerate =
    mode === "create" &&
    !pending &&
    !aiPending &&
    (pickedImages.length > 0 || content.trim().length > 0);

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
          disabled={pending || aiPending}
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
          disabled={!canManualSave}
          style={{
            background: "none",
            border: "none",
            cursor: canManualSave ? "pointer" : "default",
            color: canManualSave ? "var(--accent-rose)" : "var(--fg-subtle)",
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
        onSubmit={handleManualSubmit}
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
            <p role="alert" style={errorStyle}>
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
              el.style.height = Math.max(120, el.scrollHeight) + "px";
            }}
            placeholder={
              mode === "create"
                ? "오늘 하루를 기록해요. (사진만 첨부해서 AI로 정리할 수도 있어요)"
                : "오늘 하루를 기록해요..."
            }
            autoFocus={mode === "create"}
            aria-invalid={Boolean(contentError)}
            style={{
              width: "100%",
              minHeight: 120,
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
            <p role="alert" style={errorStyle}>
              {contentError}
            </p>
          )}
        </div>

        <div style={{ height: 1, backgroundColor: "var(--border)" }} />

        {/* 사진 (상한은 구독별, maxImages prop) — 작성·수정 공용. 가로 스크롤(개행 X). */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p style={MUTED_LABEL}>사진 ({totalImageCount}/{maxImages})</p>
          {totalImageCount > 0 && (
            <div
              className="hide-scrollbar"
              style={{
                display: "flex",
                gap: "var(--space-2)",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {visibleExisting.map((img) => (
                <PhotoThumb
                  key={img.id}
                  src={img.url}
                  badge={formatTakenDateTime(img.exifTakenAt)}
                  onRemove={() =>
                    setRemovedImageIds((prev) => [...prev, img.id])
                  }
                />
              ))}
              {pickedImages.map((img) => (
                <PhotoThumb
                  key={img.id}
                  src={img.previewUrl}
                  unoptimized
                  badge={formatTakenDateTime(img.exif.takenAt)}
                  onRemove={() => removePickedImage(img.id)}
                />
              ))}
            </div>
          )}
          {isMultiDate ? (
            <p
              role="alert"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                lineHeight: "var(--leading-relaxed)",
                color: "var(--danger)",
                backgroundColor:
                  "color-mix(in srgb, var(--danger) 10%, transparent)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                margin: 0,
              }}
            >
              📷 {dateKeys.map(shortDateLabel).join("·")}{" "}
              {dateKeys.length}일 사진이 섞여 있어요. 일기는 하루 단위라 한
              날 사진만 두길 권해요.
            </p>
          ) : (
            pickedImages.length > 1 && (
              <p
                style={{
                  ...MUTED_LABEL,
                  textTransform: "none",
                  letterSpacing: "normal",
                  color: "var(--fg-subtle)",
                }}
              >
                촬영 시각이 있는 사진은 시간순으로 자동 정렬돼요.
              </p>
            )
          )}
          {slotsLeft > 0 && (
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
                alignSelf: "flex-start",
              }}
            >
              + 사진 추가
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                onChange={handlePickFiles}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>

        {/* AI 정리 — 베타 척추 (create 모드만) */}
        {mode === "create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={!canAiGenerate}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-md)",
                fontWeight: 600,
                color: canAiGenerate ? "var(--bg)" : "var(--fg-subtle)",
                backgroundColor: canAiGenerate ? "var(--fg)" : "var(--surface)",
                border: "1px solid " + (canAiGenerate ? "var(--fg)" : "var(--border)"),
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                cursor: canAiGenerate ? "pointer" : "default",
                transition: "background-color 120ms",
              }}
            >
              {aiPending ? "AI가 정리 중..." : "✨ AI로 정리하기"}
            </button>
            <p style={{ ...MUTED_LABEL, textTransform: "none", letterSpacing: "normal" }}>
              사진만 있어도, 텍스트만 있어도, 둘 다 있어도 OK.
            </p>
            {aiError && (
              <p role="alert" style={errorStyle}>
                {aiError}
              </p>
            )}
          </div>
        )}

        {submitError && (
          <p
            role="alert"
            style={{
              ...errorStyle,
              backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)",
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {submitError}
          </p>
        )}

        {/* edit 모드: AI로 다시 정리 + 되돌리기 — 기존 DB content 기반.
            state lifting으로 reload 없이 form 동기화. */}
        {mode === "edit" && diaryId && (
          <DiaryAiActions
            diaryId={diaryId}
            hasPreviousContent={hasPrev}
            aiGenerationVersion={aiVer}
            onUpdated={(data) => {
              setTitle(data.title);
              setContent(data.content);
              setHasPrev(data.hasPreviousContent);
              setAiVer(data.aiGenerationVersion);
            }}
          />
        )}
      </form>
    </div>
  );
}

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  color: "var(--danger)",
  margin: 0,
  marginTop: 4,
};
