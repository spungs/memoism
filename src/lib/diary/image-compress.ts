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

/**
 * 여러 사진 병렬 압축.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage));
}
