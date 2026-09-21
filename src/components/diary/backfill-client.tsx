"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import {
  chunkBySize,
  groupPhotosByExifDate,
  type BackfillLimits,
  type PhotoGroup,
} from "@/lib/diary/backfill-group";
import { extractExif, exifToWire } from "@/lib/diary/exif";
import { compressImages } from "@/lib/diary/image-compress";
import { dateKeyLabel, kstTodayKey } from "@/lib/diary/kst";

type Wire = { takenAt: string | null; lat: number | null; lng: number | null };
type DayResult = { dateKey: string; ok: boolean; note: string };

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
  try {
    const data = await res.json();
    if (typeof data?.error === "string") return data.error;
  } catch {
    // 아래 상태 코드 분기로 넘어간다.
  }
  if (res.status === 413) {
    return "사진 용량이 한 번에 보내기엔 커요. 장수를 줄여서 다시 해주세요.";
  }
  return `사진을 저장하지 못했어요 (오류 ${res.status})`;
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [groups, setGroups] = useState<PhotoGroup[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<DayResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []).slice(0, limits.maxPhotos);
    if (chosen.length === 0) return;
    setError(null);
    setResults(null);
    setBusy("사진을 읽는 중…");
    try {
      // EXIF는 **압축 전에** 뽑는다 — 압축이 메타데이터를 날린다.
      const metas = await Promise.all(chosen.map(extractExif));
      const w = metas.map(exifToWire);
      const compressed = await compressImages(chosen);
      const g = groupPhotosByExifDate(w, kstTodayKey());
      setFiles(compressed);
      setWires(w);
      setGroups(g);
      // 날짜가 있는 묶음만 기본 선택. null 묶음은 해제 상태(스펙 §4.1).
      setPicked(new Set(g.filter((x) => x.dateKey).map((x) => x.dateKey!)));
    } catch {
      setError("사진을 읽지 못했어요. 다시 골라주세요.");
    } finally {
      setBusy(null);
    }
  }

  const dayGroups = groups.filter((g) => g.dateKey !== null);
  const unknown = groups.find((g) => g.dateKey === null);
  const tooManyDays = dayGroups.length > limits.maxDays;
  const canRun = !busy && picked.size > 0 && !tooManyDays;

  async function run() {
    setError(null);
    const targets = dayGroups.filter((g) => picked.has(g.dateKey!));
    const keep = targets.flatMap((g) => g.photoIndexes);
    if (keep.length === 0) {
      setError("정리할 날짜를 하나 이상 골라주세요.");
      return;
    }

    // ① 사진 저장 — 선택된 날짜의 사진만. null 묶음은 올리지 않는다.
    //
    // 요청을 **바이트로 쪼개서** 보낸다. Vercel 이 본문 4.5MB 에서 413 으로 끊기
    // 때문에 60장을 한 번에 담으면 함수가 돌지도 못한다(2026-09-22 운영 장애).
    const dateKeyByIndex = new Map<number, string>();
    for (const g of targets) {
      for (const i of g.photoIndexes) dateKeyByIndex.set(i, g.dateKey!);
    }
    const chunks = chunkBySize(
      files.map((f) => f.size),
      keep,
    );

    let sent = 0;
    for (const chunk of chunks) {
      setBusy(`사진 저장 중… ${sent}/${keep.length}장`);
      const fd = new FormData();
      for (const i of chunk) fd.append("photo", files[i]);
      fd.append("exifs", JSON.stringify(chunk.map((i) => wires[i])));
      fd.append(
        "dateKeys",
        JSON.stringify(chunk.map((i) => dateKeyByIndex.get(i)!)),
      );

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
      } catch {
        setBusy(null);
        // 앞 묶음이 이미 저장됐으면 그렇게 말한다 — 전부 날아간 줄 알고 처음부터
        // 다시 고르게 만들지 않는다.
        setError(
          sent > 0
            ? `사진 ${sent}장까지 저장했어요. 연결을 확인하고 다시 시도해주세요.`
            : "사진을 올리다가 연결이 끊겼어요.",
        );
        return;
      }
      sent += chunk.length;
    }

    // ② 날짜를 하나씩 정리 — 진행률이 여기서 나온다(스펙 §9).
    const out: DayResult[] = [];
    for (let i = 0; i < targets.length; i++) {
      const dk = targets[i].dateKey!;
      setBusy(`${i + 1}/${targets.length}일차 정리 중…`);
      try {
        const res = await fetch("/api/diaries/backfill/organize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dateKey: dk }),
        });
        const data = await res.json();
        if (res.ok) {
          out.push({ dateKey: dk, ok: true, note: data.title });
        } else if (data.reason === "cap") {
          // 캡이 끝났다. 남은 날은 사진만 저장된 채로 둔다 — 내일 이어서 하면 된다.
          out.push({ dateKey: dk, ok: false, note: "오늘 AI 횟수를 다 썼어요" });
          for (const rest of targets.slice(i + 1)) {
            out.push({
              dateKey: rest.dateKey!,
              ok: false,
              note: "사진만 저장했어요",
            });
          }
          break;
        } else {
          out.push({ dateKey: dk, ok: false, note: "사진만 저장했어요" });
        }
      } catch {
        out.push({ dateKey: dk, ok: false, note: "사진만 저장했어요" });
      }
    }
    setBusy(null);
    setResults(out);
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

      {!results && dayGroups.length > 0 && (
        <>
          {tooManyDays && (
            <p
              role="alert"
              style={{
                margin: 0,
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--danger)",
              }}
            >
              {dayGroups.length}일치가 선택됐어요. {limits.maxDays}일 이하로
              나눠서 해주세요.
            </p>
          )}

          {dayGroups.map((g) => (
            <label key={g.dateKey} style={{ ...rowStyle, cursor: "pointer" }}>
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
          ))}

          {unknown && (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-muted)",
              }}
            >
              찍은 날짜를 알 수 없는 사진 {unknown.photoIndexes.length}장은
              빼뒀어요.
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
            {picked.size}일치 정리하기
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
          {results.map((r) => (
            <div key={r.dateKey} style={rowStyle}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-base)",
                  color: "var(--fg)",
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
                }}
              >
                {r.ok ? `정리됨 · ${r.note}` : r.note}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
