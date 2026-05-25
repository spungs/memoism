// 클라이언트 측 EXIF 추출 + B-1.smart 같은-날짜 검증.
// exifr는 양쪽에서 동작하지만 베타에선 클라이언트 측 처리로 서버 비용 절감.
import exifr from "exifr";

export type ExifMeta = {
  takenAt: Date | null;
  lat: number | null;
  lng: number | null;
};

/**
 * 사진 파일에서 EXIF 추출.
 *   - DateTimeOriginal → takenAt (없으면 null)
 *   - GPS → lat/lng (없으면 null)
 *   - 스크린샷·다운로드·EXIF 제거 사진 → 모두 null (정상 케이스)
 */
export async function extractExif(file: File): Promise<ExifMeta> {
  try {
    const data = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "GPSLatitude", "GPSLongitude"],
    });
    if (!data) return { takenAt: null, lat: null, lng: null };
    return {
      takenAt:
        data.DateTimeOriginal instanceof Date ? data.DateTimeOriginal : null,
      lat: typeof data.GPSLatitude === "number" ? data.GPSLatitude : null,
      lng: typeof data.GPSLongitude === "number" ? data.GPSLongitude : null,
    };
  } catch {
    return { takenAt: null, lat: null, lng: null };
  }
}

function kstDateKey(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * EXIF 촬영시각이 있는 사진들의 서로 다른 KST 날짜(YYYY-MM-DD)를 정렬해 반환.
 * takenAt이 null인 사진은 무시한다.
 */
export function uniqueKstDateKeys(metas: ExifMeta[]): string[] {
  const keys = new Set<string>();
  for (const m of metas) {
    if (m.takenAt != null) keys.add(kstDateKey(m.takenAt));
  }
  return [...keys].sort();
}

export type SameDayValidation =
  | { ok: true; date: Date; warning?: string }
  | { ok: false; reason: string };

/**
 * B-1.smart 정책:
 *   - EXIF 있는 사진들끼리 = 같은 KST 날짜여야 함
 *   - EXIF 모두 없으면 → caller가 사용자 입력 날짜 사용 (여기선 false 반환)
 *   - 자정 걸침(2개 날짜): 가장 많은 사진이 속한 날짜 + 안내 메시지
 *   - 3개 이상 분산: reject — 사용자에게 같은 날 사진 첨부 요청
 */
export function validateSameDayKST(metas: ExifMeta[]): SameDayValidation {
  const withDate = metas.filter((m) => m.takenAt != null);
  if (withDate.length === 0) {
    return {
      ok: false,
      reason: "EXIF 정보가 없는 사진들이에요. 날짜를 직접 선택해주세요.",
    };
  }

  const buckets = new Map<string, Date[]>();
  for (const m of withDate) {
    const key = kstDateKey(m.takenAt!);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(m.takenAt!);
  }

  if (buckets.size === 1) {
    const all = withDate.map((m) => m.takenAt!);
    const earliest = all.reduce((a, b) => (a < b ? a : b));
    return { ok: true, date: earliest };
  }

  if (buckets.size === 2) {
    let bestKey: string | null = null;
    let bestCount = 0;
    for (const [key, dates] of buckets) {
      if (dates.length > bestCount) {
        bestKey = key;
        bestCount = dates.length;
      }
    }
    const winningDates = buckets.get(bestKey!)!;
    const earliest = winningDates.reduce((a, b) => (a < b ? a : b));
    return {
      ok: true,
      date: earliest,
      warning: `사진들이 두 날짜에 걸쳐 있어요. ${bestKey} 기준으로 묶을게요.`,
    };
  }

  return {
    ok: false,
    reason: "사진들이 여러 날짜에 걸쳐 있어요. 같은 날 사진끼리 첨부해주세요.",
  };
}
