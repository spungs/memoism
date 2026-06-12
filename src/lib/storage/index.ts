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

// 파일의 첫 12바이트를 직접 확인해 클라이언트가 보낸 MIME과 실제 내용이
// 일치하는지 검증한다 (QA H-6). 폴리글롯/위장 업로드 차단.
// file-type 패키지를 쓰지 않은 이유: HEIC/HEIF·WebP·PNG·JPEG 네 가지만 다루므로
// 외부 의존 없이 충분히 정확하게 식별 가능.
function validateMagicBytes(buf: Buffer, mime: string): boolean {
  if (buf.length < 12) return false;
  switch (mime) {
    case "image/jpeg":
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case "image/png":
      return (
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a
      );
    case "image/webp":
      return (
        buf.toString("ascii", 0, 4) === "RIFF" &&
        buf.toString("ascii", 8, 12) === "WEBP"
      );
    case "image/heic":
    case "image/heif": {
      if (buf.toString("ascii", 4, 8) !== "ftyp") return false;
      const brand = buf.toString("ascii", 8, 12);
      return [
        "heic",
        "heix",
        "heim",
        "heis",
        "hevc",
        "hevx",
        "mif1",
        "msf1",
      ].includes(brand);
    }
    default:
      return false;
  }
}

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

  if (!validateMagicBytes(buf, file.type)) {
    throw new StorageError(
      "이미지 파일이 손상되었거나 형식이 일치하지 않아요.",
    );
  }

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
 * Best-effort bulk deletion. Filters out legacy/traversal paths and chunks
 * large lists (Supabase remove() can handle ~1000 paths per call; we cap at
 * 100 to stay well under any limit).
 */
export async function deleteImages(storagePaths: string[]): Promise<void> {
  const valid = storagePaths.filter(
    (p) => p && !p.startsWith("/uploads/") && !p.includes(".."),
  );
  if (valid.length === 0) return;

  const CHUNK = 100;
  const client = getClient();
  for (let i = 0; i < valid.length; i += CHUNK) {
    const slice = valid.slice(i, i + CHUNK);
    const { error } = await client.storage.from(BUCKET).remove(slice);
    if (error) {
      console.warn(
        `[storage] deleteImages chunk failed (${slice.length} paths):`,
        error.message,
      );
    }
  }
}

/** 버킷에 실재하는 객체 1건. GC가 DiaryImage.storagePath와 대조하는 단위. */
export interface BucketObject {
  path: string; // "{ownerId}/{uuid}.ext"
  ownerId: string;
  createdAt: string; // ISO — 업로드 시각 (grace 판정용)
  sizeBytes: number;
}

/**
 * 버킷의 모든 객체를 나열한다 (루트 폴더=userId → 그 안의 파일). 고아 GC 전용.
 * 폴더당 1000개 단위로 페이지네이션. service-role 클라이언트로만 동작.
 */
export async function listBucketObjects(): Promise<BucketObject[]> {
  const client = getClient();
  const { data: roots, error } = await client.storage
    .from(BUCKET)
    .list("", { limit: 1000 });
  if (error) throw new StorageError(`버킷 루트 나열 실패: ${error.message}`);

  const out: BucketObject[] = [];
  for (const r of roots ?? []) {
    if (r.id) continue; // 폴더는 id가 falsy(null) — 루트 직속 파일(id 있음)은 무시
    let offset = 0;
    for (;;) {
      const { data: files, error: e2 } = await client.storage
        .from(BUCKET)
        .list(r.name, {
          limit: 1000,
          offset,
          sortBy: { column: "created_at", order: "asc" },
        });
      if (e2) {
        console.warn(`[storage] listBucketObjects(${r.name}) 실패:`, e2.message);
        break;
      }
      const batch = files ?? [];
      for (const f of batch) {
        if (!f.id) continue; // 중첩 폴더(id falsy) 방어
        out.push({
          path: `${r.name}/${f.name}`,
          ownerId: r.name,
          createdAt: f.created_at ?? "",
          sizeBytes: Number(f.metadata?.size) || 0,
        });
      }
      if (batch.length < 1000) break;
      offset += batch.length;
    }
  }
  return out;
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

/**
 * 여러 path의 signed URL을 batch 1회 호출로 발급 (개별 N회 대비 네트워크 비용 절감).
 * path → signedUrl Map 반환. 실패/누락 path는 Map에 없음(caller가 null fallback).
 */
export async function getSignedUrlsByPath(
  storagePaths: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (storagePaths.length === 0) return map;
  const { data, error } = await getClient()
    .storage.from(BUCKET)
    .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.warn(`[storage] getSignedUrlsByPath failed:`, error?.message);
    return map;
  }
  for (const item of data) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

/**
 * Owner-scoped signed URL 발급. storagePath가 `{ownerId}/`로 시작하는지 검증해
 * 다른 사용자의 storagePath에 대한 cross-account 접근을 차단한다.
 * 검증 실패한 path는 null로 반환 (순서 보존).
 */
export async function getSignedUrlsForOwner(
  storagePaths: string[],
  ownerId: string,
): Promise<(string | null)[]> {
  const prefix = `${ownerId}/`;
  return Promise.all(
    storagePaths.map((path) =>
      path.startsWith(prefix) ? getSignedUrl(path) : Promise.resolve(null),
    ),
  );
}

/**
 * Storage에서 이미지 다운로드 → base64 (Gemini Vision 재호출용, NEW-7).
 * 실패 시 null. caller가 빈 사진 케이스 처리.
 */
export async function downloadAsBase64(
  storagePath: string,
): Promise<{ mimeType: string; base64Data: string } | null> {
  if (!storagePath || storagePath.includes("..")) return null;
  const { data, error } = await getClient()
    .storage.from(BUCKET)
    .download(storagePath);
  if (error || !data) {
    console.warn(
      `[storage] download failed for ${storagePath}:`,
      error?.message,
    );
    return null;
  }
  const buf = Buffer.from(await data.arrayBuffer());
  return {
    mimeType: data.type || "image/jpeg",
    base64Data: buf.toString("base64"),
  };
}
