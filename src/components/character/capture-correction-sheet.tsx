"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DiaryDatePicker } from "@/components/diary/date-picker";
import { dateKeyLabel, kstTodayKey } from "@/lib/diary/kst";
import { recaptureDateAction } from "@/lib/diary/capture-actions";

type Entry = { dateKey: string; diaryId: string; imageIds: string[] };

const SHEET_BUTTON: React.CSSProperties = {
  width: "100%",
  minHeight: 50,
  padding: "var(--space-3) var(--space-4)",
  borderRadius: "var(--radius-md)",
  border: "none",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-md)",
  fontWeight: 600,
  cursor: "pointer",
};

/**
 * 저장 칩을 탭했을 때 여는 교정 시트 — "일기 보러가기"와 "날짜 바꾸기".
 *
 * 여러 날에 나눠 기록된 캡처엔 **날짜 바꾸기를 노출하지 않는다.** 사진이 각자
 * 제 EXIF 날짜로 정확히 갔는데 한 날로 몰면 되레 데이터가 틀어지기 때문이다.
 * (서버도 같은 이유로 거절한다.)
 */
export function CaptureCorrectionSheet({
  isOpen,
  onClose,
  onMoved,
  chatMessageId,
  entries,
  dateKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  /**
   * 이동 성공 시 호출. 대화 목록은 클라이언트 state라 `router.refresh()`만으로는
   * 칩이 안 바뀐다 — 부모가 직접 갱신해야 "안 바뀐 것처럼" 보이지 않는다.
   */
  onMoved: (next: { dateKey: string; diaryId: string }) => void;
  chatMessageId: string;
  entries: Entry[];
  dateKey: string;
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const multiDay = entries.length > 1;

  const close = () => {
    setPicking(false);
    setError(null);
    onClose();
  };

  const move = (picked: string) => {
    startTransition(async () => {
      const r = await recaptureDateAction(chatMessageId, picked);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setPicking(false);
      onMoved({ dateKey: picked, diaryId: r.diaryId });
      onClose();
      router.refresh();
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={close} closeOnOverlay={!pending}>
      <div style={{ padding: "var(--space-4) var(--space-5) 0" }}>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--fg)",
            textAlign: "center",
            margin: "var(--space-2) 0 var(--space-1)",
            lineHeight: "var(--leading-snug)",
          }}
        >
          {multiDay
            ? `${entries.length}일에 나눠 기록됐어요`
            : `${dateKeyLabel(dateKey)} 일기에 기록됐어요`}
        </p>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
            textAlign: "center",
            margin: "0 0 var(--space-5)",
            lineHeight: "var(--leading-normal)",
          }}
        >
          {multiDay
            ? "사진마다 찍은 날짜가 달라요. 날짜를 바꾸려면 각 일기에서 옮겨주세요."
            : "날짜가 틀렸다면 바꿀 수 있어요."}
        </p>

        {error && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--danger)",
              textAlign: "center",
              margin: "0 0 var(--space-4)",
              lineHeight: "var(--leading-normal)",
            }}
          >
            {error}
          </p>
        )}

        {picking ? (
          <div style={{ paddingBottom: "var(--space-4)" }}>
            <DiaryDatePicker
              value={dateKey}
              max={kstTodayKey()}
              onChange={move}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            {entries.map((e) => (
              <button
                key={e.diaryId}
                type="button"
                className="pressable"
                onClick={() => router.push(`/diary/${e.diaryId}`)}
                style={{
                  ...SHEET_BUTTON,
                  backgroundColor: "var(--tint)",
                  color: "var(--on-tint)",
                }}
              >
                {multiDay
                  ? `${dateKeyLabel(e.dateKey)} 일기 보러가기`
                  : "일기 보러가기"}
              </button>
            ))}

            {!multiDay && (
              <button
                type="button"
                className="pressable"
                onClick={() => setPicking(true)}
                disabled={pending}
                style={{
                  ...SHEET_BUTTON,
                  backgroundColor: "var(--fill-2)",
                  color: "var(--fg)",
                  cursor: pending ? "default" : "pointer",
                  opacity: pending ? 0.7 : 1,
                }}
              >
                날짜 바꾸기
              </button>
            )}

            <button
              type="button"
              className="pressable"
              onClick={close}
              disabled={pending}
              style={{
                ...SHEET_BUTTON,
                backgroundColor: "transparent",
                color: "var(--fg-muted)",
                cursor: pending ? "default" : "pointer",
              }}
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
