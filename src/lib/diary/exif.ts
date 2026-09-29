// 클라이언트 측 EXIF 추출 + B-1.smart 같은-날짜 검증.
// exifr는 양쪽에서 동작하지만 베타에선 클라이언트 측 처리로 서버 비용 절감.
import exifr from "exifr";
import { dateKeyInZone } from "@/lib/tz";

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
/** Invalid Date를 걸러낸다 — `instanceof Date`만으론 못 거른다. */
function isValidDate(v: unknown): v is Date {
  return v instanceof Date && !Number.isNaN(v.getTime());
}

export async function extractExif(file: File): Promise<ExifMeta> {
  try {
    const data = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "GPSLatitude", "GPSLongitude"],
    });
    if (!data) return { takenAt: null, lat: null, lng: null };
    return {
      // Invalid Date도 `instanceof Date`는 true다. 손상된 EXIF가 그대로 통과하면
      // 뒤에서 toISOString()이 RangeError를 던져 그 사진을 영영 못 보내게 된다.
      takenAt: isValidDate(data.DateTimeOriginal)
        ? data.DateTimeOriginal
        : null,
      lat: typeof data.GPSLatitude === "number" ? data.GPSLatitude : null,
      lng: typeof data.GPSLongitude === "number" ? data.GPSLongitude : null,
    };
  } catch {
    return { takenAt: null, lat: null, lng: null };
  }
}

/** 서버로 보낼 형태(Date → ISO 문자열). 컴포저·채팅이 같은 모양을 보내게 한다. */
export function exifToWire(e: ExifMeta): {
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
} {
  return {
    takenAt: e.takenAt ? e.takenAt.toISOString() : null,
    lat: e.lat,
    lng: e.lng,
  };
}

/**
 * EXIF 촬영시각이 있는 사진들의 서로 다른 날짜(YYYY-MM-DD)를 정렬해 반환.
 * 날짜는 기기 시간대(`tz`)로 자른다 — 해외에서 찍은 저녁 사진이 다음 날로 넘어가지 않게.
 * takenAt이 null인 사진은 무시한다.
 */
export function uniqueDateKeys(metas: ExifMeta[], tz: string): string[] {
  const keys = new Set<string>();
  for (const m of metas) {
    if (m.takenAt != null) keys.add(dateKeyInZone(m.takenAt, tz));
  }
  return [...keys].sort();
}
