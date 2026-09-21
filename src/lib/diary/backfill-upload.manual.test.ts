/**
 * 분할 업로드 통합 검증 — 실제 서버(localhost:3000)에 진짜 multipart 요청을 쏜다.
 *
 * 단위 테스트가 잡지 못하는 것을 잡는다: 묶음마다 `exifs`·`dateKeys` 슬라이스가
 * 사진과 어긋나지 않는지, 여러 요청에 걸쳐도 사진이 제 날짜로 가는지.
 * (2026-09-22 운영 장애: 60장을 한 요청에 담아 Vercel 이 413 으로 끊었다.)
 *
 * 사전 준비:
 *   1. pnpm build && pnpm start
 *   2. MANUAL_SESSION_COOKIE 에 로그인 세션 JWT
 *   3. MANUAL_PHOTO_DIR 에 EXIF 가 박힌 .jpg 들
 *
 *   pnpm backfill:upload
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import exifr from "exifr";
import { chunkBySize, groupPhotosByExifDate } from "./backfill-group";
import { kstTodayKey } from "./kst";

const BASE = process.env.MANUAL_BASE_URL ?? "http://localhost:3000";
const COOKIE = process.env.MANUAL_SESSION_COOKIE ?? "";
const DIR = process.env.MANUAL_PHOTO_DIR ?? "";

// 클라이언트가 쓰는 3.5MB 대신 작게 잡아 분할을 강제한다. 나누는 규칙 자체는
// 같은 함수를 쓰므로, 여기서 검증되는 건 "나뉜 뒤에도 정합성이 맞는가"다.
const TEST_CHUNK_BYTES = 1.5 * 1024 * 1024;

describe.skipIf(!COOKIE || !DIR)("분할 업로드", () => {
  it("여러 요청으로 나뉘어도 사진이 제 날짜로 저장된다", async () => {
    const names = readdirSync(DIR)
      .filter((n) => n.endsWith(".jpg"))
      .sort();
    expect(names.length).toBeGreaterThan(1);

    const files = names.map((n) => ({
      name: n,
      buf: readFileSync(path.join(DIR, n)),
    }));

    // 클라이언트와 같은 순서: EXIF 추출 → 날짜별 묶기 → 바이트로 자르기
    const wires = await Promise.all(
      files.map(async (f) => {
        const d = await exifr.parse(f.buf, { pick: ["DateTimeOriginal"] });
        const t = d?.DateTimeOriginal;
        // 라우트의 zod 스키마는 세 필드를 모두 요구한다 — 클라이언트의
        // `exifToWire`가 내보내는 모양과 똑같이 맞춘다.
        return {
          takenAt:
            t instanceof Date && !Number.isNaN(t.getTime()) ? t.toISOString() : null,
          lat: null,
          lng: null,
        };
      }),
    );

    const groups = groupPhotosByExifDate(wires, kstTodayKey());
    const dated = groups.filter((g) => g.dateKey !== null);
    expect(dated.length).toBeGreaterThan(1);

    const dateKeyByIndex = new Map<number, string>();
    for (const g of dated) {
      for (const i of g.photoIndexes) dateKeyByIndex.set(i, g.dateKey!);
    }
    const keep = dated.flatMap((g) => g.photoIndexes);
    const chunks = chunkBySize(
      files.map((f) => f.buf.byteLength),
      keep,
      TEST_CHUNK_BYTES,
    );
    expect(chunks.length).toBeGreaterThan(1); // 실제로 나뉘었는지

    const savedDates = new Set<string>();
    for (const chunk of chunks) {
      const fd = new FormData();
      for (const i of chunk) {
        fd.append(
          "photo",
          new File([new Uint8Array(files[i].buf)], files[i].name, {
            type: "image/jpeg",
          }),
        );
      }
      fd.append("exifs", JSON.stringify(chunk.map((i) => wires[i])));
      fd.append(
        "dateKeys",
        JSON.stringify(chunk.map((i) => dateKeyByIndex.get(i)!)),
      );

      const res = await fetch(`${BASE}/api/diaries/backfill/photos`, {
        method: "POST",
        headers: { cookie: `session=${COOKIE}` },
        body: fd,
      });
      const body = await res.json();
      expect(res.status, JSON.stringify(body)).toBe(200);
      for (const d of body.savedDates as string[]) savedDates.add(d);
    }

    // 고른 날짜가 하나도 빠지지 않아야 한다.
    const expected = new Set(dated.map((g) => g.dateKey!));
    expect([...savedDates].sort()).toEqual([...expected].sort());
  }, 180_000);
});
