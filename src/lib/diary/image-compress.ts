// 클라이언트 측 이미지 압축. 1024px max + JPEG quality 0.85.
// Supabase Storage 업로드 전에 호출 → 토큰·전송 비용 최소화 (QA·NEW-3, ⑪).
"use client";

import imageCompression from "browser-image-compression";

const COMPRESS_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
  initialQuality: 0.85,
};

/**
 * 사진 1장 압축. 실패 시 원본 그대로 반환 (graceful fallback).
 * SVG·gif는 사용자가 못 올림(MIME 허용 목록에서 제외) → 여기 도달 X.
 */
export async function compressImage(file: File): Promise<File> {
  try {
    return await imageCompression(file, {
      ...COMPRESS_OPTIONS,
      fileType: file.type,
    });
  } catch (e) {
    console.warn("[compress] failed, using original:", e);
    return file;
  }
}

/** 미리보기용 썸네일. 원본이 아니라 **압축본**에서 만든다 — 디코딩을 한 번 아낀다. */
const THUMB_OPTIONS = {
  maxSizeMB: 0.04,
  maxWidthOrHeight: 240,
  useWebWorker: true,
  initialQuality: 0.6,
};

/**
 * 동시에 도는 압축 수를 묶는다.
 *
 * `Promise.all` 로 한꺼번에 돌리면 밀린 날 채우기(최대 60장)에서 워커와 비트맵이
 * 동시에 수십 개 뜬다. 모바일에선 탭이 죽는다. 결과 순서는 입력 순서 그대로다 —
 * 인덱스로 EXIF·날짜를 맞추는 쪽이 있어 순서가 어긋나면 안 된다.
 */
async function mapLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * 여러 사진 압축. 한 번에 4장씩.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return mapLimited(files, 4, compressImage);
}

/**
 * 미리보기 썸네일 생성. 실패하면 받은 파일을 그대로 돌려준다 —
 * 썸네일이 안 만들어졌다고 사진을 못 고르게 만들 이유는 없다.
 */
export async function makeThumbnails(files: File[]): Promise<File[]> {
  return mapLimited(files, 4, async (file) => {
    try {
      return await imageCompression(file, { ...THUMB_OPTIONS, fileType: file.type });
    } catch (e) {
      console.warn("[thumb] failed, using source:", e);
      return file;
    }
  });
}
