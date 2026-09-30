"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ImagePlus } from "lucide-react";
import {
  applyDateOverrides,
  chunkBySize,
  groupPhotosByExifDate,
  selectGroupsWithinCap,
  type BackfillLimits,
  type CapSelection,
  type PhotoGroup,
} from "@/lib/diary/backfill-group";
import { extractExif, exifToWire } from "@/lib/diary/exif";
import { compressImages, makeThumbnails } from "@/lib/diary/image-compress";
import { formatFragmentAt } from "@/lib/diary/fragment-fold";
import { dateKeyLabel } from "@/lib/diary/kst";
import { deviceTimeZone, todayKeyInZone } from "@/lib/tz";
import { useDeviceTimeZone, useDeviceTodayKey } from "@/lib/tz-client";
import { MAX_AI_INPUT_CONTENT_LENGTH } from "@/lib/diary/schemas";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DiaryDatePicker } from "./date-picker";
import { readJson, responseErrorMessage } from "@/lib/http/client";

type Wire = { takenAt: string | null; lat: number | null; lng: number | null };
/** `diaryId`가 있으면 결과 행을 누를 때 그날 일기 상세로 간다. */
type DayResult = {
  dateKey: string;
  ok: boolean;
  note: string;
  diaryId: string | null;
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-3)",
  padding: "var(--space-3)",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--fill-2)",
} as const;


/**
 * 실패 응답에서 사용자에게 보여줄 문장을 뽑는다.
 *
 * `res.json()` 을 먼저 부르면 안 된다 — 플랫폼이 끊은 요청(413·502·504)은 본문이
 * HTML 이라 파싱이 터지고, 그러면 진짜 원인이 "연결이 끊겼어요"로 뭉개진다.
 * (2026-09-22 운영에서 실제로 413 이 이렇게 가려졌다.)
 */
async function readError(res: Response): Promise<string> {
  // 공용 규칙(lib/http/client.ts)으로 옮겼다 — 다른 화면도 같은 방식으로 읽는다(점검 M8).
  return responseErrorMessage(res, await readJson(res), `사진을 저장하지 못했어요 (오류 ${res.status})`);
}


/**
 * 한도에 걸려 미뤄진 사진을 알리는 한 줄. 전부 담겼으면 `null`.
 *
 * 조용히 버리지 않는 게 요점이다 — 기록앱에서 사용자가 모르는 사이 사진이 사라지는
 * 건 되돌릴 방법이 없다. 대신 경고 박스로 키우지 않고 사실만 담백하게 적는다.
 */
function capNotice(sel: CapSelection, limits: BackfillLimits): string | null {
  if (sel.droppedPhotos === 0) return null;
  if (sel.truncatedDate) {
    return `${dateKeyLabel(sel.truncatedDate)} 사진이 많아 ${limits.maxPhotos}장까지만 담았어요. 나머지 ${sel.droppedPhotos}장은 다음에 이어서 해주세요.`;
  }
  const cap =
    sel.reason === "days"
      ? `한 번에 ${limits.maxDays}일까지`
      : `한 번에 ${limits.maxPhotos}장까지`;
  return `${dateKeyLabel(sel.firstDroppedDate!)}부터 ${sel.droppedPhotos}장은 미뤄뒀어요. ${cap}만 돼서요 — 이번 걸 끝내고 다시 골라주세요.`;
}

/** 썸네일 배지에 쓸 촬영 시각(기기 시간대). EXIF 가 없으면 배지를 달지 않는다. */
function photoTime(w: Wire | undefined, timeZone: string): string | null {
  if (!w?.takenAt) return null;
  const d = new Date(w.takenAt);
  return Number.isNaN(d.getTime()) ? null : formatFragmentAt(d, timeZone);
}

/**
 * 미리보기 썸네일 한 장. 촬영 시각 배지와 제거 버튼을 얹는다.
 *
 * 시각을 같이 보여주는 이유: 날짜가 맞아도 "그날 그 시간"이 아니면 사용자가
 * 알아챌 수 있어야 한다. 사진만으론 구분이 안 되는 경우가 많다.
 */
