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
import { AiBusyOverlay, Spinner } from "@/components/ui/ai-busy-overlay";
import { AiUsageCounter } from "@/components/ai/ai-usage-counter";

const PENDING_DRAFT_KEY = "memoism:pendingDraft";
// create 모드에서 작성 중 내용을 자동저장하는 키. 새로고침·세션만료로 인한 유실 방지.
const DRAFT_KEY_NEW = "memoism:draft:new";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24시간 후 만료

interface NewDraft {
  title: string;
  content: string;
  mood: MoodKey | null;
  date: string;
  savedAt: number;
}

/** draft 저장 시각 기준으로 "N분 전 / N시간 전" + 만료까지 남은 시간 문자열 반환 */
function draftAgeLabel(savedAt: number): string {
  const elapsedMs = Date.now() - savedAt;
  const remainMs = DRAFT_TTL_MS - elapsedMs;

  const elapsedMin = Math.floor(elapsedMs / 60_000);
  const savedLabel =
    elapsedMin < 1
      ? "방금 전"
      : elapsedMin < 60
        ? `${elapsedMin}분 전`
        : `${Math.floor(elapsedMin / 60)}시간 전`;

  const remainHours = Math.ceil(remainMs / (60 * 60_000));
  const expireLabel =
    remainHours <= 1 ? "1시간 이내 만료" : `${remainHours}시간 후 만료`;

  return `${savedLabel} 저장 · ${expireLabel}`;
}

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
  /** EXIF 추출 진행 중이면 true — 썸네일에 스피너를 띄운다. */
  extracting?: boolean;
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
  loading,
  onRemove,
}: {
  src: string;
  unoptimized?: boolean;
  badge: string | null;
  loading?: boolean;
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
      {loading && (
        <div
          aria-label="사진 정보 읽는 중"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              border: "2px solid rgba(255,255,255,0.4)",
              borderTopColor: "white",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
        </div>
      )}
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
  const [usageSignal, setUsageSignal] = useState(0);
  // 진행 중인 AI 생성 요청을 취소(Abort)하기 위한 핸들.
  const aiAbortRef = useRef<AbortController | null>(null);

  // create 모드: localStorage 자동저장 복원 배너 표시 여부 + 저장 시각
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number>(0);

  // edit 모드 AI 액션 state (재생성·되돌리기 후 부모로 lift된 값 갱신용)
  const [hasPrev, setHasPrev] = useState(
    initial?.hasPreviousContent ?? false,
  );
  const [aiVer, setAiVer] = useState(initial?.aiGenerationVersion ?? 0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
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

  // create 모드 — 마운트 시 localStorage draft 존재 확인 → 복원 배너 표시
  useEffect(() => {
    if (mode !== "create") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY_NEW);
      if (!raw) return;
      const draft: NewDraft = JSON.parse(raw);
      // 24시간 초과 → 만료 처리
      if (Date.now() - draft.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(DRAFT_KEY_NEW);
        return;
      }
      // 의미 있는 내용이 있고, 저장된 날짜가 현재 폼 날짜와 같을 때만 배너 표시.
      // 날짜가 다르면 다른 날 작성하던 임시저장이므로 표시하지 않는다.
      if ((draft.title?.trim() || draft.content?.trim()) && draft.date === date) {
        setShowDraftBanner(true);
        setDraftSavedAt(draft.savedAt);
      }
    } catch {
      // localStorage 파싱 실패 시 무시
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // create 모드 — title / content / mood / date 변경 시 debounce 500ms 자동저장
  useEffect(() => {
    if (mode !== "create") return;
    if (!title.trim() && !content.trim()) return; // 빈 폼은 저장하지 않음
    const timer = setTimeout(() => {
      try {
        const draft: NewDraft = { title, content, mood, date, savedAt: Date.now() };
        localStorage.setItem(DRAFT_KEY_NEW, JSON.stringify(draft));
      } catch {
        // QuotaExceededError 등 무시
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, mood, date, mode]);

  // localStorage draft 복원
  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY_NEW);
      if (!raw) return;
      const draft: NewDraft = JSON.parse(raw);
      if (draft.title) setTitle(draft.title);
      if (draft.content) setContent(draft.content);
      if (draft.mood) setMood(draft.mood);
      if (draft.date) setDate(draft.date);
    } catch {
      // 무시
    }
    setShowDraftBanner(false);
  };

  // localStorage draft 버리기
  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY_NEW);
    setShowDraftBanner(false);
  };

  const handlePickFiles: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    const accepted = files.slice(0, slotsLeft);
    if (accepted.length === 0) return;

    // 1) 썸네일을 즉시 화면에 띄운다(스피너 표시). previewUrl은 EXIF 없이 바로 생성 가능.
    const newPicks: PickedImage[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      exif: { takenAt: null, lat: null, lng: null },
      extracting: true,
    }));
    setPickedImages((prev) => [...prev, ...newPicks]);

    // 2) EXIF를 병렬 추출, 끝나는 사진부터 스피너를 끄고 메타데이터를 채운다.
    //    원본에서 추출(압축하면 메타데이터 손실) → 이후 저장/생성에서 재추출 불필요.
    await Promise.all(
      newPicks.map(async (pick) => {
        let exif: ExifMeta;
        try {
          exif = await extractExif(pick.file);
        } catch {
          exif = { takenAt: null, lat: null, lng: null };
        }
        setPickedImages((prev) =>
          prev.map((p) =>
            p.id === pick.id ? { ...p, exif, extracting: false } : p,
          ),
        );
      }),
    );

    // 3) 모든 추출 완료 후 촬영시각 순으로 한 번 정렬.
    setPickedImages((prev) =>
      [...prev].sort((a, b) => compareByTakenAt(a.exif, b.exif)),
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

    // 제목은 필수 — 본문을 제목으로 몰래 복제하지 않고, 명시적으로 입력을 안내한다.
    if (!trimmedTitle) {
      setTitleError("제목을 입력해주세요");
      titleRef.current?.focus();
      return;
    }
    if (!trimmedContent) {
      setContentError("내용을 입력해주세요");
      return;
    }

    startTransition(async () => {
      try {
        const { compressed, exifs } = await buildExifsAndCompress();

        const fd = new FormData();
        fd.set("title", trimmedTitle);
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

        // 저장 성공 → localStorage draft 삭제
        if (mode === "create") {
          try { localStorage.removeItem(DRAFT_KEY_NEW); } catch { /* 무시 */ }
        }
        router.push(`/diary/${result.data.id}`);
        router.refresh();
      } catch {
        // Server Action이 예외를 던지면(배포 스큐로 액션 ID 소멸·네트워크 단절 등)
        // 잡지 않으면 에러 바운더리가 폼을 통째로 언마운트해 작성 내용이 사라진다.
        // 여기서 잡아 폼·입력을 그대로 보존하고 재시도를 유도한다. ("작성한 일기 유실" 차단)
        setSubmitError(
          "저장 중 문제가 생겼어요. 작성한 내용은 그대로 있으니 잠시 후 다시 저장해주세요.",
        );
      }
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
    const ac = new AbortController();
    aiAbortRef.current = ac;
    try {
      const { compressed, exifs } = await buildExifsAndCompress();

      const fd = new FormData();
      for (const f of compressed) fd.append("photo", f);
      fd.set("exifs", JSON.stringify(exifs.map(exifToWire)));
      if (content.trim()) fd.set("text", content.trim());

      const res = await fetch("/api/diaries/auto-generate", {
        method: "POST",
        body: fd,
        signal: ac.signal,
      });
      const data = await res.json();

      if (!res.ok) {
        setAiError(data?.error ?? "AI 생성에 실패했어요");
        return;
      }

      // 일기 날짜 기본값: 사용자가 폼에서 날짜를 바꾸지 않았다면(=오늘) 사진의
      // 가장 이른 촬영일(KST)을 쓴다. 검토 화면에서 다시 변경할 수 있다.
      const draftDate =
        date === today && dateKeys.length > 0 ? [...dateKeys].sort()[0] : date;

      // sessionStorage에 draft + 입력 컨텍스트 저장 → /diary/review가 읽음
      sessionStorage.setItem(
        PENDING_DRAFT_KEY,
        JSON.stringify({
          draft: data.draft,
          storagePaths: data.storagePaths,
          exifs: data.exifs,
          mode: data.mode,
          // 사용자 원본 텍스트 — 검토 화면의 "다시 생성"이 B/C 모드 재생성에 사용.
          text: content.trim() || undefined,
          date: draftDate,
          createdAt: Date.now(),
        }),
      );
      // AI 생성 성공 후 review 이동 → draft는 유지(뒤로가기 시 복원용)
      router.push("/diary/review");
    } catch (e) {
      // 사용자가 취소한 경우는 에러로 표시하지 않는다.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setAiError(e instanceof Error ? e.message : "AI 생성 실패");
    } finally {
      setAiPending(false);
      setUsageSignal((n) => n + 1);
      aiAbortRef.current = null;
    }
  };

  // 진행 중 오버레이의 "취소" — 요청을 끊고 작성 화면으로 복귀.
  const handleCancelAi = () => {
    aiAbortRef.current?.abort();
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
        className="glass"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3) var(--space-5)",
          borderBottom: "1px solid var(--separator)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending || aiPending}
          className="pressable"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--tint)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 400,
            padding: "4px 0",
            minWidth: 44,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L2 8L8 14"/>
          </svg>
          취소
        </button>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--fg)",
            letterSpacing: "var(--tracking-normal)",
          }}
        >
          {mode === "create" ? "새 일기" : "수정하기"}
        </span>
        <button
          form="diary-form"
          type="submit"
          disabled={!canManualSave}
          className="pressable"
          style={{
            background: "none",
            border: "none",
            cursor: canManualSave ? "pointer" : "default",
            color: canManualSave ? "var(--tint)" : "var(--fg-subtle)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            padding: "4px 0",
            minWidth: 44,
            textAlign: "right",
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
        {/* 자동저장 draft 복원 배너 — create 모드에서만 표시 */}
        {showDraftBanner && (
          <div
            role="alert"
            style={{
              backgroundColor: "color-mix(in srgb, var(--tint) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--tint) 30%, transparent)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3) var(--space-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  color: "var(--fg)",
                  lineHeight: "var(--leading-snug)",
                }}
              >
                ✏️ 이전에 작성 중이던 내용이 있어요.
              </span>
              {draftSavedAt > 0 && (
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)",
                    color: "var(--fg-subtle)",
                    lineHeight: "var(--leading-snug)",
                  }}
                >
                  {draftAgeLabel(draftSavedAt)}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="pressable"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--tint)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                불러오기
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="pressable"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 400,
                  color: "var(--fg-subtle)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                버리기
              </button>
            </div>
          </div>
        )}

        <DiaryDatePicker value={date} max={today} onChange={setDate} />

        <MoodPicker value={mood} onChange={setMood} />

        {/* 글쓰기 표면 — 흰 카드로 분리해 "지금 기록하고 있다"는 물성 부여 */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-xs)",
            padding: "var(--space-4) var(--space-4) var(--space-5)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            flex: 1,
          }}
        >
        <div>
          <input
            type="text"
            ref={titleRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            onKeyDown={(e) => {
              // 제목에서 Enter → 본문으로 포커스 이동.
              if (e.key === "Enter") {
                e.preventDefault();
                textareaRef.current?.focus();
              }
            }}
            placeholder="제목"
            maxLength={200}
            aria-invalid={Boolean(titleError)}
            style={{
              width: "100%",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              lineHeight: "var(--leading-snug)",
              letterSpacing: "var(--tracking-tight)",
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

        <div style={{ height: 1, backgroundColor: "var(--separator)" }} />

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
              fontFamily: "var(--font-sans)",
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
        </div>

        {/* 사진 (상한은 구독별, maxImages prop) — 작성·수정 공용. 가로 스크롤(개행 X). */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: "var(--space-2)",
            }}
          >
            <p style={MUTED_LABEL}>사진 ({totalImageCount}/{maxImages})</p>
            {!isMultiDate && pickedImages.length > 1 && (
              <span
                style={{
                  ...MUTED_LABEL,
                  textTransform: "none",
                  letterSpacing: "normal",
                  fontWeight: 400,
                }}
              >
                촬영 시각이 있는 사진은 시간순으로 자동 정렬돼요.
              </span>
            )}
          </div>
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
                  loading={img.extracting}
                  onRemove={() => removePickedImage(img.id)}
                />
              ))}
            </div>
          )}
          {isMultiDate && (
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
          )}
          {slotsLeft > 0 && (
            <label
              className="pressable"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: "var(--tint)",
                padding: "7px 14px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                backgroundColor: "var(--tint-soft)",
                cursor: "pointer",
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                minHeight: 36,
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
              className="pressable"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                color: canAiGenerate ? "var(--on-tint)" : "var(--fg-subtle)",
                backgroundColor: canAiGenerate ? "var(--tint)" : "var(--fill-2)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "0 16px",
                height: 50,
                width: "100%",
                cursor: canAiGenerate ? "pointer" : "default",
                transition: "background-color var(--duration-fast) var(--ease-out)",
              }}
            >
              {aiPending ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Spinner size={16} />
                  AI가 정리 중...
                </span>
              ) : (
                "✨ AI로 정리하기"
              )}
            </button>
            <p style={{ ...MUTED_LABEL, textTransform: "none", letterSpacing: "normal" }}>
              사진만 있어도, 텍스트만 있어도, 둘 다 있어도 OK.
            </p>
            <AiUsageCounter refreshSignal={usageSignal} />
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

      {aiPending && (
        <AiBusyOverlay
          label={"사진과 메모를 읽고\n일기로 정리하고 있어요"}
          onCancel={handleCancelAi}
        />
      )}
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
