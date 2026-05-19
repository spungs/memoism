import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 사진 1장당 최대 크기. Phase 3에서 클라이언트 측 1024px 압축 도입 시 통상 200KB 미만.
// 베타엔 안전 마진으로 10MB 유지 (Supabase 버킷 정책과 일치).
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// 허용 MIME — Supabase Storage 버킷의 allowed_mime_types와 일치.
// SVG는 폴리글롯 공격 방어로 의도적 제외 (QA H-6).
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "diary-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new StorageError(
      "Supabase Storage 환경변수가 설정되지 않았습니다. " +
        "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 .env.local에 등록하세요.",
    );
  }
  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

function extensionFor(file: File): string {
  const fromName = path.extname(file.name).toLowerCase();
  if (fromName) return fromName;
  switch (file.type) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/heic":
      return ".heic";
    case "image/heif":
      return ".heif";
    default:
      return ".bin";
  }
}

export class StorageError extends Error {}

/**
 * Upload an image to the private Supabase Storage bucket.
 * Returns the storage path (e.g. "{ownerId}/{uuid}.jpg") for persistence
 * in DiaryImage.storagePath. Public URLs are issued via {@link getSignedUrl}.
 */
export async function saveImage(file: File, ownerId: string): Promise<string> {
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    )
  ) {
    throw new StorageError(`지원하지 않는 이미지 형식입니다: ${file.type}`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new StorageError("이미지는 10MB 이하만 업로드할 수 있습니다.");
  }

  const storagePath = `${ownerId}/${randomUUID()}${extensionFor(file)}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await getClient()
    .storage.from(BUCKET)
    .upload(storagePath, buf, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new StorageError(`이미지 업로드 실패: ${error.message}`);
  }

  return storagePath;
}

/**
 * Best-effort deletion from the bucket. Silently ignores legacy "/uploads/..."
 * URLs (from pre-Phase 2 local FS) and paths with traversal sequences.
 */
export async function deleteImage(storagePath: string): Promise<void> {
  if (!storagePath || storagePath.startsWith("/uploads/")) return;
  if (storagePath.includes("..")) return;

  const { error } = await getClient()
    .storage.from(BUCKET)
    .remove([storagePath]);
  if (error) {
    // Cleanup path — log only.
    console.warn(`[storage] deleteImage failed for ${storagePath}:`, error.message);
  }
}

/**
 * Issue a short-lived (1h) signed URL for a private storage path.
 * Returns null if URL generation fails (caller should fall back to placeholder).
 */
export async function getSignedUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await getClient()
    .storage.from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.warn(`[storage] getSignedUrl failed for ${storagePath}:`, error?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Issue signed URLs for multiple paths in parallel.
 * Preserves order; null entries indicate per-path failures.
 */
export async function getSignedUrls(
  storagePaths: string[],
): Promise<(string | null)[]> {
  return Promise.all(storagePaths.map(getSignedUrl));
}