function BackfillThumb({
  src,
  time,
  onOpen,
  onRemove,
}: {
  src: string;
  time: string | null;
  /** 사진을 눌렀을 때 — 다른 날짜로 옮기는 시트를 연다. */
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        width: 72,
        aspectRatio: "1 / 1",
        overflow: "hidden",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--surface)",
      }}
    >
      {/* next/image 를 쓰지 않는다 — blob: URL 은 최적화 대상이 아니고, 여기 소스는
          이미 240px 썸네일이라 더 줄일 것도 없다. */}
      {/* × 는 이 버튼 안에 넣지 않는다(버튼 중첩 금지). 위에 겹쳐 놓아 × 를 누르면
          빼기만, 나머지를 누르면 날짜 옮기기가 된다. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label="이 사진 다른 날짜로 옮기기"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          padding: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="이 사진 빼기"
        style={{
          position: "absolute",
          top: 3,
          right: 3,
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
      {time && (
        <span
          style={{
            position: "absolute",
            bottom: 3,
            left: 3,
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            lineHeight: 1.4,
            color: "white",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: "1px 4px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {time}
        </span>
      )}
    </div>
  );
}

/** 썸네일 가로 줄. 장수가 많으면 가로 스크롤 — 세로로 쌓여 날짜 목록을 밀어내지 않게. */
const thumbRowStyle = {
  display: "flex",
  gap: 6,
  overflowX: "auto",
  paddingBottom: 2,
} as const;

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
 * 사진 한 장을 다른 날짜로 옮기는 시트. 지금 목록에 있는 날짜를 먼저 보여주고,
 * 없는 날짜는 달력으로 고른다. 드래그 대신 누르기인 이유: iOS 웹에서 터치 드래그는
 * 스크롤과 부딪히고, 목록에 없는 날짜로는 끌어다 놓을 곳이 없다.
 */
function MoveDateSheet({
  photoIndex,
  currentDate,
  dayGroups,
  onMove,
  onClose,
}: {
  photoIndex: number | null;
  /** 이 사진이 지금 들어가 있는 날짜. 날짜 모름이면 null. */
  currentDate: string | null;
  dayGroups: PhotoGroup[];
  onMove: (photoIndex: number, dateKey: string) => void;
  onClose: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const close = () => {
    setPicking(false);
    onClose();
  };
  const move = (dateKey: string) => {
    if (photoIndex === null) return;
    setPicking(false);
    onMove(photoIndex, dateKey);
  };
  const others = dayGroups.filter((g) => g.dateKey !== currentDate);
  const todayKey = useDeviceTodayKey();

  return (
    <BottomSheet isOpen={photoIndex !== null} onClose={close}>
      <div style={{ padding: "var(--space-4) var(--space-5) 0" }}>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--fg)",
            textAlign: "center",
            margin: "var(--space-2) 0 var(--space-1)",
          }}
        >
          이 사진을 어느 날에 넣을까요?
        </p>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
            textAlign: "center",
            margin: "0 0 var(--space-5)",
          }}
        >
          지금: {currentDate ? dateKeyLabel(currentDate) : "날짜 모름"}
        </p>

        {picking ? (
          <div style={{ paddingBottom: "var(--space-4)" }}>
            <DiaryDatePicker
              // 날짜 모르는 사진은 목록의 가장 최근 날짜 달에서 연다 — 이번 달에서 열면
              // 밀린 날까지 ‹ 를 여러 번 눌러야 한다.
              value={currentDate ?? dayGroups[0]?.dateKey ?? todayKey}
              max={todayKey}
              onChange={move}
              defaultOpen
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              paddingBottom: "var(--space-4)",
            }}
          >
            {others.map((g) => (
              <button
                key={g.dateKey}
                type="button"
                className="pressable"
                onClick={() => move(g.dateKey!)}
                style={{
                  ...SHEET_BUTTON,
                  backgroundColor: "var(--fill-2)",
                  color: "var(--fg)",
                }}
              >
                {dateKeyLabel(g.dateKey!)}
                <span
                  style={{
                    color: "var(--fg-muted)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 400,
                  }}
                >
                  {"  "}사진 {g.photoIndexes.length}장
                </span>
              </button>
            ))}
            <button
              type="button"
              className="pressable"
              onClick={() => setPicking(true)}
              style={{
                ...SHEET_BUTTON,
                backgroundColor: "var(--tint-soft)",
                color: "var(--tint)",
              }}
            >
              다른 날짜 고르기
            </button>
            <button
              type="button"
              className="pressable"
              onClick={close}
              style={{
                ...SHEET_BUTTON,
                backgroundColor: "transparent",
                color: "var(--fg-muted)",
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

/**
 * 밀린 날 채우기 — 사진 선택 → 날짜별 묶음 미리보기 → 선택한 날만 정리.
 *
 * 흐름이 2단계인 이유(스펙 §3 D-1): 10일치를 즉시 생성하면 AI 캡을 한 번에 태우고,
 * 결과가 마음에 안 들면 되돌리기가 10번이다. 어느 사진이 어느 날로 갈지 **업로드
 * 전에** 보여주고 사용자가 고르게 한다.
 *
 * `limits`는 서버가 요금제로 계산해 내려준다. 여기서 다시 계산하지 않는다 —
 * 화면이 자기 마음대로 한도를 정하면 서버 검증과 어긋난다.
 */
export function BackfillClient({ limits }: { limits: BackfillLimits }) {
  const router = useRouter();
  const timeZone = useDeviceTimeZone();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [groups, setGroups] = useState<PhotoGroup[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  // 뺀 사진은 배열에서 지우지 않고 인덱스만 기억한다. 지우면 files·wires·groups
  // 세 배열의 인덱스를 전부 다시 맞춰야 하고, 그게 어긋나면 사진이 엉뚱한 날로 간다.
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  // 사용자가 옮긴 날짜(사진 인덱스 → dateKey). 뺀 사진처럼 배열은 두고 덮어쓴다.
  // EXIF 날짜로 되돌리면 항목을 지운다 — 여기 있는 사진은 "EXIF와 다른 날"이다.
  const [overrides, setOverrides] = useState<Map<number, string>>(new Map());
  // 날짜 옮기기 시트를 연 사진.
  const [moving, setMoving] = useState<number | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<DayResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 한도에 걸려 미뤄진 사진 안내. 오류가 아니라 사실 통지라 톤을 낮춘다.
  const [notice, setNotice] = useState<string | null>(null);
  // 날짜별 메모. 키는 dateKey — 사진을 빼서 날짜가 사라져도 인덱스가 어긋나지 않는다.
  const [notes, setNotes] = useState<Record<string, string>>({});
  // 메모가 안전 펜스에 걸리면 서버가 돌려주는 상담 안내. 결과 아래에 한 번만 보여준다.
  const [safetyReply, setSafetyReply] = useState<string | null>(null);
  // 이미 저장에 성공한 사진 인덱스와 그 날짜의 일기. 중간에 끊긴 뒤 다시 누르면 남은
  // 사진만 보낸다 — 전부 다시 보내면 사진·용량 카운터가 중복됐다(점검 M7).
  // 새로 사진을 고르면 비운다(인덱스가 새 파일 기준이 된다).
  const uploadedRef = useRef<Set<number>>(new Set());
  const uploadedDiaryIdsRef = useRef<Map<string, string>>(new Map());
  // 사진은 저장됐지만 메모를 붙이지 못한 날짜. 재시도 사이에도 유지해 결과에서 알린다.
  const noteFailedRef = useRef<Set<string>>(new Set());

  // 새로 고르거나 화면을 떠날 때 이전 blob: URL 을 놓아준다.
  useEffect(() => {
    return () => {
      for (const url of thumbs) URL.revokeObjectURL(url);
    };
  }, [thumbs]);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    // 값을 비워야 같은 사진을 다시 골라도 change가 난다(작성·채팅 화면과 같게, 점검 M16).
    e.target.value = "";
    if (chosen.length === 0) return;
    setError(null);
    setNotice(null);
    setResults(null);
    setSafetyReply(null);
    setNotes({});
    uploadedRef.current = new Set();
    uploadedDiaryIdsRef.current = new Map();
    noteFailedRef.current = new Set();
    setBusy("사진을 읽는 중…");
    try {
      // 순서가 중요하다. EXIF(가벼움) → 날짜 묶기 → 한도 적용 → 압축(비쌈).
      // 압축을 먼저 하면 미뤄질 사진까지 다 줄이느라 헛일을 한다.
      // EXIF는 **압축 전에** 뽑아야 한다 — 압축이 메타데이터를 날린다.
      const metas = await Promise.all(chosen.map(extractExif));
      const allWires = metas.map(exifToWire);
      // 사진 날짜·미래 판정 모두 기기 시간대 — EXIF 벽시계를 기기가 그 시간대로 읽었다.
      const tz = deviceTimeZone();
      const allGroups = groupPhotosByExifDate(allWires, todayKeyInZone(tz), tz);
      const unknownGroup = allGroups.find((g) => g.dateKey === null);
      const sel = selectGroupsWithinCap(
        allGroups.filter((g) => g.dateKey !== null),
        limits,
      );

      // 담기로 한 사진 + 날짜 미상 사진만 남기고 인덱스를 0부터 다시 매긴다.
      // (날짜 미상은 업로드 대상이 아니지만 어떤 사진이 빠졌는지 보여줘야 한다.)
      const keepIdx = [
        ...sel.kept.flatMap((g) => g.photoIndexes),
        ...(unknownGroup?.photoIndexes ?? []),
      ];
      const reindex = new Map(keepIdx.map((orig, i) => [orig, i]));

      const compressed = await compressImages(keepIdx.map((i) => chosen[i]));
      setBusy("미리보기를 만드는 중…");
      const thumbFiles = await makeThumbnails(compressed);

      const groupsForView: PhotoGroup[] = [
        ...sel.kept.map((g) => ({
          dateKey: g.dateKey,
          photoIndexes: g.photoIndexes.map((i) => reindex.get(i)!),
        })),
        ...(unknownGroup
          ? [
              {
                dateKey: null,
                photoIndexes: unknownGroup.photoIndexes.map((i) => reindex.get(i)!),
              },
            ]
          : []),
      ];

      setFiles(compressed);
      setWires(keepIdx.map((i) => allWires[i]));
      setGroups(groupsForView);
      setThumbs(thumbFiles.map((f) => URL.createObjectURL(f)));
      setRemoved(new Set());
      setOverrides(new Map());
      // 날짜가 있는 묶음만 기본 선택. null 묶음은 해제 상태(스펙 §4.1).
      setPicked(new Set(sel.kept.map((g) => g.dateKey!)));
      setNotice(capNotice(sel, limits));
    } catch {
      setError("사진을 읽지 못했어요. 다시 골라주세요.");
    } finally {
      setBusy(null);
    }
  }

  // 옮긴 날짜를 반영하고 뺀 사진을 걷어낸 묶음. 사진이 다 빠진 날짜는 사라진다.
  const visibleGroups = applyDateOverrides(groups, overrides, removed);
  const dayGroups = visibleGroups.filter((g) => g.dateKey !== null);
  const unknown = visibleGroups.find((g) => g.dateKey === null);
  // `picked` 는 사라진 날짜를 그대로 들고 있을 수 있다. 세는 건 항상 화면에 남은
  // 날짜 기준이어야 버튼 숫자와 실제 실행 대상이 어긋나지 않는다.
  const pickedDays = dayGroups.filter((g) => picked.has(g.dateKey!));
  // 날짜 모르는 사진은 처음 한도 계산에 안 들어갔다. 날짜를 붙이면 한도를 넘을
  // 수 있어 여기서 다시 센다 — 서버는 요청(묶음) 단위로만 보므로 전체는 여기서 막는다.
  const pickedPhotoCount = pickedDays.reduce((n, g) => n + g.photoIndexes.length, 0);
  const overCap =
    pickedPhotoCount > limits.maxPhotos || pickedDays.length > limits.maxDays;
  const canRun = !busy && pickedDays.length > 0 && !overCap;

  /** EXIF가 정한 원래 날짜(날짜 모름이면 null). */
  const exifDateOf = (i: number) =>
    groups.find((g) => g.photoIndexes.includes(i))?.dateKey ?? null;

  function moveTo(i: number, dateKey: string) {
    const next = new Map(overrides);
    if (dateKey === exifDateOf(i)) next.delete(i);
    else next.set(i, dateKey);
    setOverrides(next);
    // 옮겨 넣은 날은 정리 대상으로 켠다 — 넣어놓고 체크가 꺼져 빠지는 일이 없게.
    setPicked(new Set(picked).add(dateKey));
    setMoving(null);
  }

  async function run() {
    setError(null);
    setSafetyReply(null);
    const targets = pickedDays;
    const keep = targets.flatMap((g) => g.photoIndexes);
    if (keep.length === 0) {
      setError("정리할 날짜를 하나 이상 골라주세요.");
      return;
    }

    // 결과 행을 그날 일기로 잇는 데 쓴다. 사진 저장 응답에서 모은다 — 한도에
    // 걸려 정리를 못 부른 날도 일기는 이미 있다. 앞선 시도에서 저장한 날도 포함한다.
    const diaryIdByDate = uploadedDiaryIdsRef.current;
    const noteFailed = noteFailedRef.current;

    // 날짜별 메모. 사진과 같은 요청으로 보내 그날 일기 본문이 된다.
    const noteByDate = new Map<string, string>();
    for (const g of targets) {
      const text = (notes[g.dateKey!] ?? "").trim();
      if (text) noteByDate.set(g.dateKey!, text);
    }

    // ① 사진(+메모) 저장 — 선택된 날짜의 사진만. null 묶음은 올리지 않는다.
    //
    // 메모를 따로 먼저 보내지 않는다. 그랬더니 그 사이 앱이 재시작되면서 사진 없이
    // 메모만 남았다(2026-09-28 운영). 사진과 한 요청이면 끊겨도 둘이 같이 남는다.
    //
    // 요청을 **바이트로 쪼개서** 보낸다. Vercel 이 본문 4.5MB 에서 413 으로 끊기
    // 때문에 60장을 한 번에 담으면 함수가 돌지도 못한다(2026-09-22 운영 장애).
    const dateKeyByIndex = new Map<number, string>();
    for (const g of targets) {
      for (const i of g.photoIndexes) dateKeyByIndex.set(i, g.dateKey!);
    }
    // 앞선 시도에서 이미 저장한 사진은 다시 보내지 않는다.
    const pending = keep.filter((i) => !uploadedRef.current.has(i));
    const chunks = chunkBySize(
      files.map((f) => f.size),
      pending,
    );

    let sent = keep.length - pending.length;
    for (const chunk of chunks) {
      setBusy(`사진 저장 중… ${sent}/${keep.length}장`);
      const fd = new FormData();
      for (const i of chunk) fd.append("photo", files[i]);
      // 옮긴 사진의 촬영시각은 이 날짜와 맞지 않으니 보내지 않는다 — 정리할 때
      // AI가 다른 날 시각을 그날 일로 읽는다. 위치는 그대로 쓴다.
      fd.append(
        "exifs",
        JSON.stringify(
          chunk.map((i) =>
            overrides.has(i) ? { ...wires[i], takenAt: null } : wires[i],
          ),
        ),
      );
      fd.append(
        "dateKeys",
        JSON.stringify(chunk.map((i) => dateKeyByIndex.get(i)!)),
      );
      // 이 묶음에 사진이 있는 날짜의 메모만 싣는다. 한 날짜가 두 묶음에 걸치면
      // 두 번 가지만 서버가 이미 들어간 메모는 건너뛴다.
      const chunkNotes: Record<string, string> = {};
      for (const i of chunk) {
        const dk = dateKeyByIndex.get(i)!;
        const note = noteByDate.get(dk);
        if (note) chunkNotes[dk] = note;
      }
      fd.append("notes", JSON.stringify(chunkNotes));

      try {
        const saveRes = await fetch("/api/diaries/backfill/photos", {
          method: "POST",
          body: fd,
        });
        if (!saveRes.ok) {
          setBusy(null);
          setError(await readError(saveRes));
          return;
        }
        const saved = await saveRes.json();
        for (const [d, id] of Object.entries(
          (saved.diaryIds ?? {}) as Record<string, string>,
        )) {
          diaryIdByDate.set(d, id);
        }
        for (const d of (saved.noteFailed ?? []) as string[]) noteFailed.add(d);
        for (const i of chunk) uploadedRef.current.add(i);
      } catch {
        setBusy(null);
        // 앞 묶음이 이미 저장됐으면 그렇게 말한다 — 전부 날아간 줄 알고 처음부터
        // 다시 고르게 만들지 않는다.
        setError(
          sent > 0
            ? `사진 ${sent}장까지 저장했어요. 연결을 확인하고 다시 누르면 남은 사진만 보내요.`
            : "사진을 올리다가 연결이 끊겼어요.",
        );
        return;
      }
      sent += chunk.length;
    }

    // ② 날짜를 하나씩 정리 — 진행률이 여기서 나온다(스펙 §9).
    const savedOnly = (dk: string) =>
      noteByDate.has(dk) && !noteFailed.has(dk) ? "사진·메모만 저장했어요" : "사진만 저장했어요";
    const out: DayResult[] = [];
    for (let i = 0; i < targets.length; i++) {
      const dk = targets[i].dateKey!;
      const savedId = diaryIdByDate.get(dk) ?? null;
      setBusy(`${i + 1}/${targets.length}일차 정리 중…`);
      try {
        const res = await fetch("/api/diaries/backfill/organize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dateKey: dk }),
        });
        const data = await readJson(res);
        if (res.ok && data) {
          out.push({
            dateKey: dk,
            ok: true,
            note: data.title,
            diaryId: data.diaryId ?? savedId,
          });
        } else if (data?.reason === "cap") {
          // 캡이 끝났다. 남은 날은 사진만 저장된 채로 둔다 — 내일 이어서 하면 된다.
          out.push({
            dateKey: dk,
            ok: false,
            note: "오늘 사용 횟수를 다 썼어요",
            diaryId: savedId,
          });
          for (const rest of targets.slice(i + 1)) {
            out.push({
              dateKey: rest.dateKey!,
              ok: false,
              note: savedOnly(rest.dateKey!),
              diaryId: diaryIdByDate.get(rest.dateKey!) ?? null,
            });
          }
          break;
        } else {
          // 펜스에 걸리면 서버가 상담 안내를 돌려준다. 메모가 생기면서 이 경로에
          // 사용자가 쓴 글이 들어가므로 삼키지 않고 보여준다.
          if (data?.reason === "safety" && typeof data?.error === "string") {
            setSafetyReply(data.error);
          }
          out.push({ dateKey: dk, ok: false, note: savedOnly(dk), diaryId: savedId });
        }
      } catch {
        out.push({ dateKey: dk, ok: false, note: savedOnly(dk), diaryId: savedId });
      }
    }
    setBusy(null);
    setResults(out);
    // 결과 화면에서도 보이는 자리(error)에 둔다 — notice는 결과가 뜨면 숨는다.
    if (noteFailed.size > 0) {
      setError(
        `${[...noteFailed].map(dateKeyLabel).join(", ")} 메모는 저장하지 못했어요. 그 날 일기에서 직접 적어주세요.`,
      );
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--fg-muted)",
          lineHeight: 1.6,
        }}
      >
        사진을 고르면 찍은 날짜별로 일기를 만들어요. 한 번에 사진{" "}
        {limits.maxPhotos}장 · {limits.maxDays}일까지 가능해요.
      </p>

      <button
        type="button"
        className="pressable"
        onClick={() => fileRef.current?.click()}
        disabled={!!busy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          height: 44,
          borderRadius: "var(--radius-md)",
          border: "none",
          backgroundColor: "var(--tint-soft)",
          color: "var(--tint)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-base)",
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
        }}
      >
        <ImagePlus size={16} aria-hidden />
        사진 고르기
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePick}
        style={{ display: "none" }}
      />

      {busy && (
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
          }}
        >
          {busy}
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--danger)",
          }}
        >
          {error}
        </p>
      )}

      {notice && !results && (
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
            lineHeight: 1.6,
          }}
        >
          {notice}
        </p>
      )}

      {!results && dayGroups.length > 0 && (
        <>
          {dayGroups.map((g) => (
            <div
              key={g.dateKey}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--fill-2)",
              }}
            >
              {/* 날짜 줄만 label 로 감싼다 — 썸네일까지 감싸면 × 를 눌러도
                  체크박스가 토글된다. */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-3)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-base)",
                    color: "var(--fg)",
                  }}
                >
                  {dateKeyLabel(g.dateKey!)}
                  <span
                    style={{
                      color: "var(--fg-muted)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    {"  "}
                    사진 {g.photoIndexes.length}장
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={picked.has(g.dateKey!)}
                  onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(g.dateKey!);
                    else next.delete(g.dateKey!);
                    setPicked(next);
                  }}
                />
              </label>

              <div style={thumbRowStyle}>
                {g.photoIndexes.map((i) => (
                  <BackfillThumb
                    key={i}
                    src={thumbs[i]}
                    // 옮겨 온 사진의 촬영시각은 이 날과 무관해 배지를 달지 않는다.
                    time={overrides.has(i) ? null : photoTime(wires[i], timeZone)}
                    onOpen={() => !busy && setMoving(i)}
                    onRemove={() => setRemoved(new Set(removed).add(i))}
                  />
                ))}
              </div>

              {/* 체크를 풀면 그 날은 보내지 않으므로 입력도 막는다 — 쓴 메모가
                  저장된 줄 알고 넘어가지 않게. */}
              <textarea
                value={notes[g.dateKey!] ?? ""}
                onChange={(e) => {
                  setNotes({ ...notes, [g.dateKey!]: e.target.value });
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                disabled={!!busy || !picked.has(g.dateKey!)}
                placeholder="이날 있었던 일 (선택)"
                aria-label={`${dateKeyLabel(g.dateKey!)} 메모`}
                rows={2}
                maxLength={MAX_AI_INPUT_CONTENT_LENGTH}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  resize: "none",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  // 다크 모드에서 카드(fill-2)와 surface가 거의 같은 색이라 테두리로 구분한다.
                  border: "1px solid var(--separator)",
                  backgroundColor: "var(--surface)",
                  color: "var(--fg)",
                  fontFamily: "var(--font-sans)",
                  // 16px 미만이면 iOS Safari가 포커스 때 화면을 확대한다.
                  fontSize: 16,
                  lineHeight: 1.5,
                  opacity: picked.has(g.dateKey!) ? 1 : 0.5,
                }}
              />
            </div>
          ))}

          {unknown && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--fill-2)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  color: "var(--fg-muted)",
                }}
              >
                찍은 날짜를 알 수 없는 사진 {unknown.photoIndexes.length}장은
                빼뒀어요. 누르면 날짜를 정할 수 있어요.
              </p>
              {/* 어떤 사진이 빠졌는지 보여준다 — 목록에 없는 날이 왜 없는지
                  사용자가 알 수 있는 유일한 단서다. */}
              <div style={thumbRowStyle}>
                {unknown.photoIndexes.map((i) => (
                  <BackfillThumb
                    key={i}
                    src={thumbs[i]}
                    time={null}
                    onOpen={() => !busy && setMoving(i)}
                    onRemove={() => setRemoved(new Set(removed).add(i))}
                  />
                ))}
              </div>
            </div>
          )}

          {overCap && (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-muted)",
                lineHeight: 1.6,
              }}
            >
              한 번에 사진 {limits.maxPhotos}장 · {limits.maxDays}일까지예요. 지금 사진{" "}
              {pickedPhotoCount}장 · {pickedDays.length}일이라 몇 장을 빼거나 날짜 체크를
              풀어주세요.
            </p>
          )}

          <button
            type="button"
            className="pressable"
            onClick={() => void run()}
            disabled={!canRun}
            style={{
              height: 44,
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: "var(--fg)",
              color: "var(--bg)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              cursor: canRun ? "pointer" : "default",
              opacity: canRun ? 1 : 0.5,
            }}
          >
            {pickedDays.length}일치 정리하기
          </button>
        </>
      )}

      {results && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          {results.map((r) => {
            const body = (
              <>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-base)",
                    color: "var(--fg)",
                    flexShrink: 0,
                  }}
                >
                  {dateKeyLabel(r.dateKey)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    color: "var(--fg-muted)",
                    textAlign: "right",
                    marginLeft: "auto",
                  }}
                >
                  {r.ok ? `정리됨 · ${r.note}` : r.note}
                </span>
              </>
            );
            // 정리에 실패한 날도 사진은 그날 일기에 들어가 있다 — 들어가서 직접
            // 쓰거나 나중에 정리할 수 있게 똑같이 잇는다.
            return r.diaryId ? (
              <Link
                key={r.dateKey}
                href={`/diary/${r.diaryId}`}
                className="pressable"
                style={{ ...rowStyle, textDecoration: "none" }}
              >
                {body}
                <ChevronRight
                  size={16}
                  color="var(--fg-muted)"
                  aria-hidden
                  style={{ flexShrink: 0 }}
                />
              </Link>
            ) : (
              <div key={r.dateKey} style={rowStyle}>
                {body}
              </div>
            );
          })}

          {safetyReply && (
            <p
              style={{
                margin: 0,
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--fill-2)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg)",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}
            >
              {safetyReply}
            </p>
          )}
        </div>
      )}

      <MoveDateSheet
        photoIndex={moving}
        currentDate={
          moving === null
            ? null
            : (visibleGroups.find((g) => g.photoIndexes.includes(moving))?.dateKey ??
              null)
        }
        dayGroups={dayGroups}
        onMove={moveTo}
        onClose={() => setMoving(null)}
      />
    </div>
  );
}
