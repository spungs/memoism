"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDiaryAction } from "@/lib/diary/actions";
import { getDiaryImageSignedUrls } from "@/lib/storage/actions";

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
  /** 사용자 원본 텍스트 — "다시 생성"이 B/C 모드 재생성에 사용. */
  text?: string;
  date: string;
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

// 썸네일 배지용: "26/05/17\n오후 04:18" (날짜 yy/mm/dd 줄바꿈 + 오전·오후 시각).
// diary-form.tsx 배지와 동일 포맷. whiteSpace: "pre-line"이 \n을 개행으로 렌더.
function formatTakenBadge(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const time = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  return `${yy}/${mm}/${dd}\n${time}`;
}

// KST(UTC+9) 기준 YYYY-MM-DD. exif.ts를 import하지 않고 클라이언트에서 직접 계산
// (서버/클라이언트 경계 회피 — 다른 에이전트가 exif.ts 소유).
function toKstDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "YYYY-MM-DD" → "M/D" (range 표시용)
function shortKstLabel(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
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
  const [signedUrls, setSignedUrls] = useState<(string | null)[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // storagePaths가 있으면 signed URL 일괄 발급 (1h TTL).
  useEffect(() => {
    if (!draftState || draftState.storagePaths.length === 0) return;
    let cancelled = false;
    getDiaryImageSignedUrls(draftState.storagePaths).then((result) => {
      if (cancelled) return;
      if (result.ok) setSignedUrls(result.urls);
    });
    return () => {
      cancelled = true;
    };
  }, [draftState]);

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

  // 저장·취소 같은 "의도적 이탈" 중엔 미저장 경고를 띄우지 않기 위한 플래그.
  const leavingRef = useRef(false);

  // 페이지 떠날 때 확인 (탭 닫기·새로고침 등 비의도 이탈만)
  useEffect(() => {
    if (!draftState) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (leavingRef.current) return;
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
      fd.set("mood", draftState.draft.suggestedMood ?? "");
      fd.set("date", draftState.date);

      const result = await createDiaryAction(fd);
      if (!result.ok) {
        setSubmitError(result.error ?? "저장에 실패했어요");
        return;
      }

      leavingRef.current = true;
      sessionStorage.removeItem(PENDING_DRAFT_KEY);
      router.push(`/diary/${result.data.id}`);
      router.refresh();
    });
  };

  // 저장하지 않고 AI 본문만 새로 생성 (일기 row 미생성).
  // 이미 업로드된 사진은 storagePath로 서버가 재다운로드한다.
  const handleRegenerate = async () => {
    if (!draftState || regenerating || pending) return;
    setRegenError(null);
    setRegenerating(true);
    try {
      const res = await fetch("/api/diaries/preview-regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePaths: draftState.storagePaths,
          exifs: draftState.exifs,
          text: draftState.text,
          mode: draftState.mode,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        if (data?.capExhausted) {
          setRegenError("오늘 AI 생성 한도를 모두 사용했어요.");
        } else {
          setRegenError(data?.error ?? "다시 생성에 실패했어요");
        }
        return;
      }

      setEditedTitle(data.data.title);
      setEditedContent(data.data.content);
      setDraftState((prev) =>
        prev
          ? {
              ...prev,
              draft: {
                ...prev.draft,
                title: data.data.title,
                content: data.data.content,
                suggestedMood: data.data.suggestedMood,
              },
            }
          : prev,
      );
    } catch (e) {
      setRegenError(e instanceof Error ? e.message : "다시 생성 실패");
    } finally {
      setRegenerating(false);
    }
  };

  // 저장 전 단계라 서버 호출 없이 로컬 상태만 정리.
  // storagePaths / exifs / signedUrls를 같은 index에서 동시에 제거해 정렬 유지.
  // 업로드된 파일은 기존 정책대로 V2 GC가 정리.
  const handleRemovePhoto = (index: number) => {
    setDraftState((prev) =>
      prev
        ? {
            ...prev,
            storagePaths: prev.storagePaths.filter((_, i) => i !== index),
            exifs: prev.exifs.filter((_, i) => i !== index),
          }
        : prev,
    );
    setSignedUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    if (
      !window.confirm(
        "작성 중인 내용을 버릴까요? 업로드한 사진도 함께 정리됩니다.",
      )
    ) {
      return;
    }
    leavingRef.current = true;
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

  // 촬영 날짜(KST) distinct — 2일 이상이면 "섞임" 경고 표시
  const distinctKstDates = Array.from(
    new Set(
      draftState.exifs
        .map((e) => toKstDate(e.takenAt))
        .filter((d): d is string => d != null),
    ),
  ).sort();
  const multiDay = distinctKstDates.length >= 2;
  const dateRangeLabel = multiDay
    ? `${shortKstLabel(distinctKstDates[0])} ~ ${shortKstLabel(
        distinctKstDates[distinctKstDates.length - 1],
      )} (${distinctKstDates.length}일)`
    : null;

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
          disabled={pending || regenerating || !editedContent.trim()}
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
            {multiDay && dateRangeLabel && (
              <li>촬영 날짜 · {dateRangeLabel}</li>
            )}
            {exifTimeLabel && (
              <li>{multiDay ? "가장 이른 시각" : "촬영 시각"} · {exifTimeLabel}</li>
            )}
            {exifHasLocation && <li>위치 정보 있음</li>}
            <li style={{ color: "var(--fg-subtle)" }}>
              날짜 · {draftState.date}
            </li>
            {multiDay && (
              <li style={{ color: "var(--danger)" }}>
                ⚠️ 서로 다른 날 사진이 섞여 있어요. 한 날 사진만 두는 걸 권해요.
              </li>
            )}
          </ul>
          {signedUrls.length > 0 && (
            <div
              style={{
                marginTop: "var(--space-3)",
                display: "grid",
                gridTemplateColumns:
                  signedUrls.length === 1
                    ? "1fr"
                    : "repeat(auto-fill, minmax(80px, 1fr))",
                gap: "var(--space-2)",
              }}
            >
              {signedUrls.map((url, i) =>
                url ? (
                  <div
                    key={draftState.storagePaths[i] ?? i}
                    style={{
                      position: "relative",
                      aspectRatio: signedUrls.length === 1 ? "16 / 9" : "1 / 1",
                      overflow: "hidden",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg)",
                    }}
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="(max-width: 720px) 50vw, 200px"
                      style={{ objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      disabled={pending}
                      aria-label="사진 제거"
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "var(--radius-pill)",
                        border: "none",
                        backgroundColor: "rgba(0, 0, 0, 0.55)",
                        color: "#fff",
                        fontSize: 16,
                        lineHeight: 1,
                        cursor: pending ? "default" : "pointer",
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                    {(() => {
                      const b = formatTakenBadge(draftState.exifs[i]?.takenAt);
                      return b ? (
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
                          {b}
                        </span>
                      ) : null;
                    })()}
                  </div>
                ) : null,
              )}
            </div>
          )}
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

          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating || pending}
            style={{
              alignSelf: "flex-start",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: regenerating ? "var(--fg-subtle)" : "var(--fg-muted)",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "8px 14px",
              cursor: regenerating || pending ? "default" : "pointer",
            }}
          >
            {regenerating ? "생성 중..." : "✨ 다시 생성"}
          </button>

          {regenError && (
            <p
              role="alert"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--danger)",
                margin: 0,
              }}
            >
              {regenError}
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
